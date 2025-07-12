import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🛒 Starting token purchase checkout session creation...')
    
    // Check environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const tokenPriceId = Deno.env.get('STRIPE_TOKEN_PRICE_ID') // You'll need to create this product in Stripe
    
    console.log('Environment check:')
    console.log('  STRIPE_SECRET_KEY:', stripeKey ? `Set (${stripeKey.substring(0, 10)}...)` : 'MISSING')
    console.log('  SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING')
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'MISSING')
    console.log('  STRIPE_TOKEN_PRICE_ID:', tokenPriceId ? 'Set' : 'MISSING')
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is missing')
    }
    
    // For now, use a default price if STRIPE_TOKEN_PRICE_ID is not set
    // In production, you'll need to create this product in Stripe
    const finalTokenPriceId = tokenPriceId || 'price_token_pack_placeholder'
    
    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    console.log('🔐 Authenticating user...')
    
    // Set the user context
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      console.error('Authentication failed:', userError)
      throw new Error('Unauthorized')
    }

    console.log('✅ User authenticated:', user.id)

    const { userId, successUrl, cancelUrl } = await req.json()
    
    console.log('Request data:')
    console.log('  userId:', userId)
    console.log('  successUrl:', successUrl)
    console.log('  cancelUrl:', cancelUrl)

    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      throw new Error('User ID mismatch')
    }

    // Check user tier - only Full tier can purchase tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_tier')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    if (profile.user_tier !== 'full') {
      throw new Error('Token top-ups are only available for Full tier users')
    }

    console.log('✅ User tier verified: Full tier user can purchase tokens')

    // Get or create customer
    let customerId: string;

    try {
      // First, try to find customer by email
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('Found existing customer:', customerId);

        // Update customer metadata if needed
        await stripe.customers.update(customerId, {
          metadata: {
            supabase_user_id: userId
          }
        });
      } else {
        console.log('Creating new customer for:', user.email);
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: userId
          }
        });
        customerId = customer.id;
      }

      // Update profile with customer ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          stripe_customer_id: customerId,
          email: user.email
        });

      if (updateError) {
        console.error('Failed to update profile with customer ID:', updateError);
        // Continue anyway - the webhook will handle this
      }

    } catch (error) {
      console.error('Error handling customer:', error);
      throw new Error('Failed to process customer data');
    }

    // For testing purposes, create a manual checkout session
    // In production, you'll use the actual Stripe price ID
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'AthroAi Token Pack',
                description: '320,000 tokens for your AthroAi Full account',
                images: []
              },
              unit_amount: 200, // £2.00 in pence
            },
            quantity: 1
          }
        ],
        mode: 'payment', // One-time payment, not subscription
        success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&type=token_purchase`,
        cancel_url: cancelUrl,
        metadata: {
          supabase_user_id: userId,
          type: 'token_purchase',
          tokens: '320000', // 320,000 tokens per pack
          price_gbp: '2.00'
        }
      });

      console.log('✅ Token purchase session created:', session.id)

      return new Response(
        JSON.stringify({ 
          url: session.url,
          sessionId: session.id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (error) {
      console.error('Error creating token checkout session:', error);
      throw new Error('Failed to create token checkout session');
    }
  } catch (error) {
    console.error('Error creating token checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 