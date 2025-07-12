import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  full_name: string | null;
  preferred_name: string | null;
  school: string | null;
  year: number | null;
  email: string | null;
  avatar_url: string | null;
}

export class UserService {
  private static instance: UserService;
  private currentUser: any = null;
  private userProfile: UserProfile | null = null;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private async ensureUser() {
    if (!this.currentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      this.currentUser = user;
    }
    return this.currentUser;
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const user = await this.ensureUser();
      
      // Return cached profile if available
      if (this.userProfile) {
        return this.userProfile;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return null;
      }

      if (profile) {
        this.userProfile = profile;
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async getPreferredName(): Promise<string | null> {
    try {
      // Check if we have valid Supabase config
      if (!supabaseUrl || supabaseUrl === 'https://placeholder-url.supabase.co') {
        console.warn('Supabase not configured, returning null for preferred name');
        return null;
      }
      
      const profile = await this.getUserProfile();
      console.log('Fetched user profile for preferred name:', profile);
      const preferredName = profile?.preferred_name || null;
      console.log('User preferred name:', preferredName);
      return preferredName;
    } catch (error) {
      console.error('Failed to get preferred name:', error);
      return null;
    }
  }

  async getFullName(): Promise<string | null> {
    try {
      const profile = await this.getUserProfile();
      return profile?.full_name || null;
    } catch (error) {
      console.error('Failed to get full name:', error);
      return null;
    }
  }

  // Clear cache when user changes
  clearCache() {
    this.currentUser = null;
    this.userProfile = null;
  }
}

export default UserService; 