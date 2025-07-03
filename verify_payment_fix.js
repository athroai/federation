// 🔍 VERIFY PAYMENT FIX
// Copy and paste this into your browser console on the dashboard to verify the fix worked

(async function verifyPaymentFix() {
  console.log('🔍 VERIFYING PAYMENT FIX...');
  console.log('===============================');

  try {
    // Check if user is on the right page
    if (!window.location.href.includes('localhost')) {
      console.warn('⚠️ Please make sure you are on the dashboard');
      return;
    }

    // Try to find Supabase client
    let supabase;
    if (window.supabase) {
      supabase = window.supabase;
    } else if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
    } else {
      console.log('❌ Could not find Supabase client');
      console.log('📋 MANUAL CHECK:');
      console.log('1. Look at the top right of the dashboard');
      console.log('2. Check if it says "Current Tier: Full" or "Current Tier: Free"');
      console.log('3. If it still says "Free", the SQL fix needs to be run');
      return;
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No authenticated user found');
      console.log('📋 Please log in and try again');
      return;
    }

    console.log('✅ User authenticated');
    console.log('👤 User ID:', user.id);
    console.log('📧 Email:', user.email);

    // Check current tier
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, subscription_status, subscription_start_date, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error checking profile:', profileError);
      return;
    }

    console.log('\n📊 CURRENT STATUS:');
    console.log('Tier:', profile.user_tier);
    console.log('Subscription:', profile.subscription_status);
    console.log('Updated:', profile.updated_at);

    if (profile.user_tier === 'full') {
      console.log('\n🎉 SUCCESS! PAYMENT PROCESSED!');
      console.log('✅ User tier is now FULL');
      console.log('✅ All premium features should be unlocked');
      console.log('✅ User should see all cards/content');
      
      // Clear any cached data
      localStorage.removeItem('userTier');
      localStorage.removeItem('userProfile');
      
      console.log('\n🔄 Refreshing page to show new access...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } else {
      console.log('\n❌ TIER STILL NOT FIXED');
      console.log('Current tier:', profile.user_tier);
      console.log('Expected tier: full');
      console.log('\n🔧 ACTION NEEDED:');
      console.log('1. Run the SQL script: URGENT_PAYMENT_FIX.sql');
      console.log('2. Go to Supabase SQL Editor');
      console.log('3. Copy and paste the entire SQL script');
      console.log('4. Click "RUN" to execute');
      console.log('5. Refresh this page');
    }

  } catch (error) {
    console.error('💥 Verification error:', error);
    console.log('\n🔧 MANUAL CHECK:');
    console.log('1. Look for "Current Tier" text on the dashboard');
    console.log('2. It should say "Full" not "Free"');
    console.log('3. All premium cards should be visible and clickable');
  }
})();

console.log('🔧 Payment verification script loaded!');
console.log('📝 Run this script on the dashboard page to check if the payment fix worked'); 