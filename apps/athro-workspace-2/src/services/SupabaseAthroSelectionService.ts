import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { n8nEventService, EventNames } from './N8nEventService';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

type ConfidenceLevels = Record<string, ConfidenceLevel>;

interface AthroSelection {
  id: string;
  user_id: string;
  athro_id: string;
  selected: boolean;
  created_at: string;
  updated_at: string;
}

interface AthroConfidenceLevel {
  id: string;
  user_id: string;
  athro_id: string;
  confidence_level: ConfidenceLevel;
  created_at: string;
  updated_at: string;
}

class SupabaseAthroSelectionService {
  private static instance: SupabaseAthroSelectionService;
  private selectedAthros: string[] = [];
  private confidenceLevels: ConfidenceLevels = {};
  private listeners: Record<string, Array<(data: any) => void>> = {};
  private unsubscribers: Array<() => void> = [];
  private realtimeChannel: RealtimeChannel | null = null;
  private currentUser: any = null;

  private constructor() {
    this.initializeAuth();
    this.setupEventSubscriptions();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.currentUser = user;
        await this.loadFromDatabase();
        this.setupRealtimeSubscriptions();
      } else {
        // Handle anonymous user with localStorage fallback
        this.loadFromLocalStorageFallback();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          this.currentUser = session.user;
          await this.migrateLocalStorageToDatabase();
          await this.loadFromDatabase();
          this.setupRealtimeSubscriptions();
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.cleanup();
          this.loadFromLocalStorageFallback();
        }
      });
    } catch (error) {
      console.error('[SupabaseAthroSelectionService] Error initializing auth:', error);
      this.loadFromLocalStorageFallback();
    }
  }

  private async loadFromDatabase(): Promise<void> {
    if (!this.currentUser) return;

    try {
      console.log('[SupabaseAthroSelectionService] Loading data from database');

      // Load selections
      const { data: selections, error: selectionsError } = await supabase
        .from('athro_selections')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('selected', true);

      if (selectionsError) {
        console.error('Error loading athro selections:', selectionsError);
      } else {
        this.selectedAthros = selections?.map(s => s.athro_id) || [];
        console.log('[SupabaseAthroSelectionService] Loaded selections:', this.selectedAthros);
      }

      // Load confidence levels
      const { data: confidences, error: confidenceError } = await supabase
        .from('athro_confidence_levels')
        .select('*')
        .eq('user_id', this.currentUser.id);

      if (confidenceError) {
        console.error('Error loading confidence levels:', confidenceError);
      } else {
        this.confidenceLevels = {};
        confidences?.forEach(conf => {
          this.confidenceLevels[conf.athro_id] = conf.confidence_level as ConfidenceLevel;
        });
        console.log('[SupabaseAthroSelectionService] Loaded confidence levels:', this.confidenceLevels);
      }

      // Notify listeners
      this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
      this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
    } catch (error) {
      console.error('[SupabaseAthroSelectionService] Error loading from database:', error);
    }
  }

  private setupRealtimeSubscriptions(): void {
    if (!this.currentUser || this.realtimeChannel) return;

    console.log('[SupabaseAthroSelectionService] Setting up real-time subscriptions');

    this.realtimeChannel = supabase
      .channel('athro_data')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athro_selections',
          filter: `user_id=eq.${this.currentUser.id}`
        },
        (payload) => {
          console.log('[SupabaseAthroSelectionService] Real-time selection change:', payload);
          this.handleSelectionChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'athro_confidence_levels',
          filter: `user_id=eq.${this.currentUser.id}`
        },
        (payload) => {
          console.log('[SupabaseAthroSelectionService] Real-time confidence change:', payload);
          this.handleConfidenceChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('[SupabaseAthroSelectionService] Real-time subscription status:', status);
      });
  }

  private handleSelectionChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (newRecord.selected && !this.selectedAthros.includes(newRecord.athro_id)) {
        this.selectedAthros.push(newRecord.athro_id);
        this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
      } else if (!newRecord.selected && this.selectedAthros.includes(newRecord.athro_id)) {
        this.selectedAthros = this.selectedAthros.filter(id => id !== newRecord.athro_id);
        this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
      }
    } else if (eventType === 'DELETE' && oldRecord) {
      this.selectedAthros = this.selectedAthros.filter(id => id !== oldRecord.athro_id);
      this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
    }
  }

  private handleConfidenceChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      this.confidenceLevels[newRecord.athro_id] = newRecord.confidence_level;
      this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
    } else if (eventType === 'DELETE' && oldRecord) {
      delete this.confidenceLevels[oldRecord.athro_id];
      this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
    }
  }

  private async migrateLocalStorageToDatabase(): Promise<void> {
    if (!this.currentUser) return;

    console.log('[SupabaseAthroSelectionService] Migrating localStorage data to database');

    try {
      // Migrate selections
      const localSelections = localStorage.getItem('athro_workspace_selected_athros');
      if (localSelections) {
        const selections = JSON.parse(localSelections) as string[];
        await this.setSelectedAthros(selections, false);
      }

      // Migrate confidence levels
      const localConfidence = localStorage.getItem('athro_workspace_confidence_levels');
      if (localConfidence) {
        const confidences = JSON.parse(localConfidence) as ConfidenceLevels;
        for (const [athroId, level] of Object.entries(confidences)) {
          await this.updateConfidence(athroId, level, false);
        }
      }

      console.log('[SupabaseAthroSelectionService] Migration completed');
    } catch (error) {
      console.error('[SupabaseAthroSelectionService] Error during migration:', error);
    }
  }

  private loadFromLocalStorageFallback(): void {
    console.log('🚫 [SupabaseAthroSelectionService] REMOVED localStorage fallback to prevent stale "AthroWelsh" data');
    // NO localStorage fallback - all data must come from Supabase to ensure fresh "AthroCymraeg" data
  }

  private notifyListeners(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  private setupEventSubscriptions(): void {
    // Subscribe to N8N events
    const selectionUnsubscribe = n8nEventService.subscribe(
      EventNames.ATHRO_SELECTION_UPDATED,
      (payload) => {
        console.log('[SupabaseAthroSelectionService] Received N8N selection update:', payload);
        if (payload.athroIds && Array.isArray(payload.athroIds)) {
          this.setSelectedAthros(payload.athroIds, false);
        }
      }
    );

    const confidenceUnsubscribe = n8nEventService.subscribe(
      EventNames.ATHRO_CONFIDENCE_UPDATED,
      (payload) => {
        console.log('[SupabaseAthroSelectionService] Received N8N confidence update:', payload);
        if (payload.athroId && payload.level) {
          this.updateConfidence(payload.athroId, payload.level as ConfidenceLevel, false);
        }
      }
    );

    this.unsubscribers.push(selectionUnsubscribe, confidenceUnsubscribe);
  }

  private cleanup(): void {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
  }

  public static getInstance(): SupabaseAthroSelectionService {
    if (!SupabaseAthroSelectionService.instance) {
      SupabaseAthroSelectionService.instance = new SupabaseAthroSelectionService();
    }
    return SupabaseAthroSelectionService.instance;
  }

  public getSelectedAthros(): string[] {
    return [...this.selectedAthros];
  }

  public getConfidenceLevel(athroId: string): ConfidenceLevel | undefined {
    return this.confidenceLevels[athroId];
  }

  public getAllConfidenceLevels(): ConfidenceLevels {
    return { ...this.confidenceLevels };
  }

  public async toggleAthroSelection(athroId: string): Promise<void> {
    const isSelected = this.selectedAthros.includes(athroId);
    
    if (this.currentUser) {
      try {
        if (isSelected) {
          // Remove selection
          const { error } = await supabase
            .from('athro_selections')
            .delete()
            .eq('user_id', this.currentUser.id)
            .eq('athro_id', athroId);

          if (error) throw error;
        } else {
          // Add selection
          const { error } = await supabase
            .from('athro_selections')
            .upsert({
              user_id: this.currentUser.id,
              athro_id: athroId,
              selected: true
            });

          if (error) throw error;
        }
      } catch (error) {
        console.error('[SupabaseAthroSelectionService] Error toggling selection:', error);
        // NO localStorage fallback - all data comes from Supabase
        console.log('🚫 REMOVED localStorage fallback to prevent stale data');
      }
    } else {
      this.toggleLocalStorageSelection(athroId);
    }

    // Publish event for cross-app communication
    n8nEventService.publishEvent(EventNames.ATHRO_SELECTION_UPDATED, {
      athroIds: this.selectedAthros,
      source: 'workspace'
    });
  }

  private toggleLocalStorageSelection(athroId: string): void {
    if (this.selectedAthros.includes(athroId)) {
      this.selectedAthros = this.selectedAthros.filter(id => id !== athroId);
    } else {
      this.selectedAthros = [...this.selectedAthros, athroId];
    }

    localStorage.setItem('athro_workspace_selected_athros', JSON.stringify(this.selectedAthros));
    this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
  }

  public async setSelectedAthros(athroIds: string[], broadcast: boolean = true): Promise<void> {
    if (this.currentUser) {
      try {
        // Clear existing selections
        await supabase
          .from('athro_selections')
          .delete()
          .eq('user_id', this.currentUser.id);

        // Insert new selections
        if (athroIds.length > 0) {
          const selections = athroIds.map(athroId => ({
            user_id: this.currentUser.id,
            athro_id: athroId,
            selected: true
          }));

          const { error } = await supabase
            .from('athro_selections')
            .insert(selections);

          if (error) throw error;
        }
      } catch (error) {
        console.error('[SupabaseAthroSelectionService] Error setting selections:', error);
        // NO localStorage fallback - data must come from Supabase
        console.log('🚫 REMOVED localStorage fallback to prevent stale data');
      }
    } else {
      this.selectedAthros = athroIds;
      localStorage.setItem('athro_workspace_selected_athros', JSON.stringify(this.selectedAthros));
      this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
    }

    if (broadcast) {
      n8nEventService.publishEvent(EventNames.ATHRO_SELECTION_UPDATED, {
        athroIds: this.selectedAthros,
        source: 'workspace'
      });
    }
  }

  public async updateConfidence(athroId: string, level: ConfidenceLevel, broadcast: boolean = true): Promise<void> {
    if (this.currentUser) {
      try {
        const { error } = await supabase
          .from('athro_confidence_levels')
          .upsert({
            user_id: this.currentUser.id,
            athro_id: athroId,
            confidence_level: level
          });

        if (error) throw error;
      } catch (error) {
        console.error('[SupabaseAthroSelectionService] Error updating confidence:', error);
        // Fallback to localStorage
        this.confidenceLevels[athroId] = level;
        localStorage.setItem('athro_workspace_confidence_levels', JSON.stringify(this.confidenceLevels));
        this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
      }
    } else {
      this.confidenceLevels[athroId] = level;
      localStorage.setItem('athro_workspace_confidence_levels', JSON.stringify(this.confidenceLevels));
      this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
    }

    if (broadcast) {
      n8nEventService.publishEvent(EventNames.ATHRO_CONFIDENCE_UPDATED, {
        athroId,
        level,
        source: 'workspace'
      });
    }
  }

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
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    this.listeners = {};
  }
}

export default SupabaseAthroSelectionService; 