// Debug Authentication and Fix User Tier
// Copy and paste this entire script into your browser console while on the dashboard

(async function debugAuthAndFixTier() {
  console.log('🔍 DEBUGGING AUTHENTICATION AND TIER STATUS...');
  console.log('==========================================');

  try {
    // Step 1: Check if we're on the right page
    console.log('📍 Current URL:', window.location.href);
    if (!window.location.href.includes('localhost:5210')) {
      console.warn('⚠️  Please make sure you are on http://localhost:5210');
      console.log('🔄 Navigate to the dashboard first, then run this script');
      return;
    }

    // Step 2: Check for Supabase client
    console.log('\n🔍 Checking for Supabase client...');
    let supabase;
    
    // Try to find supabase in different ways
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Found Supabase client on window.supabase');
    } else if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
      console.log('✅ Found Supabase client on window.__SUPABASE_CLIENT__');
    } else {
      console.log('❌ Supabase client not found on window object');
      console.log('🔍 Checking React components...');
      
      // Try to access through React DevTools or component state
      const reactFiber = document.querySelector('#root')?._reactInternalFiber || 
                        document.querySelector('#root')?._reactInternalInstance;
      
      if (reactFiber) {
        console.log('📱 Found React app, trying to access Supabase through context...');
      }
      
      console.log('❌ Could not find Supabase client automatically');
      console.log('');
      console.log('🔧 MANUAL STEPS TO FIX:');
      console.log('1. Make sure you are logged in to the dashboard');
      console.log('2. Open browser dev tools (F12)');
      console.log('3. Go to Application/Storage tab');
      console.log('4. Check Local Storage for auth tokens');
      console.log('5. If no tokens, please log in again');
      return;
    }

    // Step 3: Check authentication status
    console.log('\n🔍 Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      console.log('🔧 Please try logging out and logging back in');
      return;
    }

    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('');
      console.log('🔧 PLEASE LOG IN:');
      console.log('1. Click the login button on the dashboard');
      console.log('2. Use email: finance@nexastream.co.uk');
      console.log('3. After login, run this script again');
      return;
    }

    console.log('✅ User authenticated!');
    console.log('👤 User ID:', user.id);
    console.log('📧 Email:', user.email);

    // Step 4: Check current tier in database
    console.log('\n🔍 Checking current tier in database...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
    } else {
      console.log('📊 Current profile data:', profile);
    }

    // Step 5: Check wellbeing table
    console.log('\n🔍 Checking wellbeing table...');
    const { data: wellbeing, error: wellbeingError } = await supabase
      .from('wellbeing')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (wellbeingError) {
      console.log('ℹ️  Wellbeing record not found (this is normal)');
    } else {
      console.log('📊 Wellbeing tier:', wellbeing?.tier);
    }

    // Step 6: Fix the tier if needed
    if (!profile || profile.user_tier !== 'full') {
      console.log('\n🔧 FIXING USER TIER TO FULL...');
      
      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          user_tier: 'full',
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('❌ Error updating profile:', updateError);
      } else {
        console.log('✅ Profile updated successfully');
      }

      // Update wellbeing table
      const { error: wellbeingUpdateError } = await supabase
        .from('wellbeing')
        .upsert({
          user_id: user.id,
          tier: 'full',
          updated_at: new Date().toISOString()
        });

      if (wellbeingUpdateError) {
        console.log('ℹ️  Wellbeing update not needed or failed (this is normal)');
      } else {
        console.log('✅ Wellbeing updated successfully');
      }

      // Clear any cached data
      localStorage.removeItem('userTier');
      localStorage.removeItem('userProfile');
      
      console.log('🎉 TIER FIXED TO FULL!');
      console.log('🔄 Refreshing page in 3 seconds...');
      
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } else {
      console.log('✅ User tier is already set to FULL');
      console.log('🔄 If you\'re still seeing access issues, refreshing page...');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
    console.log('');
    console.log('🔧 FALLBACK SOLUTION:');
    console.log('1. Go to Supabase dashboard');
    console.log('2. Open SQL Editor');
    console.log('3. Run this query:');
    console.log(`
UPDATE profiles 
SET user_tier = 'full' 
WHERE email = 'finance@nexastream.co.uk';

INSERT INTO wellbeing (user_id, tier) 
SELECT id, 'full' 
FROM profiles 
WHERE email = 'finance@nexastream.co.uk'
ON CONFLICT (user_id) DO UPDATE SET tier = 'full';
    `);
  }

})();

console.log('🔧 Debug authentication and tier script loaded!');
console.log('📝 Run this script on the dashboard page (http://localhost:5210)'); 