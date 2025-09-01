// Debug script to test extension authentication
// Run this in the browser console on any page with the extension loaded

(async function debugExtensionAuth() {
  console.log('🔍 Starting Extension Auth Debug...');
  
  const backendUrl = 'http://localhost:3838'; // Change this to your actual backend URL
  
  // Function to get token from chrome storage
  const getStorageToken = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new Promise((resolve) => {
        const storageKeys = [
          'supabase_session', 'auth_session', 'session_token', 'access_token',
          'sb-session', 'sb-access-token', 'sb-refresh-token',
          'supabase.auth.token', 'auth.token', 'user_session'
        ];

        chrome.storage.sync.get(storageKeys, (syncResult) => {
          console.log('📦 Sync storage contents:', syncResult);
          
          chrome.storage.local.get(storageKeys, (localResult) => {
            console.log('📁 Local storage contents:', localResult);
            
            // Try to extract token
            const extractToken = (result) => {
              if (result.supabase_session?.access_token) return result.supabase_session.access_token;
              if (result.auth_session?.access_token) return result.auth_session.access_token;
              if (result['sb-session']?.access_token) return result['sb-session'].access_token;
              if (result.session_token) return result.session_token;
              if (result.access_token) return result.access_token;
              return null;
            };

            const token = extractToken(syncResult) || extractToken(localResult);
            console.log('🔑 Extracted token:', token ? `Found (${token.length} chars)` : 'Not found');
            resolve(token);
          });
        });
      });
    }
    return null;
  };

  try {
    // Step 1: Get token from storage
    const token = await getStorageToken();
    
    if (!token) {
      console.error('❌ No authentication token found in extension storage');
      console.log('💡 Make sure you are signed in to the FluentFlow web app');
      return;
    }

    // Step 2: Test debug auth endpoint
    console.log('🧪 Testing debug auth endpoint...');
    const debugResponse = await fetch(`${backendUrl}/api/debug/auth`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const debugData = await debugResponse.json();
    console.log('🔍 Debug auth response:', debugData);

    if (!debugResponse.ok) {
      console.error('❌ Debug auth failed:', debugData);
      return;
    }

    if (!debugData.authenticated) {
      console.error('❌ Token is not valid for authentication');
      return;
    }

    console.log('✅ Authentication successful!');
    console.log('👤 User:', debugData.user);

    // Step 3: Test groups endpoint
    console.log('📊 Testing groups endpoint...');
    const groupsResponse = await fetch(`${backendUrl}/api/user/groups`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const groupsData = await groupsResponse.json();
    console.log('👥 Groups response:', groupsData);

    if (groupsResponse.ok) {
      console.log(`✅ Groups loaded successfully! Found ${groupsData.groups?.length || 0} groups`);
      if (groupsData.groups?.length > 0) {
        console.log('🏷️ Groups:', groupsData.groups.map(g => ({ name: g.name, role: g.role, members: g.member_count })));
      }
    } else {
      console.error('❌ Groups loading failed:', groupsData);
    }

  } catch (error) {
    console.error('💥 Debug script error:', error);
  }
})();

console.log('📋 Copy and paste this entire script into the browser console to debug extension auth');