import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton Supabase client to prevent multiple instances
let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    console.log('🔄 [SharedClient] Creating single Supabase client instance');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'athro-auth-token', // Consistent storage key
        flowType: 'pkce'
      }
    });
  }

  return supabaseClient;
};

// Export the client directly for convenience
export const supabase = getSupabaseClient();

// Re-export SupabaseClient type for convenience
export type { SupabaseClient } from '@supabase/supabase-js'; 