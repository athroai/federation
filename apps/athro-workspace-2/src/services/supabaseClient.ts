import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Use same storage key as dashboard to prevent multiple client instances
const STORAGE_KEY_VERSION = 'sb-klxmxaeforrhzkmvsczs-auth-token'; // Same as dashboard
const clearOldAuthTokens = () => {
  const migrationKey = 'workspace-auth-storage-migrated-v2';
  if (!localStorage.getItem(migrationKey)) {
    console.log('🔄 [Workspace] Cleaning up old auth tokens...');
    
    // ✅ FIXED: Only clear specific old tokens, not all auth tokens
    // This prevents breaking active authentication sessions
    const oldTokensToRemove = [
      'athro-dashboard-auth',
      'athro-dashboard-auth-v1', 
      'athro-workspace-auth',
      'athro-workspace-auth-v1',
      'sb-klxmxaeforrhzkmvsczs-auth-token-old', // Only remove old versions
    ];
    
    oldTokensToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️ [Workspace] Removed old token: ${key}`);
      }
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ [Workspace] Removed old session token: ${key}`);
      }
    });
    
    // Don't clear ALL supabase/auth tokens - this breaks active sessions
    // Instead, just mark migration as complete
    localStorage.setItem(migrationKey, 'true');
    console.log('✅ [Workspace] Selective auth token cleanup complete - preserving active session');
  }
};

clearOldAuthTokens();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: STORAGE_KEY_VERSION, // Versioned storage key for workspace
  }
}); 