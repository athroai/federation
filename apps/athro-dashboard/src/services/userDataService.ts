import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  preferred_name: string | null;
  school: string | null;
  year: number | null;
  exam_board: string | null;
  recent_grades: string | null;
  user_tier: 'free' | 'lite' | 'full';
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProfile {
  full_name?: string;
  preferred_name?: string;
  school?: string;
  year?: number | null;
  exam_board?: string;
  recent_grades?: string;
}

export class UserDataService {
  // Get current user's profile
  async getUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        preferred_name,
        school,
        year,
        exam_board,
        recent_grades,
        user_tier,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  }

  // Update user's profile
  async updateUserProfile(updates: UpdateUserProfile): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  // Get user's subject preferences
  async getSubjectPreferences(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('subject_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('[UserDataService] Error fetching subject preferences:', error.message, error.details);
      throw new Error('Failed to fetch subject preferences.');
    }

    return data || [];
  }

  // Update subject preference
  async updateSubjectPreference(preference: any): Promise<any | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('subject_preferences')
      .upsert({
        ...preference,
        user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[UserDataService] Error updating subject preference:', error.message, error.details, preference);
      throw new Error('Failed to update subject preference.');
    }

    return data;
  }
}

export const userDataService = new UserDataService(); 