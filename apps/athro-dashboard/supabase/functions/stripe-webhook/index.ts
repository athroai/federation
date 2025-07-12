import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Price mapping with new Stripe products
const PRICE_ID_TO_TIER = {
  'price_1Rh7kCQYU340CsP0NGbx0Qnj': 'lite',     // £7.99/month - NEW Lite Product
  'price_1Rh7lMQYU340CsP0yJy4VaTu': 'full',     // £14.99/month - NEW Full Product
  // Legacy price IDs (deprecated but kept for safety)
  'price_1RfM4LHlv5z8bwBIcwv3aUkb': 'lite',     // OLD Lite
  'price_1RfM4LHlv5z8bwBIKLFadfjp': 'full',     // OLD Full
} as const;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Get the request body
    const body = await req.text()
    
    // Verify Stripe signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
    }

    // Verify the event
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message)
      return new Response(JSON.stringify({ error: 'Webhook signature verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const priceId = session.metadata?.price_id;
        
        if (!userId) {
          throw new Error('No user ID found in session metadata');
        }

        // 🛒 NEW: Handle Token Purchases
        if (session.metadata?.type === 'token_purchase') {
          const tokensToAdd = parseInt(session.metadata.tokens || '320000');
          
          console.log(`🛒 Processing token purchase: ${tokensToAdd} tokens for user ${userId}`);
          
          // Call the database function to add tokens
          const { data: tokenResult, error: tokenError } = await supabaseAdmin
            .rpc('purchase_extra_tokens', {
              p_user_id: userId,
              p_extra_tokens: tokensToAdd
            });

          if (tokenError) {
            console.error('❌ Failed to add tokens:', tokenError);
            throw new Error(`Failed to add tokens: ${tokenError.message}`);
          }

          if (!tokenResult.success) {
            console.error('❌ Token purchase failed:', tokenResult.error);
            throw new Error(`Token purchase failed: ${tokenResult.error}`);
          }

          // Log the token purchase event
          try {
            await supabaseAdmin
              .from('subscription_events')
              .insert({
                user_id: userId,
                event_type: 'token_purchase',
                stripe_event_id: event.id,
                stripe_customer_id: session.customer,
                tokens_added: tokensToAdd,
                metadata: {
                  checkout_session_id: session.id,
                  payment_status: session.payment_status,
                  tokens_purchased: tokensToAdd,
                  pack_price_gbp: session.metadata.price_gbp || '2.00',
                  type: 'token_purchase'
                }
              });
          } catch (error) {
            console.error('Failed to log token purchase:', error);
            // Don't throw - logging failure shouldn't break the flow
          }

          console.log(`✅ Successfully added ${tokensToAdd} tokens to user ${userId}`);
          break; // Exit here for token purchases
        }

        // Existing subscription logic continues here...
        if (!priceId) {
          throw new Error('No price ID found in session metadata');
        }

        // Get customer details with retry
        let customer;
        let retryCount = 0;
        while (retryCount < 3) {
          try {
            customer = await stripe.customers.retrieve(session.customer as string);
            break;
          } catch (error) {
            console.error(`Failed to retrieve customer (attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount === 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        
        // Determine tier from price ID
        let tier = 'free';
        const litePriceId = Deno.env.get('STRIPE_LITE_PRICE_ID');
        const premiumPriceId = Deno.env.get('STRIPE_PREMIUM_PRICE_ID');

        if (priceId === premiumPriceId) {
          tier = 'full';
        } else if (priceId === litePriceId) {
          tier = 'lite';
        } else {
          throw new Error(`Invalid price ID: ${priceId}`);
        }
        
        // Update user profile with retry logic
        let updateSuccess = false;
        retryCount = 0;
        
        while (!updateSuccess && retryCount < 3) {
          try {
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                stripe_customer_id: session.customer,
                user_tier: tier,
                subscription_start_date: new Date().toISOString(),
                subscription_end_date: null, // Ongoing subscription
                email: customer.email,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (updateError) throw updateError;
            updateSuccess = true;
            
          } catch (error) {
            console.error(`Failed to update user profile (attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount === 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }

        // Log the subscription event
        try {
          await supabaseAdmin
            .from('subscription_events')
            .insert({
              user_id: userId,
              event_type: 'subscription_created',
              stripe_event_id: event.id,
              stripe_customer_id: session.customer,
              new_tier: tier,
              metadata: {
                checkout_session_id: session.id,
                payment_status: session.payment_status,
                subscription_id: session.subscription,
                price_id: priceId
              }
            });

          // Also log to tier change logs
          await supabaseAdmin
            .from('tier_change_logs')
            .insert({
              user_id: userId,
              old_tier: 'free', // Assuming new subscription
              new_tier: tier,
              source: 'stripe',
              metadata: JSON.stringify({
                event_type: 'checkout.session.completed',
                stripe_customer_id: session.customer,
                checkout_session_id: session.id,
                price_id: priceId
              }),
              timestamp: new Date().toISOString()
            });
        } catch (error) {
          console.error('Failed to log subscription event:', error);
          // Don't throw - logging failure shouldn't break the flow
        }

        console.log(`✅ Successfully processed subscription for user ${userId} to tier ${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        
        // Find user by Stripe customer ID
        const { data: profiles, error: queryError } = await supabaseAdmin
          .from('profiles')
          .select('id, user_tier')
          .eq('stripe_customer_id', subscription.customer)
          .single()

        if (queryError || !profiles) {
          throw new Error('No user found with this Stripe customer ID')
        }

        // Update user profile to free tier
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            user_tier: 'free',
            subscription_end_date: new Date().toISOString()
          })
          .eq('id', profiles.id)

        if (updateError) {
          throw new Error(`Failed to update user profile: ${updateError.message}`)
        }

        // Log the subscription cancellation
        await supabaseAdmin
          .from('subscription_events')
          .insert({
            user_id: profiles.id,
            event_type: 'subscription_cancelled',
            stripe_event_id: event.id,
            stripe_customer_id: subscription.customer,
            new_tier: 'free',
            metadata: {
              subscription_id: subscription.id,
              cancel_at: subscription.cancel_at,
              old_tier: profiles.user_tier
            }
          })

        // Also log to tier change logs
        await supabaseAdmin
          .from('tier_change_logs')
          .insert({
            user_id: profiles.id,
            old_tier: profiles.user_tier,
            new_tier: 'free',
            source: 'stripe',
            metadata: JSON.stringify({
              event_type: 'customer.subscription.deleted',
              stripe_customer_id: subscription.customer,
              subscription_id: subscription.id,
              cancel_at: subscription.cancel_at
            }),
            timestamp: new Date().toISOString()
          })

        console.log(`✅ Successfully processed subscription cancellation for user ${profiles.id}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('❌ Webhook error:', err.message)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed', details: err.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 