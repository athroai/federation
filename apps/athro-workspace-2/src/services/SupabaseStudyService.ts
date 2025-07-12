import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Flashcard, StudyNote, MindMap, FlashcardDifficulty, ReviewInterval, NoteReviewStatus } from '../types/study';
import { Resource } from '../types/resources';
import { v4 as uuidv4 } from 'uuid';
import { StudyHistory, StudyHistorySummary } from '../types/history';
import FolderService from './FolderService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Supabase-based service for managing study tools data including flashcards, notes, and mind maps
 * This replaces the localStorage-based StudyService to prevent data leakage between users
 */
export class SupabaseStudyService {
  private static instance: SupabaseStudyService;
  private currentUser: any = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private listeners: Record<string, Array<(data: any) => void>> = {};

  private constructor() {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUser = user;
        this.setupRealtimeSubscriptions();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          this.currentUser = session.user;
          this.setupRealtimeSubscriptions();
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.cleanup();
        }
      });
    } catch (error) {
      console.error('[SupabaseStudyService] Error initializing auth:', error);
    }
  }

  private setupRealtimeSubscriptions(): void {
    if (!this.currentUser || this.realtimeChannel) return;

    console.log('[SupabaseStudyService] Setting up real-time subscriptions');

    this.realtimeChannel = supabase
      .channel('study_data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flashcards',
          filter: `user_id=eq.${this.currentUser.id}`
        },
        (payload) => this.notifyListeners('flashcardsChanged', payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_notes',
          filter: `user_id=eq.${this.currentUser.id}`
        },
        (payload) => this.notifyListeners('notesChanged', payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mind_maps',
          filter: `user_id=eq.${this.currentUser.id}`
        },
        (payload) => this.notifyListeners('mindMapsChanged', payload)
      )
      .subscribe((status) => {
        console.log('[SupabaseStudyService] Real-time subscription status:', status);
      });
  }

  private cleanup(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
  }

  private notifyListeners(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  public static getInstance(): SupabaseStudyService {
    if (!SupabaseStudyService.instance) {
      SupabaseStudyService.instance = new SupabaseStudyService();
    }
    return SupabaseStudyService.instance;
  }

  // FLASHCARD METHODS
  public async getFlashcards(athroId?: string, sessionId?: string): Promise<Flashcard[]> {
    if (!this.currentUser) {
      return this.getFlashcardsFromLocalStorage();
    }

    try {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (athroId) {
        query = query.eq('athro_id', athroId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting flashcards:', error);
      return this.getFlashcardsFromLocalStorage();
    }
  }
  
  private getFlashcardsFromLocalStorage(): Flashcard[] {
    try {
      const flashcardsJSON = localStorage.getItem('athro_workspace_flashcards') || '[]';
      const loadedFlashcards = JSON.parse(flashcardsJSON);
      
      // Migrate old ISO string timestamps to numbers
      const migratedFlashcards = loadedFlashcards.map((flashcard: any) => {
        const migratedFlashcard = { ...flashcard };
        
        // Convert old ISO string timestamps to numbers
        if (typeof flashcard.createdAt === 'string') {
          migratedFlashcard.createdAt = new Date(flashcard.createdAt).getTime();
        }
        if (typeof flashcard.updatedAt === 'string') {
          migratedFlashcard.updatedAt = new Date(flashcard.updatedAt).getTime();
        }
        if (flashcard.lastReviewed && typeof flashcard.lastReviewed === 'string') {
          migratedFlashcard.lastReviewed = new Date(flashcard.lastReviewed).getTime();
        }
        if (flashcard.nextReview && typeof flashcard.nextReview === 'string') {
          migratedFlashcard.nextReview = new Date(flashcard.nextReview).getTime();
        }
        if (flashcard.deletedAt && typeof flashcard.deletedAt === 'string') {
          migratedFlashcard.deletedAt = new Date(flashcard.deletedAt).getTime();
        }
        
        return migratedFlashcard;
      });
      
      // Save migrated data back to localStorage if any migration occurred
      const needsMigration = loadedFlashcards.some((flashcard: any) => 
        typeof flashcard.createdAt === 'string' || 
        typeof flashcard.updatedAt === 'string' ||
        (flashcard.lastReviewed && typeof flashcard.lastReviewed === 'string') ||
        (flashcard.nextReview && typeof flashcard.nextReview === 'string') ||
        (flashcard.deletedAt && typeof flashcard.deletedAt === 'string')
      );
      
      if (needsMigration) {
        console.log('[SupabaseStudyService] Migrating flashcards timestamps from ISO strings to numbers');
        localStorage.setItem('athro_workspace_flashcards', JSON.stringify(migratedFlashcards));
      }
      
      return migratedFlashcards;
    } catch (error) {
      console.error('[SupabaseStudyService] Error loading flashcards from localStorage:', error);
      return [];
    }
  }

  public async createFlashcard(flashcard: any, sessionId?: string): Promise<Flashcard | null> {
    console.log('🗃️ [SupabaseStudyService] createFlashcard called with:', { flashcard, sessionId });
    
    if (!this.currentUser) {
      console.log('🗃️ [SupabaseStudyService] No user, using localStorage');
      return this.createFlashcardInLocalStorage(flashcard);
    }

    try {
      const insertData: any = {
        user_id: this.currentUser.id,
        athro_id: flashcard.athroId,
        subject: flashcard.subject,
        topic: flashcard.topic,
        front: flashcard.front,
        back: flashcard.back,
        difficulty: flashcard.difficulty || 'UNRATED',
        repetition_count: flashcard.repetitionCount || 0,
        last_reviewed: null,
        next_review: null,
        deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add session_id if provided
      if (sessionId) {
        insertData.session_id = sessionId;
      }

      console.log('🗃️ [SupabaseStudyService] Inserting data:', insertData);

      const { data, error } = await supabase
        .from('flashcards')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('🗃️ [SupabaseStudyService] Database error:', error);
        throw error;
      }

      console.log('🗃️ [SupabaseStudyService] Flashcard created successfully:', data);

      // 🚀 NEW: Track flashcard creation in insights
      try {
        const insightsModule = await import('../../../athro-dashboard/src/services/insightsService');
        const insightsService = insightsModule.insightsService;
        
        if (this.currentUser) {
          insightsService.setUser(this.currentUser);
          await insightsService.trackToolUsage({
            tool_type: 'flashcard',
            action: 'created',
            athro_id: flashcard.athroId,
            metadata: {
              front: flashcard.front,
              back: flashcard.back,
              subject: flashcard.subject,
              topic: flashcard.topic
            }
          });
          console.log('✅ Flashcard creation tracked in insights');
        }
      } catch (insightError) {
        console.error('❌ Failed to track flashcard creation:', insightError);
      }

      return data;
    } catch (error) {
      console.error('[SupabaseStudyService] Error creating flashcard:', error);
      return this.createFlashcardInLocalStorage(flashcard);
    }
  }
  
  private createFlashcardInLocalStorage(flashcard: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>): Flashcard {
    const now = Date.now();
    const newFlashcard: Flashcard = {
      ...flashcard,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    const flashcards = this.getFlashcardsFromLocalStorage();
    flashcards.unshift(newFlashcard);
    localStorage.setItem('athro_workspace_flashcards', JSON.stringify(flashcards));
    return newFlashcard;
  }

  public async updateFlashcard(id: string, updates: Partial<Flashcard>): Promise<Flashcard | null> {
    if (!this.currentUser) {
      return this.updateFlashcardInLocalStorage(id, updates);
    }

    try {
      // Map camelCase to snake_case for database
      const updateData: any = {};
      
      if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
      if (updates.lastReviewed !== undefined) updateData.last_reviewed = updates.lastReviewed ? new Date(updates.lastReviewed).toISOString() : null;
      if (updates.nextReview !== undefined) updateData.next_review = updates.nextReview ? new Date(updates.nextReview).toISOString() : null;
      if (updates.repetitionCount !== undefined) updateData.repetition_count = updates.repetitionCount;
      if (updates.reviewInterval !== undefined) updateData.review_interval = updates.reviewInterval;
      if (updates.front !== undefined) updateData.front = updates.front;
      if (updates.back !== undefined) updateData.back = updates.back;
      if (updates.topic !== undefined) updateData.topic = updates.topic;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.athroId !== undefined) updateData.athro_id = updates.athroId;
      if (updates.deleted !== undefined) updateData.deleted = updates.deleted;
      if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt ? new Date(updates.deletedAt).toISOString() : null;
      if (updates.saved !== undefined) updateData.saved = updates.saved;
      
      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      console.log('🗃️ [SupabaseStudyService] Updating flashcard with data:', updateData);

      const { data, error } = await supabase
        .from('flashcards')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('🗃️ [SupabaseStudyService] Database update error:', error);
        console.error('🗃️ [SupabaseStudyService] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('🗃️ [SupabaseStudyService] Flashcard updated successfully:', data);
      return data;
    } catch (error) {
      console.error('[SupabaseStudyService] Error updating flashcard:', error);
      return this.updateFlashcardInLocalStorage(id, updates);
    }
  }
  
  private updateFlashcardInLocalStorage(id: string, updates: Partial<Flashcard>): Flashcard | null {
    const flashcards = this.getFlashcardsFromLocalStorage();
    const index = flashcards.findIndex(f => f.id === id);
    
    if (index === -1) return null;
    
    flashcards[index] = { ...flashcards[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem('athro_workspace_flashcards', JSON.stringify(flashcards));
    return flashcards[index];
  }

  public async deleteFlashcard(id: string): Promise<boolean> {
    if (!this.currentUser) {
      return this.deleteFlashcardFromLocalStorage(id);
    }

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({ 
          deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[SupabaseStudyService] Error deleting flashcard:', error);
      return this.deleteFlashcardFromLocalStorage(id);
    }
  }
  
  private deleteFlashcardFromLocalStorage(id: string): boolean {
    const flashcards = this.getFlashcardsFromLocalStorage();
    const filtered = flashcards.filter(f => f.id !== id);
    localStorage.setItem('athro_workspace_flashcards', JSON.stringify(filtered));
    return true;
  }
  
  // NOTE METHODS
  public async getNotes(athroId?: string, sessionId?: string): Promise<StudyNote[]> {
    if (!this.currentUser) {
      return this.getNotesFromLocalStorage();
    }

    try {
      let query = supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (athroId) {
        query = query.eq('athro_id', athroId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting notes:', error);
      return this.getNotesFromLocalStorage();
    }
  }

  // Get only QuickNotes
  public async getQuickNotes(athroId?: string, sessionId?: string): Promise<StudyNote[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('[SupabaseStudyService] Getting QuickNotes for:', { athroId, sessionId, userId: this.currentUser.id });

      let query = supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('note_type', 'QUICK')
        .neq('deleted', true)
        .order('created_at', { ascending: false });

      if (athroId) {
        query = query.eq('athro_id', athroId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SupabaseStudyService] Error getting quick notes:', error);
        throw error;
      }
      console.log('[SupabaseStudyService] Retrieved QuickNotes:', data);
      return data || [];
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting quick notes:', error);
      throw error;
    }
  }

  // Get only FullNotes
  public async getFullNotes(athroId?: string, sessionId?: string): Promise<StudyNote[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('[SupabaseStudyService] Getting FullNotes for:', { athroId, sessionId, userId: this.currentUser.id });

      let query = supabase
        .from('study_notes')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('note_type', 'FULL')
        .neq('deleted', true)
        .order('created_at', { ascending: false });

      if (athroId) {
        query = query.eq('athro_id', athroId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[SupabaseStudyService] Error getting full notes:', error);
        throw error;
      }
      console.log('[SupabaseStudyService] Retrieved FullNotes:', data);
      return data || [];
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting full notes:', error);
      throw error;
    }
  }
  
  private getNotesFromLocalStorage(): StudyNote[] {
    try {
      const notesJSON = localStorage.getItem('athro_workspace_notes') || '[]';
      const loadedNotes = JSON.parse(notesJSON);
      
      // Migrate old ISO string timestamps to numbers and add noteType if missing
      const migratedNotes = loadedNotes.map((note: any) => {
        const migratedNote = { ...note };
        
        // Add noteType if missing (default to QUICK for backwards compatibility)
        if (!migratedNote.noteType) {
          migratedNote.noteType = 'QUICK';
        }
        
        // Convert old ISO string timestamps to numbers
        if (typeof note.createdAt === 'string') {
          migratedNote.createdAt = new Date(note.createdAt).getTime();
        }
        if (typeof note.updatedAt === 'string') {
          migratedNote.updatedAt = new Date(note.updatedAt).getTime();
        }
        if (note.lastReviewed && typeof note.lastReviewed === 'string') {
          migratedNote.lastReviewed = new Date(note.lastReviewed).getTime();
        }
        if (note.nextReview && typeof note.nextReview === 'string') {
          migratedNote.nextReview = new Date(note.nextReview).getTime();
        }
        
        return migratedNote;
      });
      
      // Save migrated data back to localStorage if any migration occurred
      const needsMigration = loadedNotes.some((note: any) => 
        !note.noteType ||
        typeof note.createdAt === 'string' || 
        typeof note.updatedAt === 'string' ||
        (note.lastReviewed && typeof note.lastReviewed === 'string') ||
        (note.nextReview && typeof note.nextReview === 'string')
      );
      
      if (needsMigration) {
        console.log('[SupabaseStudyService] Migrating notes timestamps and adding noteType field');
        localStorage.setItem('athro_workspace_notes', JSON.stringify(migratedNotes));
      }
      
      return migratedNotes;
    } catch (error) {
      console.error('[SupabaseStudyService] Error loading notes from localStorage:', error);
      return [];
    }
  }

  public async createNote(note: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>, sessionId?: string): Promise<StudyNote | null> {
    if (!this.currentUser) {
      return this.createNoteInLocalStorage(note);
    }

    try {
      const noteTypeFolder = note.noteType === 'QUICK' ? 'quicknotes' : 'fullnotes';
      const folderPath = FolderService.getDefaultSavePath(note.athroId, note.subject || 'Unknown', noteTypeFolder);

      // Map camelCase to snake_case for database
      const insertData: any = {
        user_id: this.currentUser.id,
        athro_id: note.athroId,
        subject: note.subject,
        topic: note.topic,
        content: note.content,
        tags: note.tags,
        note_type: note.noteType, // Add noteType field
        review_status: note.reviewStatus,
        folder_path: folderPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add session_id if provided
      if (sessionId) {
        insertData.session_id = sessionId;
      }

      console.log('[SupabaseStudyService] Attempting to insert note data:', insertData);

      const { data, error } = await supabase
        .from('study_notes')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[SupabaseStudyService] Supabase insert error details:', error);
        throw error;
      }
      console.log('[SupabaseStudyService] Note created successfully in Supabase:', data);

      // 🚀 NEW: Track note creation in insights
      try {
        const insightsModule = await import('../../../athro-dashboard/src/services/insightsService');
        const insightsService = insightsModule.insightsService;
        
        if (this.currentUser) {
          insightsService.setUser(this.currentUser);
          await insightsService.trackToolUsage({
            tool_type: 'note',
            action: 'created',
            athro_id: note.athroId,
            metadata: {
              subject: note.subject,
              topic: note.topic,
              content_length: note.content?.length || 0,
              note_type: note.noteType,
              tags: note.tags
            }
          });
          console.log('✅ Note creation tracked in insights');
        }
      } catch (insightError) {
        console.error('❌ Failed to track note creation:', insightError);
      }

      return data;
    } catch (error) {
      console.error('[SupabaseStudyService] Error creating note:', error);
      throw error; // Don't fall back to localStorage, throw the error so we can see what's wrong
    }
  }

  private createNoteInLocalStorage(note: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>): StudyNote {
    const now = Date.now();
    const newNote: StudyNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    const notes = this.getNotesFromLocalStorage();
    notes.unshift(newNote);
    localStorage.setItem('athro_workspace_notes', JSON.stringify(notes));
    return newNote;
  }

  public async updateNote(id: string, updates: Partial<StudyNote>): Promise<StudyNote | null> {
    if (!this.currentUser) {
      return this.updateNoteInLocalStorage(id, updates);
    }

    try {
      // Map camelCase to snake_case for database
      const updateData: any = {};
      
      if (updates.topic !== undefined) updateData.topic = updates.topic;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.noteType !== undefined) updateData.note_type = updates.noteType; // Add noteType field
      if (updates.reviewStatus !== undefined) updateData.review_status = updates.reviewStatus;
      if (updates.lastReviewed !== undefined) updateData.last_reviewed = updates.lastReviewed ? new Date(updates.lastReviewed).toISOString() : null;
      if (updates.nextReview !== undefined) updateData.next_review = updates.nextReview ? new Date(updates.nextReview).toISOString() : null;
      if (updates.reviewInterval !== undefined) updateData.review_interval = updates.reviewInterval;
      
      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('study_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[SupabaseStudyService] Error updating note:', error);
      return this.updateNoteInLocalStorage(id, updates);
    }
  }
  
  private updateNoteInLocalStorage(id: string, updates: Partial<StudyNote>): StudyNote | null {
    const notes = this.getNotesFromLocalStorage();
    const index = notes.findIndex(n => n.id === id);
    
    if (index === -1) return null;
    
    notes[index] = { ...notes[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem('athro_workspace_notes', JSON.stringify(notes));
    return notes[index];
  }

  public async deleteNote(id: string): Promise<boolean> {
    if (!this.currentUser) {
      return this.deleteNoteFromLocalStorage(id);
      }

    try {
      const { error } = await supabase
        .from('study_notes')
        .update({ 
          deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[SupabaseStudyService] Error deleting note:', error);
      return this.deleteNoteFromLocalStorage(id);
    }
  }

  private deleteNoteFromLocalStorage(id: string): boolean {
    try {
      const notes = this.getNotesFromLocalStorage();
      const filteredNotes = notes.filter(n => n.id !== id);
      localStorage.setItem('athro_workspace_notes', JSON.stringify(filteredNotes));
      return true;
    } catch (error) {
      console.error('[SupabaseStudyService] Error deleting note from localStorage:', error);
      return false;
    }
  }
  
  // MIND MAP METHODS
  public async getMindMaps(athroId?: string, sessionId?: string): Promise<MindMap[]> {
    if (!this.currentUser) {
      return this.getMindMapsFromLocalStorage();
    }

    try {
      console.log('[SupabaseStudyService] getMindMaps called with athroId:', athroId, 'sessionId:', sessionId);
      
      let query = supabase
        .from('mind_maps')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (athroId) {
        query = query.eq('athro_id', athroId);
        console.log('[SupabaseStudyService] Filtering by athro_id:', athroId);
      }
      if (sessionId) {
        query = query.eq('session_id', sessionId);
        console.log('[SupabaseStudyService] Filtering by session_id:', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('[SupabaseStudyService] Raw database query result:', data);
      console.log('[SupabaseStudyService] Found', (data || []).length, 'mind maps');
      
      // Convert snake_case back to camelCase for the frontend
      const convertedData = (data || []).map((item: any) => ({
        id: item.id,
        athroId: item.athro_id,
        subject: item.subject,
        topic: item.topic,
        rootNode: item.root_node,
        createdAt: new Date(item.created_at).getTime(),
        updatedAt: new Date(item.updated_at).getTime()
      }));
      
      console.log('[SupabaseStudyService] Converted mind maps:', convertedData);
      return convertedData;
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting mind maps:', error);
      return this.getMindMapsFromLocalStorage();
    }
  }
  
  private getMindMapsFromLocalStorage(): MindMap[] {
    try {
      const mapsJSON = localStorage.getItem('athro_workspace_mindmaps') || '[]';
      return JSON.parse(mapsJSON);
    } catch (error) {
      console.error('[SupabaseStudyService] Error loading mind maps from localStorage:', error);
      return [];
    }
  }
  
  public async createMindMap(mindMap: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>, sessionId?: string): Promise<MindMap | null> {
    if (!this.currentUser) {
      return this.createMindMapInLocalStorage(mindMap);
    }

    try {
      console.log('[SupabaseStudyService] Creating mind map with sessionId:', sessionId);
      
      const folderPath = FolderService.getDefaultSavePath(mindMap.athroId, mindMap.subject || 'Unknown', 'mindmaps');
      
      // Map camelCase to snake_case for database
      const insertData: any = {
        user_id: this.currentUser.id,
        athro_id: mindMap.athroId,
        subject: mindMap.subject,
        topic: mindMap.topic,
        root_node: mindMap.rootNode,
        folder_path: folderPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add session_id if provided
      if (sessionId) {
        insertData.session_id = sessionId;
        console.log('[SupabaseStudyService] Adding session_id to insert data:', sessionId);
      } else {
        console.log('[SupabaseStudyService] No sessionId provided, creating mind map without session');
      }

      const { data, error } = await supabase
        .from('mind_maps')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      // Convert snake_case back to camelCase for the frontend
      if (data) {
        const convertedData = {
          id: data.id,
          athroId: data.athro_id,
          subject: data.subject,
          topic: data.topic,
          rootNode: data.root_node,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime()
        };

        // 🚀 NEW: Track mind map creation in insights
        try {
          const insightsModule = await import('../../../athro-dashboard/src/services/insightsService');
          const insightsService = insightsModule.insightsService;
          
          if (this.currentUser) {
            insightsService.setUser(this.currentUser);
            await insightsService.trackToolUsage({
              tool_type: 'mind_map',
              action: 'created',
              athro_id: mindMap.athroId,
              metadata: {
                subject: mindMap.subject,
                topic: mindMap.topic,
                nodes: mindMap.rootNode ? Object.keys(mindMap.rootNode).length : 0
              }
            });
            console.log('✅ Mind map creation tracked in insights');
          }
        } catch (insightError) {
          console.error('❌ Failed to track mind map creation:', insightError);
        }

        return convertedData;
      }
      
      return null;
    } catch (error) {
      console.error('[SupabaseStudyService] Error creating mind map:', error);
      return this.createMindMapInLocalStorage(mindMap);
    }
  }

  private createMindMapInLocalStorage(mindMap: Omit<MindMap, 'id' | 'createdAt' | 'updatedAt'>): MindMap {
    const newMindMap: MindMap = {
      ...mindMap,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const mindMaps = this.getMindMapsFromLocalStorage();
    mindMaps.unshift(newMindMap);
    localStorage.setItem('athro_workspace_mindmaps', JSON.stringify(mindMaps));
    return newMindMap;
  }

  public async updateMindMap(id: string, updates: Partial<MindMap>): Promise<MindMap | null> {
    if (!this.currentUser) {
      return this.updateMindMapInLocalStorage(id, updates);
    }

    try {
      // Map camelCase to snake_case for database
      const updateData: any = {};
      
      if (updates.topic !== undefined) updateData.topic = updates.topic;
      if (updates.rootNode !== undefined) updateData.root_node = updates.rootNode;
      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.athroId !== undefined) updateData.athro_id = updates.athroId;
      
      // Always update the updated_at timestamp
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('mind_maps')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Convert snake_case back to camelCase for the frontend
      if (data) {
      return {
          id: data.id,
          athroId: data.athro_id,
          subject: data.subject,
          topic: data.topic,
          rootNode: data.root_node,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime()
      };
      }
      
      return null;
    } catch (error) {
      console.error('[SupabaseStudyService] Error updating mind map:', error);
      return this.updateMindMapInLocalStorage(id, updates);
    }
  }
  
  private updateMindMapInLocalStorage(id: string, updates: Partial<MindMap>): MindMap | null {
    const mindMaps = this.getMindMapsFromLocalStorage();
    const index = mindMaps.findIndex(m => m.id === id);
    
    if (index === -1) return null;
    
    mindMaps[index] = { ...mindMaps[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem('athro_workspace_mindmaps', JSON.stringify(mindMaps));
    return mindMaps[index];
  }

  public async deleteMindMap(id: string): Promise<boolean> {
    if (!this.currentUser) {
      return this.deleteMindMapFromLocalStorage(id);
    }

    try {
      const { error } = await supabase
        .from('mind_maps')
        .update({ 
          deleted: true, 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[SupabaseStudyService] Error deleting mind map:', error);
      return this.deleteMindMapFromLocalStorage(id);
    }
  }
  
  private deleteMindMapFromLocalStorage(id: string): boolean {
    try {
      const mindMaps = this.getMindMapsFromLocalStorage();
      const filteredMaps = mindMaps.filter(m => m.id !== id);
      localStorage.setItem('athro_workspace_mindmaps', JSON.stringify(filteredMaps));
      return true;
    } catch (error) {
      console.error('[SupabaseStudyService] Error deleting mind map from localStorage:', error);
      return false;
    }
  }

  // STUDY HISTORY METHODS
  public async getStudyHistory(): Promise<StudyHistory[]> {
    if (!this.currentUser) {
      return this.getStudyHistoryFromLocalStorage();
    }

    try {
      const { data, error } = await supabase
        .from('study_history')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting study history:', error);
      return this.getStudyHistoryFromLocalStorage();
    }
  }

  private getStudyHistoryFromLocalStorage(): StudyHistory[] {
    try {
      const historyJSON = localStorage.getItem('athro_workspace_study_history') || '[]';
      return JSON.parse(historyJSON);
    } catch (error) {
      console.error('[SupabaseStudyService] Error loading study history from localStorage:', error);
      return [];
    }
  }

  // EVENT LISTENERS
  public addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  public destroy(): void {
    this.cleanup();
    this.listeners = {};
  }
  
  // =================================================================
  // Resource Methods
  // =================================================================
  
  /**
   * Creates a new resource record after uploading its associated file to Supabase Storage.
   * This is the primary method for adding new resources.
   * @param file The file to upload.
   * @param resourceData Additional data for the resource.
   * @returns The newly created resource record from the database.
   */
  async createResource(
    file: File,
    resourceData: {
      sessionId: string;
      athroId: string;
      subject: string;
      topic: string;
      folderPath?: string;
    }
  ): Promise<Resource> {
    console.log('Creating resource for session:', resourceData.sessionId);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const filePath = `${user.id}/${resourceData.sessionId}/${uuidv4()}-${file.name}`;
      
      // Get default folder path if not provided
      const folderPath = resourceData.folderPath || 
        FolderService.getDefaultSavePath(resourceData.athroId, resourceData.subject, 'resources');
      
      // 1. Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('resources') // The name of your storage bucket
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file to storage:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded to storage at path:', filePath);

      // 2. Insert the resource metadata into the database
      const { data: newResource, error: insertError } = await supabase
        .from('resources')
        .insert({
          user_id: user.id,
          session_id: resourceData.sessionId,
          athro_id: resourceData.athroId,
          subject: resourceData.subject,
          topic: resourceData.topic,
          resource_type: file.type,
          resource_path: filePath, // Store the path, not the content
          folder_path: folderPath,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting resource metadata:', insertError);
        // Attempt to clean up the orphaned file in storage
        await supabase.storage.from('resources').remove([filePath]);
        throw insertError;
      }
      
      console.log('Resource metadata saved to database:', newResource);
      
      const resourceToReturn = {
        id: newResource.id,
        athroId: newResource.athro_id,
        subject: newResource.subject,
        topic: newResource.topic,
        resourceType: newResource.resource_type,
        resourcePath: newResource.resource_path,
        folderPath: newResource.folder_path,
        createdAt: newResource.created_at,
        updatedAt: newResource.updated_at,
      };

      // 🚀 NEW: Track resource creation in insights
      try {
        const insightsModule = await import('../../../athro-dashboard/src/services/insightsService');
        const insightsService = insightsModule.insightsService;
        
        if (user) {
          insightsService.setUser(user);
          await insightsService.trackToolUsage({
            tool_type: 'resource',
            action: 'created',
            athro_id: resourceData.athroId,
            metadata: {
              subject: resourceData.subject,
              topic: resourceData.topic,
              file_type: file.type,
              file_name: file.name,
              file_size: file.size
            }
          });
          console.log('✅ Resource creation tracked in insights');
        }
      } catch (insightError) {
        console.error('❌ Failed to track resource creation:', insightError);
      }
      
      // Return data conforming to the Resource type
      return resourceToReturn;

    } catch (error) {
      console.error('Error in createResource:', error);
      throw error;
    }
  }
  
  /**
   * Retrieves all resources for a given session.
   */
  async getResources(sessionId: string, athroId: string): Promise<Resource[]> {
    console.log('Getting resources for sessionId:', sessionId, 'athroId:', athroId);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .eq('athro_id', athroId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('Retrieved resources:', data);
      
      return (data || []).map(r => ({
        id: r.id,
        athroId: r.athro_id,
        subject: r.subject,
        topic: r.topic,
        resourceType: r.resource_type,
        resourcePath: r.resource_path,
        folderPath: r.folder_path,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  /**
   * Retrieves ALL resources for a given athroId (central database concept)
   * This is for the new folder structure system where resources are shared across sessions
   */
  async getAllResourcesForAthro(athroId: string, folderPath?: string): Promise<Resource[]> {
    console.log('Getting ALL resources for athroId:', athroId, 'folderPath:', folderPath);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('resources')
        .select('*')
        .eq('user_id', user.id)
        .eq('athro_id', athroId);

      // Filter by folder path if provided
      if (folderPath) {
        query = query.eq('folder_path', folderPath);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Retrieved ALL resources for athro:', data);
      
      return (data || []).map(r => ({
        id: r.id,
        athroId: r.athro_id,
        subject: r.subject,
        topic: r.topic,
        resourceType: r.resource_type,
        resourcePath: r.resource_path,
        folderPath: r.folder_path,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (error) {
      console.error('Error getting all resources for athro:', error);
      throw error;
    }
  }
  
  /**
   * Deletes a resource record from the database and its associated file from storage.
   */
  async deleteResource(id: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // 1. Get the resource path before deleting the record
      const { data: resource, error: fetchError } = await supabase
        .from('resources')
        .select('resource_path')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !resource) {
        console.error('Error fetching resource for deletion or resource not found:', fetchError);
        // If the record is already gone, we can't get the path, but we can proceed.
      }

      // 2. Delete the database record
      const { error: deleteDbError } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteDbError) {
        console.error('Error deleting resource from database:', deleteDbError);
        throw deleteDbError;
      }
      
      // 3. If we have the path, delete the file from storage
      if (resource?.resource_path) {
        const { error: deleteStorageError } = await supabase.storage
          .from('resources')
          .remove([resource.resource_path]);
          
        if (deleteStorageError) {
          console.error('Error deleting file from storage, but DB record was deleted:', deleteStorageError);
          // Don't throw, as the primary goal (deleting the record) was achieved.
        }
      }

    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }
  
  /**
   * Gets the public URL for a resource file
   */
  async getResourceFileUrl(resourcePath: string): Promise<string> {
    try {
      const { data } = supabase.storage
        .from('resources')
        .getPublicUrl(resourcePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting resource file URL:', error);
      throw error;
    }
  }

  /**
   * Retrieves a single resource by its ID.
   */
  async getResourceById(id: string): Promise<Resource | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        athroId: data.athro_id,
        subject: data.subject,
        topic: data.topic,
        resourceType: data.resource_type,
        resourcePath: data.resource_path,
        folderPath: data.folder_path,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching resource by ID:', error);
      return null;
    }
  }
  
  // =================================================================
  // Study History and Session Management
  async saveStudyHistory(data: Omit<StudyHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudyHistory> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const newHistory = {
        id: uuidv4(),
        user_id: user.id,
        athro_id: data.athroId,
        title: data.title,
        messages: data.messages,
        resources: data.resources,
        mind_maps: data.mindMaps,
        notes: data.notes,
        flashcards: data.flashcards,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('study_history')
        .insert(newHistory)
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: result.id,
        athroId: result.athro_id,
        title: result.title,
        messages: result.messages || [],
        resources: result.resources || [],
        mindMaps: result.mind_maps || [],
        notes: result.notes || [],
        flashcards: result.flashcards || [],
        createdAt: new Date(result.created_at).getTime(),
        updatedAt: new Date(result.updated_at).getTime()
      };
    } catch (error) {
      console.error('Error saving study history:', error);
      throw error;
    }
  }
  
  async updateStudyHistory(id: string, data: Partial<Omit<StudyHistory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<StudyHistory | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.athroId !== undefined) updateData.athro_id = data.athroId;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.messages !== undefined) updateData.messages = data.messages;
      if (data.resources !== undefined) updateData.resources = data.resources;
      if (data.mindMaps !== undefined) updateData.mind_maps = data.mindMaps;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.flashcards !== undefined) updateData.flashcards = data.flashcards;

      const { data: result, error } = await supabase
        .from('study_history')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: result.id,
        athroId: result.athro_id,
        title: result.title,
        messages: result.messages || [],
        resources: result.resources || [],
        mindMaps: result.mind_maps || [],
        notes: result.notes || [],
        flashcards: result.flashcards || [],
        createdAt: new Date(result.created_at).getTime(),
        updatedAt: new Date(result.updated_at).getTime()
      };
    } catch (error) {
      console.error('Error updating study history:', error);
      throw error;
    }
  }
  
  async deleteStudyHistory(id: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('study_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting study history:', error);
      return false;
    }
  }

  async getStudyHistoryById(id: string): Promise<StudyHistory | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('study_history')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        athroId: data.athro_id,
        title: data.title,
        messages: data.messages || [],
        resources: data.resources || [],
        mindMaps: data.mind_maps || [],
        notes: data.notes || [],
        flashcards: data.flashcards || [],
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime()
      };
    } catch (error) {
      console.error('Error fetching study history by ID:', error);
      return null;
    }
  }

  // Study Session methods
  async createStudySession(data: {
    athroId: string;
    title: string;
    messages: any[];
    resources: string[];
    mindMaps: string[];
    notes: string[];
    flashcards: string[];
  }): Promise<any> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const newSession = {
        user_id: user.id,
        athro_id: data.athroId,
        title: data.title,
        messages: data.messages,
        resources: data.resources,
        mind_maps: data.mindMaps,
        notes: data.notes,
        flashcards: data.flashcards,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('study_history')
        .insert(newSession)
        .select()
        .single();

      if (error) {
        console.error('Error creating study session:', error);
        throw error;
      }
      
      console.log('[SupabaseStudyService] Created study session:', result);
      return result;
    } catch (error) {
      console.error('Error creating study session:', error);
      throw error;
    }
  }

  /**
   * Delete a study session and all associated study tools
   */
  async deleteStudySession(sessionId: string): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Delete all associated study tools first
      await Promise.all([
        supabase.from('flashcards').delete().eq('session_id', sessionId),
        supabase.from('study_notes').delete().eq('session_id', sessionId),
        supabase.from('mind_maps').delete().eq('session_id', sessionId),
        supabase.from('resources').delete().eq('session_id', sessionId)
      ]);

      // Then delete the session
      const { error } = await supabase
        .from('study_history')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting study session:', error);
      throw error;
    }
  }

  /**
   * Update an existing study session with new data
   */
  async updateStudySession(sessionId: string, updates: {
    messages?: any[];
    title?: string;
    updatedAt?: number;
  }): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('study_history')
        .update({
          messages: updates.messages,
          title: updates.title,
          updated_at: updates.updatedAt ? new Date(updates.updatedAt).toISOString() : new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating study session:', error);
      throw error;
    }
  }

  /**
   * Get all study sessions for the current user, optionally filtered by athroId
   */
  async getStudySessions(athroId?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('study_history')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (athroId) {
        query = query.eq('athro_id', athroId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      return [];
    }
  }

  // Calculates the next review date based on spaced repetition algorithm or custom interval
  calculateNextReview(difficulty: FlashcardDifficulty | null | undefined, repetitionCount: number, customInterval?: ReviewInterval): number {
    const now = Date.now();
    let daysToAdd = 1;
    
    // If a custom interval is specified, use that instead of the algorithm
    if (customInterval) {
      switch (customInterval) {
        case '1_DAY':
          daysToAdd = 1;
          break;
        case '2_DAYS':
          daysToAdd = 2;
          break;
        case '1_WEEK':
          daysToAdd = 7;
          break;
        case '1_MONTH':
          daysToAdd = 30;
          break;
      }
    } else {
      // Simple spaced repetition algorithm
      switch (difficulty) {
        case 'EASY':
          daysToAdd = Math.pow(2, repetitionCount) * 2; // Longer intervals for easy cards
          break;
        case 'MEDIUM':
          daysToAdd = Math.pow(2, repetitionCount); // Standard interval
          break;
        case 'HARD':
          daysToAdd = Math.max(1, Math.pow(2, repetitionCount) / 2); // Shorter intervals for hard cards
          break;
        case 'FINISHED':
          daysToAdd = 365; // Finished cards don't need review for a year
          break;
        case 'UNRATED':
          daysToAdd = 1; // Review unrated cards the next day
          break;
        case null:
        case undefined:
        default:
          daysToAdd = 1; // Treat null/undefined as needing immediate review
          break;
      }
      
      // Cap at 60 days
      daysToAdd = Math.min(daysToAdd, 60);
    }
    
    return now + (daysToAdd * 24 * 60 * 60 * 1000);
  }

  public async getMindMapById(id: string): Promise<MindMap | null> {
    if (!this.currentUser) {
      return this.getMindMapByIdFromLocalStorage(id);
    }

    try {
      const { data, error } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.currentUser.id)
        .single();

      if (error) throw error;
      
      // Convert snake_case back to camelCase for the frontend
      if (data) {
        return {
          id: data.id,
          athroId: data.athro_id,
          subject: data.subject,
          topic: data.topic,
          rootNode: data.root_node,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: new Date(data.updated_at).getTime()
        };
      }
      
      return null;
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting mind map by id:', error);
      return this.getMindMapByIdFromLocalStorage(id);
    }
  }

  private getMindMapByIdFromLocalStorage(id: string): MindMap | null {
    try {
      const mindMaps = this.getMindMapsFromLocalStorage();
      return mindMaps.find(m => m.id === id) || null;
    } catch (error) {
      console.error('[SupabaseStudyService] Error getting mind map by id from localStorage:', error);
      return null;
    }
  }
}

export default SupabaseStudyService.getInstance(); 