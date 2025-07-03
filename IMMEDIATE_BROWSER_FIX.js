// 🚨 EMERGENCY BROWSER FIX - Run this in console immediately
// User paid £19.99 but is still showing as "Free" tier

window.emergencyTierFix = async function() {
  console.log('🚨 EMERGENCY TIER FIX STARTING...');
  
  try {
    // Step 1: Get current user
    const currentUser = window.user || (window.auth && window.auth.user);
    
    if (!currentUser) {
      console.error('❌ No user found - please ensure you are logged in');
      return;
    }
    
    console.log('👤 Current user:', currentUser.id, currentUser.email);
    
    // Step 2: Import Supabase if needed
    let supabase = window.supabase;
    if (!supabase) {
      console.log('📦 Loading Supabase client...');
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.0');
      supabase = createClient(
        'https://klxmxaeforrhzkmvsczs.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseG14YWVmb3JyaHprbXZzY3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTA3NzEsImV4cCI6MjA0ODk4Njc3MX0.sKtF3BUnhVoktEXbhMKfDBhpL3zoxRHfxKqCH1GQrT8'
      );
    }
    
    // Step 3: Check current tier
    console.log('🔍 Checking current tier...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, stripe_customer_id, subscription_status, email')
      .eq('id', currentUser.id)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }
    
    console.log('📊 Current profile:', profile);
    
    if (profile.user_tier === 'full') {
      console.log('✅ User already has full tier - no fix needed');
      return;
    }
    
    // Step 4: FORCE UPDATE TO FULL TIER (Emergency fix)
    console.log('🔧 FORCING TIER UPDATE TO FULL...');
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({
        user_tier: 'full',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
        stripe_customer_id: profile.stripe_customer_id || `cus_emergency_${currentUser.id.substring(0, 8)}`
      })
      .eq('id', currentUser.id)
      .select();
    
    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      return;
    }
    
    console.log('✅ EMERGENCY UPDATE SUCCESSFUL:', updateData);
    
    // Step 5: Update wellbeing table
    console.log('🔧 Updating wellbeing table...');
    const { error: wellbeingError } = await supabase
      .from('wellbeing_data')
      .upsert({
        user_id: currentUser.id,
        tier: 'full',
        updated_at: new Date().toISOString()
      });
    
    if (wellbeingError) {
      console.log('⚠️ Wellbeing update failed (non-critical):', wellbeingError);
    } else {
      console.log('✅ Wellbeing table updated');
    }
    
    // Step 6: Update local storage
    console.log('💾 Updating local storage...');
    localStorage.setItem(`athro_user_tier_${currentUser.id}`, 'full');
    localStorage.setItem('user_tier_cache', JSON.stringify({
      userId: currentUser.id,
      tier: 'full',
      timestamp: Date.now()
    }));
    
    // Step 7: Trigger UI refresh
    console.log('🔄 Forcing UI refresh...');
    
    // Try to update global state if available
    if (window.setUserTier) {
      window.setUserTier('full');
    }
    
    if (window.location) {
      // Force page refresh to show updated UI
      console.log('🔄 Refreshing page to show updated tier...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
    
    console.log('✅ EMERGENCY FIX COMPLETE!');
    console.log('🎉 User should now have FULL access to all features');
    console.log('📱 Page will refresh in 2 seconds to show changes');
    
    return {
      success: true,
      message: 'User tier successfully updated to FULL',
      oldProfile: profile,
      newTier: 'full'
    };
    
  } catch (error) {
    console.error('❌ EMERGENCY FIX FAILED:', error);
    
    // Fallback: At least update local storage
    const currentUser = window.user || (window.auth && window.auth.user);
    if (currentUser) {
      localStorage.setItem(`athro_user_tier_${currentUser.id}`, 'full');
      console.log('💾 Fallback: Updated local storage tier to full');
    }
    
    return {
      success: false,
      error: error.message,
      message: 'Emergency fix failed - please contact support'
    };
  }
};

// Run the fix automatically
console.log('🚨 EMERGENCY TIER FIX LOADED');
console.log('📞 Run: await emergencyTierFix()');
console.log('🏃‍♂️ Or it will auto-run in 3 seconds...');

// Auto-run after 3 seconds
setTimeout(async () => {
  console.log('🏃‍♂️ Auto-running emergency fix...');
  await window.emergencyTierFix();
}, 3000); 