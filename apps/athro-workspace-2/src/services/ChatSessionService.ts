import { ChatMessage } from './openai';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ChatSession {
  id: string;
  athroId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export class ChatSessionService {
  private storagePrefix = 'athro_chat_session_';
  private currentUserId: string | null = null;
  
  /**
   * Get the current user ID for user-specific storage
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      // Check cached user ID first
      if (this.currentUserId) {
        return this.currentUserId;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUserId = user.id;
        return user.id;
      }
      
      // Return null if no user is logged in - we require authentication for persistence
      return null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }
  
  /**
   * Get a user-specific localStorage key (fallback only)
   */
  private async getUserSpecificKey(athroId: string, suffix: string = ''): Promise<string> {
    const userId = this.currentUserId || 'anonymous';
    return `${this.storagePrefix}${userId}_${athroId}${suffix}`;
  }

  /**
   * Migrate localStorage session to Supabase for authenticated users
   */
  private async migrateLocalStorageToSupabase(athroId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) return; // Can't migrate without user authentication

    try {
      // Check if we have a localStorage session
      const localKey = await this.getUserSpecificKey(athroId);
      const localSessionData = localStorage.getItem(localKey);
      
      if (!localSessionData) return; // No local session to migrate

      const localSession: ChatSession = JSON.parse(localSessionData);
      
      // Check if this session already exists in Supabase
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('session_id')
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('session_id', localSession.id)
        .single();

      if (existingSession) {
        // Session already exists in Supabase, remove localStorage version
        localStorage.removeItem(localKey);
        console.log(`[ChatSessionService] Removed migrated localStorage session for ${athroId}`);
        return;
      }

      // Migrate the session to Supabase
      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: localSession.id,
          user_id: userId,
          athro_id: athroId,
          messages: localSession.messages,
          is_active: localSession.isActive,
          created_at: new Date(localSession.createdAt).toISOString(),
          updated_at: new Date(localSession.updatedAt).toISOString()
        });

      if (error) {
        console.error('[ChatSessionService] Error migrating session to Supabase:', error);
        return;
      }

      // Remove the localStorage version after successful migration
      localStorage.removeItem(localKey);
      console.log(`[ChatSessionService] Successfully migrated session ${localSession.id} to Supabase`);

    } catch (error) {
      console.error('[ChatSessionService] Error during migration:', error);
    }
  }
  
  /**
   * Get the active chat session for a specific Athro
   */
  async getActiveSession(athroId: string): Promise<ChatSession | null> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.getActiveSessionFromLocalStorage(athroId);
    }

    try {
      // Try to migrate any localStorage sessions first
      await this.migrateLocalStorageToSupabase(athroId);

      // Get active session from Supabase
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          console.log(`[ChatSessionService] No active session found for ${athroId}`);
          return null;
        }
        console.error('[ChatSessionService] Error getting active session from Supabase:', error);
        // Fallback to localStorage
        return this.getActiveSessionFromLocalStorage(athroId);
      }

      // Convert database format to ChatSession format
      const session: ChatSession = {
        id: data.session_id,
        athroId: data.athro_id,
        messages: data.messages || [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
        isActive: data.is_active
      };

      console.log(`[ChatSessionService] Retrieved active session ${session.id} for ${athroId} from Supabase`);
      return session;

    } catch (error) {
      console.error('[ChatSessionService] Error getting active session:', error);
      // Fallback to localStorage
      return this.getActiveSessionFromLocalStorage(athroId);
    }
  }

  /**
   * Fallback method to get session from localStorage
   */
  private async getActiveSessionFromLocalStorage(athroId: string): Promise<ChatSession | null> {
    try {
      const sessionKey = await this.getUserSpecificKey(athroId);
      const sessionData = localStorage.getItem(sessionKey);
      
      if (!sessionData) {
        return null;
      }
      
      const session: ChatSession = JSON.parse(sessionData);
      return session.isActive ? session : null;
    } catch (error) {
      console.error('Error getting active chat session from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Save or update the active chat session for an Athro
   */
  async saveActiveSession(athroId: string, messages: ChatMessage[]): Promise<ChatSession> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.saveActiveSessionToLocalStorage(athroId, messages);
    }

    try {
      const existingSession = await this.getActiveSession(athroId);
      const sessionId = existingSession?.id || uuidv4();
      const now = new Date();
      
      const session: ChatSession = {
        id: sessionId,
        athroId,
        messages,
        createdAt: existingSession?.createdAt || now.getTime(),
        updatedAt: now.getTime(),
        isActive: true
      };

      // Save to Supabase with upsert
      const { error } = await supabase
        .from('chat_sessions')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          athro_id: athroId,
          messages: messages,
          is_active: true,
          created_at: existingSession ? new Date(existingSession.createdAt).toISOString() : now.toISOString(),
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id,athro_id,session_id'
        });

      if (error) {
        console.error('[ChatSessionService] Error saving session to Supabase:', error);
        // Fallback to localStorage
        return this.saveActiveSessionToLocalStorage(athroId, messages);
      }

      console.log(`[ChatSessionService] Saved session ${sessionId} for ${athroId} to Supabase`);
      return session;

    } catch (error) {
      console.error('[ChatSessionService] Error saving active session:', error);
      // Fallback to localStorage
      return this.saveActiveSessionToLocalStorage(athroId, messages);
    }
  }

  /**
   * Fallback method to save session to localStorage
   */
  private async saveActiveSessionToLocalStorage(athroId: string, messages: ChatMessage[]): Promise<ChatSession> {
    try {
      const sessionKey = await this.getUserSpecificKey(athroId);
      const existingSession = await this.getActiveSessionFromLocalStorage(athroId);
      
      const session: ChatSession = {
        id: existingSession?.id || uuidv4(),
        athroId,
        messages,
        createdAt: existingSession?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isActive: true
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(session));
      console.log(`[ChatSessionService] Saved session ${session.id} for ${athroId} to localStorage (fallback)`);
      return session;
    } catch (error) {
      console.error('Error saving active chat session to localStorage:', error);
      throw error;
    }
  }
  
  /**
   * Archive the current session (mark as inactive) and create a new one
   * This is called when "Save Session" is pressed
   */
  async archiveAndCreateNewSession(athroId: string, messages: ChatMessage[]): Promise<ChatSession> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.archiveAndCreateNewSessionInLocalStorage(athroId, messages);
    }

    try {
      // Get existing session
      const existingSession = await this.getActiveSession(athroId);
      
      if (existingSession && existingSession.messages.length > 0) {
        // Archive the existing session in Supabase
        const { error: archiveError } = await supabase
          .from('chat_sessions')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('athro_id', athroId)
          .eq('session_id', existingSession.id);

        if (archiveError) {
          console.error('[ChatSessionService] Error archiving session in Supabase:', archiveError);
        } else {
          console.log(`[ChatSessionService] Archived session ${existingSession.id} for ${athroId}`);
        }
      }
      
      // Create a new active session
      const newSessionId = uuidv4();
      const now = new Date();
      
      const newSession: ChatSession = {
        id: newSessionId,
        athroId,
        messages: [],
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        isActive: true
      };

      // Insert new session to Supabase
      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: newSessionId,
          user_id: userId,
          athro_id: athroId,
          messages: [],
          is_active: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });

      if (error) {
        console.error('[ChatSessionService] Error creating new session in Supabase:', error);
        // Fallback to localStorage
        return this.archiveAndCreateNewSessionInLocalStorage(athroId, messages);
      }

      console.log(`[ChatSessionService] Created new session ${newSessionId} for ${athroId}`);
      return newSession;

    } catch (error) {
      console.error('[ChatSessionService] Error archiving and creating new session:', error);
      // Fallback to localStorage
      return this.archiveAndCreateNewSessionInLocalStorage(athroId, messages);
    }
  }

  /**
   * Fallback method for localStorage archiving
   */
  private async archiveAndCreateNewSessionInLocalStorage(athroId: string, messages: ChatMessage[]): Promise<ChatSession> {
    try {
      // Archive the current session
      const sessionKey = await this.getUserSpecificKey(athroId);
      const existingSession = await this.getActiveSessionFromLocalStorage(athroId);
      
      if (existingSession) {
        // Mark the existing session as inactive
        const archivedSession: ChatSession = {
          ...existingSession,
          isActive: false,
          updatedAt: Date.now()
        };
        
        // Save the archived session with a different key
        const archivedKey = await this.getUserSpecificKey(athroId, `_archived_${existingSession.id}`);
        localStorage.setItem(archivedKey, JSON.stringify(archivedSession));
      }
      
      // Create a new active session
      const newSession: ChatSession = {
        id: uuidv4(),
        athroId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(newSession));
      return newSession;
    } catch (error) {
      console.error('Error archiving and creating new session in localStorage:', error);
      throw error;
    }
  }
  
  /**
   * Delete the current session and create a new one
   * This is called when "Delete Session" is pressed
   */
  async deleteAndCreateNewSession(athroId: string): Promise<ChatSession> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.deleteAndCreateNewSessionInLocalStorage(athroId);
    }

    try {
      // Delete the current active session from Supabase
      const { error: deleteError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('is_active', true);

      if (deleteError) {
        console.error('[ChatSessionService] Error deleting session from Supabase:', deleteError);
      }
      
      // Create a new active session
      const newSessionId = uuidv4();
      const now = new Date();
      
      const newSession: ChatSession = {
        id: newSessionId,
        athroId,
        messages: [],
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        isActive: true
      };

      // Insert new session to Supabase
      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: newSessionId,
          user_id: userId,
          athro_id: athroId,
          messages: [],
          is_active: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        });

      if (error) {
        console.error('[ChatSessionService] Error creating new session after delete:', error);
        // Fallback to localStorage
        return this.deleteAndCreateNewSessionInLocalStorage(athroId);
      }

      console.log(`[ChatSessionService] Deleted old session and created new session ${newSessionId} for ${athroId}`);
      return newSession;

    } catch (error) {
      console.error('[ChatSessionService] Error deleting and creating new session:', error);
      // Fallback to localStorage
      return this.deleteAndCreateNewSessionInLocalStorage(athroId);
    }
  }

  /**
   * Fallback method for localStorage deletion
   */
  private async deleteAndCreateNewSessionInLocalStorage(athroId: string): Promise<ChatSession> {
    try {
      const sessionKey = await this.getUserSpecificKey(athroId);
      
      // Remove the current session
      localStorage.removeItem(sessionKey);
      
      // Create a new active session
      const newSession: ChatSession = {
        id: uuidv4(),
        athroId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true
      };
      
      localStorage.setItem(sessionKey, JSON.stringify(newSession));
      return newSession;
    } catch (error) {
      console.error('Error deleting and creating new session in localStorage:', error);
      throw error;
    }
  }
  
  /**
   * Get all archived sessions for an Athro
   */
  async getArchivedSessions(athroId: string): Promise<ChatSession[]> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.getArchivedSessionsFromLocalStorage(athroId);
    }

    try {
      // Get archived sessions from Supabase
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('is_active', false)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ChatSessionService] Error getting archived sessions from Supabase:', error);
        // Fallback to localStorage
        return this.getArchivedSessionsFromLocalStorage(athroId);
      }

      // Convert database format to ChatSession format
      const sessions: ChatSession[] = (data || []).map(session => ({
        id: session.session_id,
        athroId: session.athro_id,
        messages: session.messages || [],
        createdAt: new Date(session.created_at).getTime(),
        updatedAt: new Date(session.updated_at).getTime(),
        isActive: session.is_active
      }));

      console.log(`[ChatSessionService] Retrieved ${sessions.length} archived sessions for ${athroId} from Supabase`);
      return sessions;

    } catch (error) {
      console.error('[ChatSessionService] Error getting archived sessions:', error);
      // Fallback to localStorage
      return this.getArchivedSessionsFromLocalStorage(athroId);
    }
  }

  /**
   * Fallback method to get archived sessions from localStorage
   */
  private async getArchivedSessionsFromLocalStorage(athroId: string): Promise<ChatSession[]> {
    try {
      const sessions: ChatSession[] = [];
      const userId = this.currentUserId || 'anonymous';
      const prefix = `${this.storagePrefix}${userId}_${athroId}_archived_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const sessionData = localStorage.getItem(key);
            if (sessionData) {
              const session: ChatSession = JSON.parse(sessionData);
              sessions.push(session);
            }
          } catch (parseError) {
            console.warn('Error parsing archived session:', parseError);
          }
        }
      }
      
      // Sort by updatedAt descending (most recent first)
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error getting archived sessions from localStorage:', error);
      return [];
    }
  }

  /**
   * Save session immediately (for critical moments like page unload)
   */
  async saveActiveSessionImmediate(athroId: string, messages: ChatMessage[]): Promise<void> {
    try {
      await this.saveActiveSession(athroId, messages);
      console.log(`[ChatSessionService] Immediately saved ${messages.length} messages for athro: ${athroId}`);
    } catch (error) {
      console.error('Error immediately saving chat session:', error);
      throw error;
    }
  }

  /**
   * Clear user-specific cache (called on logout)
   */
  clearUserCache() {
    this.currentUserId = null;
    console.log('[ChatSessionService] Cleared user cache');
  }

  /**
   * Delete an archived session
   */
  async deleteArchivedSession(athroId: string, sessionId: string): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.deleteArchivedSessionFromLocalStorage(athroId, sessionId);
    }

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('session_id', sessionId)
        .eq('is_active', false);

      if (error) {
        console.error('[ChatSessionService] Error deleting archived session from Supabase:', error);
        return this.deleteArchivedSessionFromLocalStorage(athroId, sessionId);
      }

      console.log(`[ChatSessionService] Deleted archived session ${sessionId} for ${athroId}`);
      return true;

    } catch (error) {
      console.error('[ChatSessionService] Error deleting archived session:', error);
      return false;
    }
  }

  /**
   * Fallback method to delete archived session from localStorage
   */
  private async deleteArchivedSessionFromLocalStorage(athroId: string, sessionId: string): Promise<boolean> {
    try {
      const archivedKey = await this.getUserSpecificKey(athroId, `_archived_${sessionId}`);
      localStorage.removeItem(archivedKey);
      return true;
    } catch (error) {
      console.error('Error deleting archived session from localStorage:', error);
      return false;
    }
  }

  /**
   * Clear all sessions for an Athro (both active and archived)
   */
  async clearAllSessions(athroId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.clearAllSessionsFromLocalStorage(athroId);
    }

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', userId)
        .eq('athro_id', athroId);

      if (error) {
        console.error('[ChatSessionService] Error clearing all sessions from Supabase:', error);
        return this.clearAllSessionsFromLocalStorage(athroId);
      }

      console.log(`[ChatSessionService] Cleared all sessions for ${athroId}`);

    } catch (error) {
      console.error('[ChatSessionService] Error clearing all sessions:', error);
      return this.clearAllSessionsFromLocalStorage(athroId);
    }
  }

  /**
   * Fallback method to clear all sessions from localStorage
   */
  private async clearAllSessionsFromLocalStorage(athroId: string): Promise<void> {
    try {
      const userId = this.currentUserId || 'anonymous';
      const sessionKey = await this.getUserSpecificKey(athroId);
      const prefix = `${this.storagePrefix}${userId}_${athroId}`;
      
      // Remove all keys that match this athro
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[ChatSessionService] Cleared ${keysToRemove.length} localStorage sessions for ${athroId}`);
    } catch (error) {
      console.error('[ChatSessionService] Error clearing sessions from localStorage:', error);
    }
  }

  /**
   * Load an archived session as the active session
   */
  async loadArchivedSession(athroId: string, sessionId: string): Promise<ChatSession | null> {
    const userId = await this.getCurrentUserId();
    
    if (!userId) {
      // Fallback to localStorage for unauthenticated users
      return this.loadArchivedSessionFromLocalStorage(athroId, sessionId);
    }

    try {
      // Get the archived session
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('session_id', sessionId)
        .eq('is_active', false)
        .single();

      if (error) {
        console.error('[ChatSessionService] Error loading archived session from Supabase:', error);
        return this.loadArchivedSessionFromLocalStorage(athroId, sessionId);
      }

      // First, archive any current active session
      await this.archiveAndCreateNewSession(athroId, []);

      // Make this session active
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('athro_id', athroId)
        .eq('session_id', sessionId);

      if (updateError) {
        console.error('[ChatSessionService] Error activating archived session:', updateError);
        return null;
      }

      // Convert to ChatSession format
      const session: ChatSession = {
        id: data.session_id,
        athroId: data.athro_id,
        messages: data.messages || [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: Date.now(), // Use current time as it's just been updated
        isActive: true
      };

      console.log(`[ChatSessionService] Loaded archived session ${sessionId} as active for ${athroId}`);
      return session;

    } catch (error) {
      console.error('[ChatSessionService] Error loading archived session:', error);
      return this.loadArchivedSessionFromLocalStorage(athroId, sessionId);
    }
  }

  /**
   * Fallback method to load archived session from localStorage
   */
  private async loadArchivedSessionFromLocalStorage(athroId: string, sessionId: string): Promise<ChatSession | null> {
    try {
      const archivedKey = await this.getUserSpecificKey(athroId, `_archived_${sessionId}`);
      const sessionData = localStorage.getItem(archivedKey);
      
      if (!sessionData) {
        return null;
      }
      
      const archivedSession: ChatSession = JSON.parse(sessionData);
      
      // Archive current active session first
      await this.archiveAndCreateNewSessionInLocalStorage(athroId, []);
      
      // Make the archived session active
      const activeSession: ChatSession = {
        ...archivedSession,
        isActive: true,
        updatedAt: Date.now()
      };
      
      // Save as active session
      const sessionKey = await this.getUserSpecificKey(athroId);
      localStorage.setItem(sessionKey, JSON.stringify(activeSession));
      
      // Remove from archived storage
      localStorage.removeItem(archivedKey);
      
      return activeSession;
    } catch (error) {
      console.error('Error loading archived session from localStorage:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new ChatSessionService(); 