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
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    // Get request body
    const { sessionId, userId } = await req.json()

    if (!sessionId || !userId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed')
    }

    // Verify the user matches
    if (session.metadata?.supabase_user_id !== userId) {
      throw new Error('User ID mismatch')
    }

    // Get customer details
    const customer = await stripe.customers.retrieve(session.customer as string)

    // Update user profile with Stripe data and set tier to 'full'
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        stripe_customer_id: session.customer,
        user_tier: 'full',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: null, // Ongoing subscription
        email: customer.email
      })
      .eq('id', userId)

    if (updateError) {
      throw new Error(`Failed to update user profile: ${updateError.message}`)
    }

    // Log the verification event
    await supabaseAdmin
      .from('subscription_events')
      .insert({
        user_id: userId,
        event_type: 'payment_verified',
        stripe_event_id: session.id,
        stripe_customer_id: session.customer,
        new_tier: 'full',
        metadata: {
          session_id: session.id,
          payment_status: session.payment_status,
          subscription_id: session.subscription
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (err) {
    console.error('Payment verification error:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Payment verification failed'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 