// 🔍 DEBUG AUTH CONTEXT
// Copy and paste this into your browser console to check auth status

(async function debugAuthContext() {
  console.log('🔍 DEBUGGING AUTH CONTEXT...');
  console.log('============================');

  try {
    // Check Supabase client
    let supabase;
    if (window.supabase) {
      supabase = window.supabase;
    } else if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
    } else {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = 'https://klxmxaeforrhzkmvsczs.supabase.co'; // Update with your URL
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtseG14YWVmb3JyaHprbXZzY3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTA3NzEsImV4cCI6MjA0ODk4Njc3MX0.sKtF3BUnhVoktEXbhMKfDBhpL3zoxRHfxKqCH1GQrT8'; // Update with your key
      supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    // Check Supabase auth
    console.log('🔍 Checking Supabase auth...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Supabase auth error:', error);
    } else if (user) {
      console.log('✅ Supabase user:', user.email);
      console.log('👤 User ID:', user.id);
    } else {
      console.log('❌ No user in Supabase auth');
    }

    // Check auth context (React context)
    console.log('\n🔍 Checking React auth context...');
    
    // Try to find auth context in React DevTools
    const reactRoot = document.querySelector('#root');
    if (reactRoot) {
      const reactFiber = reactRoot._reactInternalFiber || 
                        reactRoot._reactInternalInstance ||
                        reactRoot.__reactInternalInstance;
      
      if (reactFiber) {
        console.log('📱 Found React fiber');
        // This is a simple check - in real apps, context would be deeper
      } else {
        console.log('❌ Could not find React fiber');
      }
    }

    // Check local storage for auth tokens
    console.log('\n🔍 Checking local storage...');
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('supabase') || key.includes('user')
    );
    
    if (authKeys.length > 0) {
      console.log('✅ Found auth-related keys in localStorage:', authKeys);
    } else {
      console.log('❌ No auth keys found in localStorage');
    }

    // Check session storage
    console.log('\n🔍 Checking session storage...');
    const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('auth') || key.includes('supabase') || key.includes('user')
    );
    
    if (sessionAuthKeys.length > 0) {
      console.log('✅ Found auth-related keys in sessionStorage:', sessionAuthKeys);
    } else {
      console.log('❌ No auth keys found in sessionStorage');
    }

    console.log('\n📋 SUMMARY:');
    console.log('- Supabase user:', user ? '✅ Authenticated' : '❌ Not authenticated');
    console.log('- localStorage:', authKeys.length > 0 ? '✅ Has auth keys' : '❌ No auth keys');
    console.log('- sessionStorage:', sessionAuthKeys.length > 0 ? '✅ Has auth keys' : '❌ No auth keys');

    if (user && authKeys.length === 0) {
      console.log('\n⚠️ WARNING: User is authenticated in Supabase but no auth keys in localStorage');
      console.log('💡 This might indicate an auth context sync issue');
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
})();

console.log('🔍 Auth context debug script loaded!'); 