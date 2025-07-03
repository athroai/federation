// 🔍 DEBUG: Resources Loading Issue
// Copy and paste this into your browser console on the workspace page

(async function debugResourcesLoading() {
  console.log('🔍 DEBUGGING RESOURCES LOADING ISSUE...');
  console.log('==========================================');

  try {
    // Step 1: Check current URL and page
    console.log('📍 Current URL:', window.location.href);
    
    // Step 2: Check if we can find the Resources component
    const resourcesElement = document.querySelector('[style*="Loading playlists"]');
    if (resourcesElement) {
      console.log('✅ Found Resources component showing "Loading playlists..."');
    } else {
      console.log('❌ Could not find Resources loading element');
    }

    // Step 3: Check for JavaScript errors
    console.log('\n🔍 Checking for JavaScript errors...');
    console.log('Check the Console tab for any red error messages');

    // Step 4: Try to access Supabase client
    let supabase;
    if (window.supabase) {
      supabase = window.supabase;
      console.log('✅ Found Supabase client on window.supabase');
    } else if (window.__SUPABASE_CLIENT__) {
      supabase = window.__SUPABASE_CLIENT__;
      console.log('✅ Found Supabase client on window.__SUPABASE_CLIENT__');
    } else {
      console.log('❌ No Supabase client found on window object');
      console.log('💡 The component might be using its own internal client');
    }

    // Step 5: Check authentication
    if (supabase) {
      console.log('\n🔍 Checking authentication...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        return;
      }

      if (!user) {
        console.log('❌ No authenticated user found');
        console.log('🔧 Please make sure you are logged in');
        return;
      }

      console.log('✅ User authenticated');
      console.log('👤 User ID:', user.id);
      console.log('📧 Email:', user.email);

      // Step 6: Test database tables
      console.log('\n🔍 Testing database tables...');
      
      // Test playlists table
      const { data: playlists, error: playlistsError } = await supabase
        .from('playlists')
        .select('*')
        .limit(5);

      if (playlistsError) {
        console.error('❌ Error querying playlists table:', playlistsError);
        if (playlistsError.code === '42P01') {
          console.log('💡 Table "playlists" does not exist - need to run SQL migration');
        }
      } else {
        console.log('✅ Playlists table accessible');
        console.log('📊 Found playlists:', playlists?.length || 0);
      }

      // Test playlist_documents table
      const { data: documents, error: documentsError } = await supabase
        .from('playlist_documents')
        .select('*')
        .limit(5);

      if (documentsError) {
        console.error('❌ Error querying playlist_documents table:', documentsError);
        if (documentsError.code === '42P01') {
          console.log('💡 Table "playlist_documents" does not exist - need to run SQL migration');
        }
      } else {
        console.log('✅ Playlist_documents table accessible');
        console.log('📊 Found documents:', documents?.length || 0);
      }

      // Step 7: Check for athroId
      console.log('\n🔍 Checking for athroId...');
      const urlParams = new URLSearchParams(window.location.search);
      const pathParts = window.location.pathname.split('/');
      
      console.log('📍 URL path parts:', pathParts);
      console.log('📍 URL params:', Object.fromEntries(urlParams));
      
      // Try to find athroId in URL or component state
      let athroId = null;
      if (pathParts.includes('athro-maths')) athroId = 'athro-maths';
      else if (pathParts.includes('athro-science')) athroId = 'athro-science';
      else if (pathParts.includes('athro-english')) athroId = 'athro-english';
      // Add more as needed
      
      if (athroId) {
        console.log('✅ Found athroId:', athroId);
        
        // Test specific query that Resources component uses
        console.log('\n🔍 Testing Resources component query...');
        const { data: athroPlaylists, error: athroError } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', user.id)
          .eq('athro_id', athroId);

        if (athroError) {
          console.error('❌ Error querying user playlists for athro:', athroError);
        } else {
          console.log('✅ Athro playlists query successful');
          console.log('📊 Playlists for', athroId + ':', athroPlaylists?.length || 0);
        }
      } else {
        console.log('❌ Could not determine athroId from URL');
        console.log('💡 This might be why Resources is stuck loading');
      }
    }

    // Step 8: Check storage bucket
    if (supabase) {
      console.log('\n🔍 Checking storage bucket...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('❌ Error listing storage buckets:', bucketsError);
      } else {
        const playlistBucket = buckets?.find(b => b.id === 'playlist-documents');
        if (playlistBucket) {
          console.log('✅ Found playlist-documents storage bucket');
        } else {
          console.log('❌ Missing playlist-documents storage bucket');
          console.log('💡 Need to run storage bucket SQL script');
        }
      }
    }

    // Step 9: Component state inspection
    console.log('\n🔍 Checking component state...');
    console.log('🔧 Open React DevTools to inspect Resources component state');
    console.log('🔧 Look for: loading=true, user=null, athroId=null');

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }

  console.log('\n📋 SUMMARY:');
  console.log('1. Check console for any red errors');
  console.log('2. Verify user is authenticated');
  console.log('3. Verify database tables exist and are accessible');
  console.log('4. Check if athroId is being passed to Resources component');
  console.log('5. Use React DevTools to inspect component state');
})();

console.log('🔧 Debug script loaded! Running diagnostics...'); 