import { supabase } from './supabaseClient';
import { demoDataService } from './DemoDataService';

export interface UserProfile {
  id: string;
  full_name: string;
  preferred_name: string;
  school: string;
  year: number;
  email: string;
  user_tier: 'lite' | 'full';
  avatar_url?: string;
  created_at: string;
  last_sign_in_at: string;
}

export class ProfileService {
  private static instance: ProfileService;

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    // Check if demo mode is enabled
    if (demoDataService.isDemoModeEnabled()) {
      return demoDataService.getDemoProfile();
    }

    // Return real user profile
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      userId = user.id;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<boolean> {
    // Don't allow updates in demo mode
    if (demoDataService.isDemoModeEnabled()) {
      console.log('Profile updates disabled in demo mode');
      return true; // Return success to avoid errors in UI
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return false;
    }
  }
}

export const profileService = ProfileService.getInstance(); 