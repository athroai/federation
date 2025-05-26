/**
 * AthroSelectionService.ts
 * 
 * Service for managing user's Athro selections across the application.
 * This service follows these principles:
 * 1. Data ownership - Each app can only access its own selections
 * 2. Scoped service ownership - Service is responsible for a specific domain
 * 3. Event-driven updates - Changes are propagated via events
 * 
 * Used by both /onboarding and /calendar applications
 */

// Import from dependency that's already in package.json
import { v4 as uuidv4 } from 'uuid';
import { eventBus, EventPayload } from './EventBusService';

// Event names
export const EVENTS = {
  SELECTION_UPDATED: 'athro.selection.updated',
  SELECTION_REMOVED: 'athro.selection.removed',
  SELECTION_CLEARED: 'athro.selection.cleared'
};

// Event payload types
export interface RemovalPayload {
  athroId: string;
  metadata?: {
    appId: string;
    publisher: string;
  };
}

export interface ClearPayload {
  metadata?: {
    appId: string;
    publisher: string;
  };
}

// Selection types
export type SelectionMode = 'single' | 'multi';

// Interface for Athro selection data
export interface AthroSelection {
  athroId: string;
  selected: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Service for managing Athro selections
 * - Persists selections across page reloads
 * - Available in both /onboarding and /calendar
 * - Uses namespaced storage for data isolation
 */
export class AthroSelectionService {
  private static instance: AthroSelectionService;
  private readonly STORAGE_KEY_PREFIX = 'athro-selection-';
  private readonly userId: string;
  private selectionMode: SelectionMode = 'multi';
  private subscriptions: string[] = [];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Generate or retrieve user ID for storage namespacing
    const existingUserId = localStorage.getItem('athro-user-id');
    this.userId = existingUserId || uuidv4();
    
    if (!existingUserId) {
      localStorage.setItem('athro-user-id', this.userId);
    }

    // Subscribe to selection events from other tabs/windows
    this.subscribeToEvents();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AthroSelectionService {
    if (!AthroSelectionService.instance) {
      AthroSelectionService.instance = new AthroSelectionService();
    }
    return AthroSelectionService.instance;
  }

  /**
   * Set selection mode (single or multi)
   */
  public setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode;
  }

  /**
   * Get current selection mode
   */
  public getSelectionMode(): SelectionMode {
    return this.selectionMode;
  }

  /**
   * Get the storage key for a specific app
   * Uses namespacing to isolate data between apps
   */
  private getStorageKey(appId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${this.userId}-${appId}`;
  }

  /**
   * Subscribe to selection events from other tabs/windows
   */
  private subscribeToEvents(): void {
    // Subscribe to selection updates
    const updateSub = eventBus.subscribe<AthroSelection>(
      EVENTS.SELECTION_UPDATED,
      (event) => {
        // Skip events that we published ourselves
        if (event.payload.metadata?.publisher === this.userId) return;
        
        // Update local storage with the received selection
        const appId = event.payload.metadata?.appId;
        if (!appId) return;

        const selections = this.getSelectionsFromStorage(appId);
        const updatedSelections = this.updateSelectionInList(
          selections, 
          event.payload.athroId, 
          event.payload.selected
        );
        
        this.saveSelectionsToStorage(appId, updatedSelections);
      }
    );

    // Subscribe to selection removal events
    const removeSub = eventBus.subscribe<RemovalPayload>(
      EVENTS.SELECTION_REMOVED,
      (event) => {
        // Skip events that we published ourselves
        if (event.payload.metadata?.publisher === this.userId) return;
        
        const appId = event.payload.metadata?.appId;
        if (!appId) return;

        const selections = this.getSelectionsFromStorage(appId);
        const updatedSelections = this.removeSelectionFromList(
          selections, 
          event.payload.athroId
        );
        
        this.saveSelectionsToStorage(appId, updatedSelections);
      }
    );

    // Subscribe to selection clear events
    const clearSub = eventBus.subscribe<ClearPayload>(
      EVENTS.SELECTION_CLEARED,
      (event) => {
        // Skip events that we published ourselves
        if (event.payload.metadata?.publisher === this.userId) return;
        
        const appId = event.payload.metadata?.appId;
        if (appId) {
          this.saveSelectionsToStorage(appId, []);
        }
      }
    );

    this.subscriptions = [updateSub, removeSub, clearSub];
  }

  /**
   * Clean up subscriptions when service is destroyed
   */
  public destroy(): void {
    this.subscriptions.forEach(id => eventBus.unsubscribe(id));
  }

  /**
   * Get all selections for an app
   */
  public getSelections(appId: string): AthroSelection[] {
    return this.getSelectionsFromStorage(appId);
  }

  /**
   * Get selection status for a specific Athro
   */
  public isSelected(appId: string, athroId: string): boolean {
    const selections = this.getSelectionsFromStorage(appId);
    const selection = selections.find(s => s.athroId === athroId);
    return selection ? selection.selected : false;
  }

  /**
   * Toggle selection for an Athro
   * In single-select mode, deselects all others
   */
  public toggleSelection(appId: string, athroId: string): boolean {
    let selections = this.getSelectionsFromStorage(appId);
    const currentlySelected = this.isSelected(appId, athroId);
    const newSelectionState = !currentlySelected;

    if (this.selectionMode === 'single' && newSelectionState) {
      // In single-select mode, deselect all others
      selections = selections.map(s => ({
        ...s,
        selected: s.athroId === athroId
      }));
    } else {
      // In multi-select mode, just toggle the selection
      selections = this.updateSelectionInList(selections, athroId, newSelectionState);
    }

    this.saveSelectionsToStorage(appId, selections);
    
    // Publish the selection event
    this.publishSelectionUpdate(appId, athroId, newSelectionState);
    
    return newSelectionState;
  }

  /**
   * Select multiple Athros at once
   */
  public selectMultiple(appId: string, athroIds: string[]): void {
    let selections = this.getSelectionsFromStorage(appId);
    
    // Single-select mode only allows one selection
    if (this.selectionMode === 'single' && athroIds.length > 0) {
      const lastId = athroIds[athroIds.length - 1];
      selections = selections.map(s => ({
        ...s,
        selected: s.athroId === lastId
      }));

      // Add if it doesn't exist
      if (!selections.some(s => s.athroId === lastId)) {
        selections.push({
          athroId: lastId,
          selected: true,
          timestamp: new Date().toISOString()
        });
      }
      
      this.saveSelectionsToStorage(appId, selections);
      this.publishSelectionUpdate(appId, lastId, true);
      return;
    }
    
    // Multi-select mode can select multiple
    athroIds.forEach(id => {
      selections = this.updateSelectionInList(selections, id, true);
      this.publishSelectionUpdate(appId, id, true);
    });
    
    this.saveSelectionsToStorage(appId, selections);
  }

  /**
   * Clear all selections for an app
   */
  public clearSelections(appId: string): void {
    this.saveSelectionsToStorage(appId, []);
    this.publishSelectionClear(appId);
  }

  /**
   * Update or add a selection in the list
   */
  private updateSelectionInList(
    selections: AthroSelection[], 
    athroId: string, 
    selected: boolean
  ): AthroSelection[] {
    const existingIndex = selections.findIndex(s => s.athroId === athroId);
    
    if (existingIndex >= 0) {
      // Update existing selection
      return selections.map(s => 
        s.athroId === athroId 
          ? { ...s, selected, timestamp: new Date().toISOString() } 
          : s
      );
    } else {
      // Add new selection
      return [
        ...selections,
        {
          athroId,
          selected,
          timestamp: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * Remove a selection from the list
   */
  private removeSelectionFromList(
    selections: AthroSelection[],
    athroId: string
  ): AthroSelection[] {
    return selections.filter(s => s.athroId !== athroId);
  }

  /**
   * Get selections from storage for an app
   */
  private getSelectionsFromStorage(appId: string): AthroSelection[] {
    const key = this.getStorageKey(appId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored selections:', e);
      return [];
    }
  }

  /**
   * Save selections to storage for an app
   */
  private saveSelectionsToStorage(appId: string, selections: AthroSelection[]): void {
    const key = this.getStorageKey(appId);
    localStorage.setItem(key, JSON.stringify(selections));
  }

  /**
   * Publish a selection update event
   */
  private publishSelectionUpdate(appId: string, athroId: string, selected: boolean): void {
    eventBus.publish<AthroSelection>(EVENTS.SELECTION_UPDATED, {
      athroId,
      selected,
      timestamp: new Date().toISOString(),
      metadata: {
        appId,
        publisher: this.userId
      }
    });
  }

  /**
   * Publish a selection removal event
   */
  private publishSelectionRemoval(appId: string, athroId: string): void {
    eventBus.publish<RemovalPayload>(EVENTS.SELECTION_REMOVED, {
      athroId,
      metadata: {
        appId,
        publisher: this.userId
      }
    });
  }

  /**
   * Publish a selection clear event
   */
  private publishSelectionClear(appId: string): void {
    eventBus.publish<ClearPayload>(EVENTS.SELECTION_CLEARED, {
      metadata: {
        appId,
        publisher: this.userId
      }
    });
  }
}

// Export singleton instance
export const athroSelectionService = AthroSelectionService.getInstance();
