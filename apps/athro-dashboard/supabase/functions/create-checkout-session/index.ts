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
    console.log('🔧 Starting checkout session creation...')
    
    // Check environment variables
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment check:')
    console.log('  STRIPE_SECRET_KEY:', stripeKey ? `Set (${stripeKey.substring(0, 10)}...)` : 'MISSING')
    console.log('  SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING')
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'MISSING')
    
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is missing')
    }
    
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

    const { userId, priceId, successUrl, cancelUrl } = await req.json()
    
    console.log('Request data:')
    console.log('  userId:', userId)
    console.log('  priceId:', priceId)
    console.log('  successUrl:', successUrl)
    console.log('  cancelUrl:', cancelUrl)

    // Verify the user ID matches the authenticated user
    if (userId !== user.id) {
      throw new Error('User ID mismatch')
    }

    // Get or create customer with proper error handling
    let customerId: string;

    try {
      // First, try to find customer by email
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        // Customer exists - use existing customer
        customerId = customers.data[0].id;
        console.log('Found existing customer:', customerId);

        // Update customer metadata if needed
        await stripe.customers.update(customerId, {
          metadata: {
            supabase_user_id: userId
          }
        });
      } else {
        // No existing customer - create new one
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

    // Validate price ID
    const validPriceIds = [
      Deno.env.get('STRIPE_LITE_PRICE_ID'),
      Deno.env.get('STRIPE_PREMIUM_PRICE_ID')
    ];

    if (!validPriceIds.includes(priceId)) {
      throw new Error('Invalid price ID');
    }

    // Create checkout session with error handling
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        metadata: {
          supabase_user_id: userId,
          price_id: priceId // Store price ID for webhook
        }
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 