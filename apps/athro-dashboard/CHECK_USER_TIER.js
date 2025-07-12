// 🔍 USER TIER DEBUG SCRIPT
// Open your browser console on the dashboard and run this script
// to check what tier data is actually stored in the database

(async function checkUserTier() {
  console.log('🔍 CHECKING USER TIER DATA IN DATABASE...');
  
  try {
    // Get the current Supabase client from the global window object
    const supabase = window.supabase || (await import('./src/services/supabaseClient.js')).supabase;
    
    if (!supabase) {
      throw new Error('Could not access Supabase client. Make sure you are on the dashboard page.');
    }
    
    // Step 1: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Could not get current user:', userError);
      return;
    }
    
    console.log('✅ Current user:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });
    
    // Step 2: Check profiles table for tier data
    console.log('🔍 Checking profiles table...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      
      // Check if profile exists at all
      const { data: allProfiles, error: listError } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(5);
      
      console.log('📊 Sample profiles in database:', allProfiles);
      console.log('❌ Profile fetch error details:', profileError);
      return;
    }
    
    console.log('📊 PROFILE DATA:', profile);
    
    // Step 3: Check subscriptions table if it exists
    console.log('🔍 Checking subscriptions table...');
    
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);
    
    if (subError) {
      console.log('ℹ️ Subscriptions table error (might not exist):', subError.message);
    } else {
      console.log('📊 SUBSCRIPTION DATA:', subscriptions);
    }
    
    // Step 4: Check if stripe customer data exists
    if (profile.stripe_customer_id) {
      console.log('🔍 User has Stripe customer ID:', profile.stripe_customer_id);
      
      const { data: stripeData, error: stripeError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_customer_id', profile.stripe_customer_id);
      
      if (!stripeError) {
        console.log('📊 STRIPE SUBSCRIPTION DATA:', stripeData);
      }
    } else {
      console.log('ℹ️ No Stripe customer ID found');
    }
    
    // Step 5: Summary
    console.log('📝 SUMMARY:');
    console.log(`Current tier in database: ${profile.user_tier || 'NOT SET'}`);
    console.log(`Subscription status: ${profile.subscription_status || 'NOT SET'}`);
    console.log(`Stripe customer: ${profile.stripe_customer_id ? 'YES' : 'NO'}`);
    console.log(`Last updated: ${profile.updated_at || 'UNKNOWN'}`);
    
    // Step 6: Recommend fixes
    if (profile.user_tier === 'free' && profile.stripe_customer_id) {
      console.log('🚨 ISSUE DETECTED: User has Stripe customer ID but tier is free');
      console.log('💡 SUGGESTED FIX: Update user_tier to match subscription');
    }
    
    if (!profile.user_tier) {
      console.log('🚨 ISSUE DETECTED: No user_tier set in database');
      console.log('💡 SUGGESTED FIX: Set user_tier to appropriate value');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
})(); 