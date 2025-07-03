/**
 * 🚨 COMPREHENSIVE TIER FIX FOR FINANCE@NEXASTREAM.CO.UK
 * 
 * This script handles:
 * 1. Email mismatch (hello@ vs finance@)
 * 2. Correct user tier update
 * 3. Frontend state refresh
 * 
 * Copy and paste this entire script into your browser console
 */

(async function fixUserTierComprehensive() {
  console.log('🔧 Starting comprehensive tier fix for finance@nexastream.co.uk...');
  
  try {
    // Step 1: Get current user from auth context
    const currentUser = window.user || (window.auth && window.auth.user);
    if (!currentUser) {
      console.error('❌ No authenticated user found');
      return;
    }
    
    console.log('👤 Found current user:');
    console.log('  Email:', currentUser.email);
    console.log('  ID:', currentUser.id);
    
    // Step 2: Verify this is the finance@ email user
    if (currentUser.email !== 'finance@nexastream.co.uk') {
      console.warn('⚠️ Email mismatch detected:');
      console.warn('  Expected: finance@nexastream.co.uk');
      console.warn('  Found:', currentUser.email);
      console.log('  Proceeding anyway with current user...');
    }
    
    // Step 3: Try to use existing athroDebug function first
    if (window.athroDebug && typeof window.athroDebug.testTierUpdate === 'function') {
      console.log('✅ Using existing debug tools...');
      
      const result = await window.athroDebug.testTierUpdate(currentUser.id, 'full');
      console.log('🎯 Debug tool result:', result);
      
      // Force refresh the auth context
      if (window.location.reload) {
        console.log('🔄 Refreshing page to update frontend state...');
        setTimeout(() => window.location.reload(), 1000);
        return;
      }
    }
    
    // Step 4: Fallback - Direct Supabase update
    console.log('🔄 Using fallback method - direct update...');
    
    // Try to access global supabase instance
    let supabase = window.supabase;
    
    if (!supabase) {
      // Import Supabase dynamically if not available
      console.log('📦 Loading Supabase client...');
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.50.0');
      supabase = createClient(
        'https://klxmxaeforrhzkmvsczs.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseG14YWVmb3JyaHprbXZzY3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTA3NzEsImV4cCI6MjA0ODk4Njc3MX0.sKtF3BUnhVoktEXbhMKfDBhpL3zoxRHfxKqCH1GQrT8'
      );
    }
    
    // Step 5: Update the profile in database
    console.log('💾 Updating database profile...');
    const { data, error } = await supabase
      .from('profiles')
      .update({
        user_tier: 'full',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id)
      .select();
    
    if (error) {
      console.error('❌ Database update failed:', error);
      
      // Try alternative approach - upsert
      console.log('🔄 Trying upsert approach...');
      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: currentUser.id,
          email: currentUser.email,
          user_tier: 'full',
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (upsertError) {
        console.error('❌ Upsert also failed:', upsertError);
        return;
      } else {
        console.log('✅ Upsert successful:', upsertData);
      }
    } else {
      console.log('✅ Database update successful:', data);
    }
    
    // Step 6: Update local storage as backup
    console.log('💾 Updating local storage backup...');
    localStorage.setItem(`athro_user_tier_${currentUser.id}`, 'full');
    
    // Step 7: Force update any global auth state
    if (window.setUserTier) {
      console.log('🔄 Updating global auth state...');
      window.setUserTier('full');
    }
    
    // Step 8: Refresh the page
    console.log('🎉 SUCCESS! Tier updated to FULL');
    console.log('🔄 Refreshing page in 2 seconds...');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('💥 Comprehensive fix failed:', error);
    console.log('🔄 Trying simple page refresh...');
    window.location.reload();
  }
})();

// Also set up a verification function
window.verifyTierFix = async function() {
  console.log('🔍 Verifying tier fix...');
  
  // Check local storage
  const currentUser = window.user || (window.auth && window.auth.user);
  if (currentUser) {
    const localTier = localStorage.getItem(`athro_user_tier_${currentUser.id}`);
    console.log('📱 Local storage tier:', localTier);
  }
  
  // Check if athroDebug is available
  if (window.athroDebug) {
    try {
      const result = await window.athroDebug.checkUserTier();
      console.log('🔍 Database tier check:', result);
    } catch (error) {
      console.error('❌ Database check failed:', error);
    }
  }
  
  // Check current UI state
  const tierElements = document.querySelectorAll('[data-tier], [class*="tier"]');
  console.log('🎨 UI tier elements found:', tierElements.length);
  
  return 'Verification complete - check console logs above';
};

console.log('🔧 Comprehensive tier fix script loaded!');
console.log('🔍 Run verifyTierFix() after page reload to check results'); 