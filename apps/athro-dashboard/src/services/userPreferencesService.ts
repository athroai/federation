import { supabase } from './supabaseClient';
import { demoDataService } from './DemoDataService';

export interface UserPreference {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: any;
  created_at: string;
  updated_at: string;
}

export class UserPreferencesService {
  private currentUser: any = null;

  setUser(user: any) {
    this.currentUser = user;
  }

  private async ensureUser() {
    if (!this.currentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      this.currentUser = user;
    }
    return this.currentUser;
  }

  // Check if Supabase is properly configured
  private isSupabaseConfigured(): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return !!(supabaseUrl && supabaseUrl !== 'https://placeholder-url.supabase.co');
  }

  // localStorage fallback methods
  private getFromLocalStorage(key: string): any {
    try {
      const stored = localStorage.getItem(`athro_dashboard_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private setToLocalStorage(key: string, value: any): void {
    try {
      localStorage.setItem(`athro_dashboard_${key}`, JSON.stringify(value));
      console.log(`📱 Saved to localStorage: ${key}`);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }

  async getPreference(key: string): Promise<any> {
    // If Supabase is not configured, use localStorage fallback
    if (!this.isSupabaseConfigured()) {
      console.log(`🔄 Supabase not configured, using localStorage for: ${key}`);
      return this.getFromLocalStorage(key);
    }

    try {
      const user = await this.ensureUser();
      console.log(`Getting preference '${key}' for user:`, user.id);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', user.id)
        .eq('preference_key', key)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching preference:', error);
        throw error;
      }

      console.log(`Preference '${key}' value:`, data?.preference_value);
      return data?.preference_value || null;
    } catch (error) {
      console.error('Failed to get preference:', error);
      // Fallback to localStorage on error
      console.log(`🔄 Falling back to localStorage for: ${key}`);
      return this.getFromLocalStorage(key);
    }
  }

  async setPreference(key: string, value: any): Promise<void> {
    // If Supabase is not configured, use localStorage fallback
    if (!this.isSupabaseConfigured()) {
      console.log(`🔄 Supabase not configured, using localStorage for: ${key}`);
      this.setToLocalStorage(key, value);
      return;
    }

    try {
      const user = await this.ensureUser();
      console.log(`Setting preference '${key}' for user:`, user.id, 'Value:', value);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preference_key: key,
          preference_value: value
        }, { onConflict: 'user_id,preference_key' });

      if (error) {
        console.error('Error setting preference:', error);
        throw error;
      }
      
      console.log(`Successfully set preference '${key}' for user:`, user.id);
    } catch (error) {
      console.error('Failed to set preference:', error);
      // Fallback to localStorage on error
      console.log(`🔄 Falling back to localStorage for: ${key}`);
      this.setToLocalStorage(key, value);
    }
  }

  async deletePreference(key: string): Promise<void> {
    try {
      const user = await this.ensureUser();
      
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('preference_key', key);

      if (error) {
        console.error('Error deleting preference:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to delete preference:', error);
      throw error;
    }
  }

  // Convenience methods for common preferences
  async getStarredAthros(): Promise<string[]> {
    return await this.getPreference('starred_athros') || [];
  }

  async setStarredAthros(athroIds: string[]): Promise<void> {
    await this.setPreference('starred_athros', athroIds);
  }

  async getCalendarSettings(): Promise<any> {
    return await this.getPreference('calendar_settings') || {};
  }

  async setCalendarSettings(settings: any): Promise<void> {
    await this.setPreference('calendar_settings', settings);
  }

  async getAthroConfidence(): Promise<Record<string, number>> {
    return await this.getPreference('athro_confidence') || {};
  }

  async setAthroConfidence(confidence: Record<string, number>): Promise<void> {
    await this.setPreference('athro_confidence', confidence);
  }

  async getSelectedAthros(): Promise<string[]> {
    return await this.getPreference('selected_athros') || [];
  }

  async setSelectedAthros(athroIds: string[]): Promise<void> {
    await this.setPreference('selected_athros', athroIds);
  }

  async getAthroPriorities(): Promise<string[]> {
    return await this.getPreference('athro_priorities') || [];
  }

  async setAthroPriorities(athroIds: string[]): Promise<void> {
    await this.setPreference('athro_priorities', athroIds);
  }

  async getSubjectConfidence(): Promise<Record<string, number>> {
    return await this.getPreference('subject_confidence') || {};
  }

  async setSubjectConfidence(confidence: Record<string, number>): Promise<void> {
    await this.setPreference('subject_confidence', confidence);
  }

  async getCalendarEvents(): Promise<any[]> {
    return await this.getPreference('calendar_events') || [];
  }

  async setCalendarEvents(events: any[]): Promise<void> {
    await this.setPreference('calendar_events', events);
  }

  async getStudentAvailability(): Promise<any> {
    return await this.getPreference('student_availability') || {};
  }

  async setStudentAvailability(availability: any): Promise<void> {
    await this.setPreference('student_availability', availability);
  }

  async getWeekType(): Promise<string> {
    return await this.getPreference('selected_week_type') || 'this';
  }

  async setWeekType(weekType: string): Promise<void> {
    await this.setPreference('selected_week_type', weekType);
  }

  async getIsFullDay(): Promise<boolean> {
    return await this.getPreference('is_full_day') || false;
  }

  async setIsFullDay(isFullDay: boolean): Promise<void> {
    await this.setPreference('is_full_day', isFullDay);
  }

  // Model preference management - returns stored preference or null for tier-based defaults
  async getModelPreference(): Promise<'gpt-4.1' | 'gpt-4o-mini' | null> {
    try {
      const preference = await this.getPreference('model_preference');
      return preference; // Return actual stored preference or null for tier-based defaults
    } catch (error) {
      console.error('Failed to get model preference:', error);
      return null; // Return null to allow tier-based defaults
    }
  }

  async setModelPreference(model: 'gpt-4.1' | 'gpt-4o-mini'): Promise<void> {
    try {
      await this.setPreference('model_preference', model);
      console.log(`✅ Model preference set to: ${model}`);
    } catch (error) {
      console.error('Failed to set model preference:', error);
      throw error;
    }
  }

  // Migration helper to move data from localStorage to Supabase
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const user = await this.ensureUser();
      console.log('Starting localStorage to Supabase migration for user:', user.id);

      // Collect all data from localStorage first (before any removals)
      const localStorageData = {
        starredAthros: JSON.parse(localStorage.getItem('starredAthros') || '[]'),
        selectedAthros: JSON.parse(localStorage.getItem('selectedAthros') || '[]'),
        athroConfidence: JSON.parse(localStorage.getItem('athroConfidence') || '{}'),
        athroPriorities: JSON.parse(localStorage.getItem('athroPriorities') || '[]'),
        subjectConfidence: JSON.parse(localStorage.getItem('subjectConfidence') || '{}'),
        calendarEvents: JSON.parse(localStorage.getItem('athroCalendarEvents') || '[]'),
        studentAvailability: JSON.parse(localStorage.getItem('studentAvailability') || '{}'),
        weekType: localStorage.getItem('selectedWeekType'),
        isFullDay: localStorage.getItem('isFullDay') === 'true'
      };

      console.log('Found localStorage data to migrate:', localStorageData);

      // Migrate all data to Supabase first (keeping localStorage intact as backup)
      const migrationResults = [];

      if (localStorageData.starredAthros.length > 0) {
        await this.setStarredAthros(localStorageData.starredAthros);
        migrationResults.push('starred_athros');
        console.log('Migrated starred athros to Supabase:', localStorageData.starredAthros);
      }

      if (localStorageData.selectedAthros.length > 0) {
        await this.setSelectedAthros(localStorageData.selectedAthros);
        migrationResults.push('selected_athros');
        console.log('Migrated selected athros to Supabase:', localStorageData.selectedAthros);
      }

      if (Object.keys(localStorageData.athroConfidence).length > 0) {
        await this.setAthroConfidence(localStorageData.athroConfidence);
        migrationResults.push('athro_confidence');
        console.log('Migrated athro confidence to Supabase:', localStorageData.athroConfidence);
      }

      if (localStorageData.athroPriorities.length > 0) {
        await this.setAthroPriorities(localStorageData.athroPriorities);
        migrationResults.push('athro_priorities');
        console.log('Migrated athro priorities to Supabase:', localStorageData.athroPriorities);
      }

      if (Object.keys(localStorageData.subjectConfidence).length > 0) {
        await this.setSubjectConfidence(localStorageData.subjectConfidence);
        migrationResults.push('subject_confidence');
        console.log('Migrated subject confidence to Supabase:', localStorageData.subjectConfidence);
      }

      if (localStorageData.calendarEvents.length > 0) {
        await this.setCalendarEvents(localStorageData.calendarEvents);
        migrationResults.push('calendar_events');
        console.log('Migrated calendar events to Supabase:', localStorageData.calendarEvents.length);
      }

      if (Object.keys(localStorageData.studentAvailability).length > 0) {
        await this.setStudentAvailability(localStorageData.studentAvailability);
        migrationResults.push('student_availability');
        console.log('Migrated student availability to Supabase:', localStorageData.studentAvailability);
      }

      if (localStorageData.weekType) {
        await this.setWeekType(localStorageData.weekType);
        migrationResults.push('week_type');
        console.log('Migrated week type to Supabase:', localStorageData.weekType);
      }

      if (localStorageData.isFullDay) {
        await this.setIsFullDay(true);
        migrationResults.push('is_full_day');
        console.log('Migrated full day setting to Supabase:', localStorageData.isFullDay);
        }

      console.log('localStorage to Supabase migration completed successfully for user:', user.id);
      console.log('Migrated items:', migrationResults);
      
      // NOTE: We no longer clear localStorage here - it will be cleared by the calling AuthContext
      // after confirming this migration succeeded
      
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
      // Don't clear localStorage on error - preserve user data!
      throw error;
    }
  }
}

export const userPreferencesService = new UserPreferencesService(); 