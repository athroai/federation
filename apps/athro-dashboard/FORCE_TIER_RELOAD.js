// 🚨 FORCE TIER RELOAD SCRIPT
// Run this in your browser console AFTER applying the SQL fix
// This will force the frontend to reload your tier from the database

(async function forceTierReload() {
  console.log('🔄 FORCING TIER RELOAD FROM DATABASE...');
  
  try {
    // Get the current Supabase client from the global window object
    const supabase = window.supabase || (await import('/src/services/supabaseClient.js')).supabase;
    
    if (!supabase) {
      throw new Error('Could not access Supabase client. Make sure you are on the dashboard page.');
    }
    
    // Step 1: Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Could not get current user:', userError);
      return;
    }
    
    console.log('✅ Current user:', user.email);
    
    // Step 2: Force reload user profile from database
    console.log('🔍 Checking current tier in database...');
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, email, id, updated_at, stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Database error:', profileError);
      return;
    }
    
    console.log('📊 Database profile data:', profile);
    
    // Step 3: Check if fix was applied
    if (profile.user_tier === 'full') {
      console.log('🎉 SUCCESS! Your tier is now FULL (AthroAi)');
      console.log('💰 You now have access to:');
      console.log('  ✅ Full AthroAi dashboard access');
      console.log('  ✅ 1.6M tokens per month');
      console.log('  ✅ All premium features');
      console.log('  ✅ Token top-up options');
    } else if (profile.user_tier === 'lite') {
      console.log('⚠️ Your tier is LITE. If you paid for AthroAi (£14.99), this should be FULL.');
      console.log('Please contact support to upgrade from LITE to FULL.');
    } else {
      console.log('❌ Your tier is still FREE. The database fix may not have been applied yet.');
      console.log('Please run the SQL fix script in your database.');
    }
    
    // Step 4: Force refresh the page to reload AuthContext
    console.log('🔄 Forcing page refresh to reload AuthContext...');
    
    // Clear any cached tier data
    localStorage.removeItem('athro_user_tier');
    sessionStorage.removeItem('athro_user_tier');
    
    // Trigger a page refresh after a short delay
    setTimeout(() => {
      console.log('🚀 Refreshing page...');
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Error during tier reload:', error);
    console.log('💡 Manual refresh: Press F5 or Ctrl+R to refresh the page');
  }
})();

// Alternative manual method if the above doesn't work
console.log(`
🛠️ MANUAL TIER RELOAD INSTRUCTIONS:

If the automatic reload doesn't work, you can manually force a tier reload:

1. Open browser developer tools (F12)
2. Go to Application tab > Local Storage
3. Delete any keys starting with 'athro_'
4. Go to Session Storage and delete any keys starting with 'athro_'
5. Refresh the page (F5 or Ctrl+R)

Your tier should now reflect the database changes.

Expected result after SQL fix:
- Current Tier: AthroAi (Full)
- Price: £14.99/month
- Features: 1.6M tokens + full dashboard access
`); 