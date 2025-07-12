import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || 'placeholder-key';

// Stable storage key for auth - DO NOT CHANGE THIS or users will be logged out
const STORAGE_KEY = 'sb-klxmxaeforrhzkmvsczs-auth-token';

// Create Supabase client with persistent auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: STORAGE_KEY,
    persistSession: true, // Keep user logged in
    autoRefreshToken: true, // Automatically refresh token
    detectSessionInUrl: true // 🔥 MUST BE TRUE for email confirmation to work!
  }
}); 