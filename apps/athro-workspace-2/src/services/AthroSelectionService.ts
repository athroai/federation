/**
 * AthroSelectionService
 * 
 * Handles selection and confidence levels of Athros
 * Following the SERVICE RESPONSIBILITY BOUNDARIES principle:
 * - Services own specific data domains
 * - Services must request data they don't own through appropriate channels
 * - No direct database access across domain boundaries
 */

import n8nEventService, { EventNames } from './N8nEventService';

// Storage keys for localStorage - using standardized keys across both apps
const STORAGE_KEYS = {
  SELECTED_ATHROS: 'athro_workspace_selected_athros',
  CONFIDENCE_LEVELS: 'athro_workspace_confidence_levels',
  // Keys from the onboarding app that we'll monitor directly
  ONBOARDING_SUBJECT_CONFIDENCE: 'subjectConfidence',
  ONBOARDING_FINAL_ATHROS: 'finalAthros'
};

// Confidence level enum
export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

type ConfidenceLevels = Record<string, ConfidenceLevel>;

interface AthroSelection {
  athroId: string;
  selected: boolean;
}

class AthroSelectionService {
  private static instance: AthroSelectionService;
  private selectedAthros: string[] = [];
  private confidenceLevels: ConfidenceLevels = {};
  private listeners: Record<string, Array<(data: any) => void>> = {};
  private unsubscribers: Array<() => void> = [];
  
  /**
   * Notify all listeners for a specific event
   */
  private notifyListeners(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  private constructor() {
    this.loadFromLocalStorage();
    this.setupEventSubscriptions();
    // Use storage events instead of polling - much more efficient!
    this.setupStorageEventListeners();
  }
  
  /**
   * Use browser storage events instead of polling - this is instant and efficient!
   * No more 1000ms intervals!
   */
  private setupStorageEventListeners(): void {
    console.log('[AthroSelectionService] Setting up storage event listeners (NO POLLING!)');
    
    // Listen for storage events from other windows/tabs
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.ONBOARDING_SUBJECT_CONFIDENCE) {
        this.handleSubjectConfidenceChange(event.newValue, event.oldValue);
      } else if (event.key === STORAGE_KEYS.ONBOARDING_FINAL_ATHROS) {
        this.handleFinalAthrosChange(event.newValue, event.oldValue);
      }
    });

    // Also check for changes on page focus (for same-window updates)
    let lastSubjectConfidence = localStorage.getItem(STORAGE_KEYS.ONBOARDING_SUBJECT_CONFIDENCE);
    let lastFinalAthros = localStorage.getItem(STORAGE_KEYS.ONBOARDING_FINAL_ATHROS);
    
    window.addEventListener('focus', () => {
        const currentSubjectConfidence = localStorage.getItem(STORAGE_KEYS.ONBOARDING_SUBJECT_CONFIDENCE);
      const currentFinalAthros = localStorage.getItem(STORAGE_KEYS.ONBOARDING_FINAL_ATHROS);

      if (currentSubjectConfidence !== lastSubjectConfidence) {
        this.handleSubjectConfidenceChange(currentSubjectConfidence, lastSubjectConfidence);
        lastSubjectConfidence = currentSubjectConfidence;
      }

      if (currentFinalAthros !== lastFinalAthros) {
        this.handleFinalAthrosChange(currentFinalAthros, lastFinalAthros);
        lastFinalAthros = currentFinalAthros;
      }
    });
  }

  private handleSubjectConfidenceChange(newValue: string | null, oldValue: string | null): void {
    try {
      if (oldValue && !newValue) {
        console.log('[AthroSelectionService] Subject confidence was cleared');
          this.confidenceLevels = {};
          localStorage.setItem(STORAGE_KEYS.CONFIDENCE_LEVELS, JSON.stringify({}));
          this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
      } else if (newValue && newValue !== oldValue) {
        console.log('[AthroSelectionService] Subject confidence changed');
        const subjectConfidence = JSON.parse(newValue);
          const convertedConfidenceLevels: ConfidenceLevels = {};
          
          for (const [athroId, level] of Object.entries(subjectConfidence)) {
            const normalizedLevel = (level as string).toLowerCase();
            const normalizedId = this.normalizeAthroId(athroId);
            
            if (normalizedLevel === 'high') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.HIGH;
            } else if (normalizedLevel === 'medium') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.MEDIUM;
            } else if (normalizedLevel === 'low') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.LOW;
            }
          }
          
          this.confidenceLevels = { ...this.confidenceLevels, ...convertedConfidenceLevels };
          localStorage.setItem(STORAGE_KEYS.CONFIDENCE_LEVELS, JSON.stringify(this.confidenceLevels));
          this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
        }
    } catch (error) {
      console.error('[AthroSelectionService] Error handling subject confidence change:', error);
    }
  }

  private handleFinalAthrosChange(newValue: string | null, oldValue: string | null): void {
    try {
      if (oldValue && !newValue) {
        console.log('[AthroSelectionService] Final athros was cleared');
          this.selectedAthros = [];
          localStorage.setItem(STORAGE_KEYS.SELECTED_ATHROS, JSON.stringify([]));
          this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
      } else if (newValue && newValue !== oldValue) {
        console.log('[AthroSelectionService] Final athros changed');
        const finalAthros = JSON.parse(newValue);
        
          if (Array.isArray(finalAthros)) {
            const athroIds = finalAthros
            .filter(athro => !athro.isSystem)
              .map(athro => this.normalizeAthroId(athro.id));
            
            const newSelectedAthros = [...this.selectedAthros];
            let hasChanges = false;
            
            for (const id of athroIds) {
              if (!newSelectedAthros.includes(id)) {
                newSelectedAthros.push(id);
                hasChanges = true;
              }
              
              const athro = finalAthros.find(a => this.normalizeAthroId(a.id) === id);
              if (athro && athro.confidenceLevel) {
                const normalizedLevel = athro.confidenceLevel.toLowerCase();
                let newLevel: ConfidenceLevel | null = null;
                
                if (normalizedLevel === 'high') {
                  newLevel = ConfidenceLevel.HIGH;
                } else if (normalizedLevel === 'medium') {
                  newLevel = ConfidenceLevel.MEDIUM;
                } else if (normalizedLevel === 'low') {
                  newLevel = ConfidenceLevel.LOW;
                }
                
                if (newLevel && this.confidenceLevels[id] !== newLevel) {
                  this.confidenceLevels[id] = newLevel;
                  hasChanges = true;
                }
              }
            }
            
            if (hasChanges) {
              this.selectedAthros = newSelectedAthros;
              localStorage.setItem(STORAGE_KEYS.SELECTED_ATHROS, JSON.stringify(this.selectedAthros));
              localStorage.setItem(STORAGE_KEYS.CONFIDENCE_LEVELS, JSON.stringify(this.confidenceLevels));
              this.notifyListeners('selectedAthrosChanged', this.selectedAthros);
              this.notifyListeners('confidenceLevelsChanged', this.confidenceLevels);
            }
          }
        }
      } catch (error) {
      console.error('[AthroSelectionService] Error handling final athros change:', error);
      }
  }

  // Helper function to normalize Athro IDs
  private normalizeAthroId(id: string): string {
    // Remove any existing athro- prefix and convert to lowercase
    const baseId = id.toLowerCase().replace(/^athro-?/, '');
    // Convert camelCase to kebab-case
    const kebabId = baseId.replace(/([a-z])([A-Z])/g, '$1-$2');
    // Add athro- prefix
    return `athro-${kebabId}`;
  }

  private loadFromLocalStorage(): void {
    try {
      let selectedAthroIds: string[] = [];
      
      // First, check for Athros with confidence levels from onboarding
      const subjectConfidenceJson = localStorage.getItem('subjectConfidence');
      if (subjectConfidenceJson) {
        console.log('Found subjectConfidence from onboarding app');
        const subjectConfidence = JSON.parse(subjectConfidenceJson);
        
        // Convert to our confidence level format
        const confidenceAthroIds = Object.keys(subjectConfidence);
        
        if (confidenceAthroIds.length > 0) {
          console.log(`Found ${confidenceAthroIds.length} Athros with confidence levels`);
          
          // Add all Athros with confidence to our selections
          selectedAthroIds = confidenceAthroIds.map(id => this.normalizeAthroId(id));
          
          // Convert the confidence values to our enum format
          const convertedConfidenceLevels: ConfidenceLevels = {};
          
          for (const [athroId, level] of Object.entries(subjectConfidence)) {
            // Convert confidence level string to our enum
            const normalizedLevel = (level as string).toLowerCase();
            const normalizedId = this.normalizeAthroId(athroId);
            
            if (normalizedLevel === 'high') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.HIGH;
            } else if (normalizedLevel === 'medium') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.MEDIUM;
            } else if (normalizedLevel === 'low') {
              convertedConfidenceLevels[normalizedId] = ConfidenceLevel.LOW;
            }
          }
          
          this.confidenceLevels = convertedConfidenceLevels;
          
          // Save the converted confidence levels to our own format
          localStorage.setItem(STORAGE_KEYS.CONFIDENCE_LEVELS, JSON.stringify(convertedConfidenceLevels));
        }
      }
      
      // Then check for additional Athros from finalAthros
      const finalAthrosJson = localStorage.getItem('finalAthros');
      if (finalAthrosJson) {
        console.log('Found finalAthros from onboarding app');
        const finalAthros = JSON.parse(finalAthrosJson);
        
        if (Array.isArray(finalAthros)) {
          // Extract IDs and merge with our selected Athros list
          const athroIds = finalAthros
            .filter(athro => !athro.isSystem) // Filter out system Athros
            .map(athro => this.normalizeAthroId(athro.id));
          
          // Add any Athros that aren't already in our list
          for (const id of athroIds) {
            if (!selectedAthroIds.includes(id)) {
              selectedAthroIds.push(id);
            }
            
            // If the finalAthros has confidence information, use it
            const athro = finalAthros.find(a => this.normalizeAthroId(a.id) === id);
            if (athro && athro.confidenceLevel) {
              const normalizedLevel = athro.confidenceLevel.toLowerCase();
              if (normalizedLevel === 'high') {
                this.confidenceLevels[id] = ConfidenceLevel.HIGH;
              } else if (normalizedLevel === 'medium') {
                this.confidenceLevels[id] = ConfidenceLevel.MEDIUM;
              } else if (normalizedLevel === 'low') {
                this.confidenceLevels[id] = ConfidenceLevel.LOW;
              }
            }
          }
        }
      }
      
      // If we have Athros from onboarding, use them
      if (selectedAthroIds.length > 0) {
        console.log(`Using ${selectedAthroIds.length} Athros from onboarding in total`);
        this.selectedAthros = selectedAthroIds;
        // Save to our own format too
        localStorage.setItem(STORAGE_KEYS.SELECTED_ATHROS, JSON.stringify(selectedAthroIds));
      } else {
        // If no onboarding selections, load from our own storage
        const selectedAthrosJson = localStorage.getItem(STORAGE_KEYS.SELECTED_ATHROS);
        if (selectedAthrosJson) {
          this.selectedAthros = JSON.parse(selectedAthrosJson);
        }
        
        // Also load our own confidence levels
        const confidenceLevelsJson = localStorage.getItem(STORAGE_KEYS.CONFIDENCE_LEVELS);
        if (confidenceLevelsJson) {
          this.confidenceLevels = JSON.parse(confidenceLevelsJson);
        }
      }

      console.log('AthroSelectionService: Loaded from localStorage', {
        selectedAthros: this.selectedAthros,
        confidenceLevels: this.confidenceLevels
      });
    } catch (error) {
      console.error('Error loading athro selections from localStorage:', error);
    }
  }

  private setupEventSubscriptions(): void {
    // Subscribe to ATHRO_SELECTION_UPDATED events from other services
    const selectionUnsubscribe = n8nEventService.subscribe(
      EventNames.ATHRO_SELECTION_UPDATED,
      (payload) => {
        console.log('AthroSelectionService received selection update:', payload);
        if (payload.athroIds && Array.isArray(payload.athroIds)) {
          this.setSelectedAthros(payload.athroIds, false); // Don't broadcast back
        }
      }
    );
    
    // Subscribe to ATHRO_CONFIDENCE_UPDATED events from other services
    const confidenceUnsubscribe = n8nEventService.subscribe(
      EventNames.ATHRO_CONFIDENCE_UPDATED,
      (payload) => {
        console.log('AthroSelectionService received confidence update:', payload);
        if (payload.athroId && payload.level) {
          this.updateConfidence(payload.athroId, payload.level as ConfidenceLevel, false); // Don't broadcast back
        }
      }
    );
    
    // Store unsubscribers for cleanup
    this.unsubscribers.push(selectionUnsubscribe, confidenceUnsubscribe);
  }

  public static getInstance(): AthroSelectionService {
    if (!AthroSelectionService.instance) {
      AthroSelectionService.instance = new AthroSelectionService();
    }
    return AthroSelectionService.instance;
  }

  /**
   * Get currently selected athros
   */
  getSelectedAthros(): string[] {
    return [...this.selectedAthros];
  }

  /**
   * Get confidence level for a specific athro
   */
  getConfidenceLevel(athroId: string): ConfidenceLevel | undefined {
    return this.confidenceLevels[athroId];
  }

  /**
   * Get all confidence levels
   */
  getAllConfidenceLevels(): ConfidenceLevels {
    return { ...this.confidenceLevels };
  }

  /**
   * Toggle selection status of an athro
   */
  toggleAthroSelection(athroId: string): void {
    if (this.selectedAthros.includes(athroId)) {
      this.selectedAthros = this.selectedAthros.filter(id => id !== athroId);
    } else {
      this.selectedAthros = [...this.selectedAthros, athroId];
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SELECTED_ATHROS, JSON.stringify(this.selectedAthros));
    
    // Dispatch event locally
    this.dispatchEvent('selection-changed', { selectedAthros: this.selectedAthros });
    
    // For cross-project communication
    // Following EVENT BUS COMMUNICATION principles
    n8nEventService.publishEvent(EventNames.ATHRO_SELECTION_UPDATED, {
      athroIds: this.selectedAthros,
      source: 'workspace'
    });
  }

  /**
   * Set selected athros (replaces current selection)
   */
  setSelectedAthros(athroIds: string[], broadcast: boolean = true): void {
    this.selectedAthros = [...athroIds];
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SELECTED_ATHROS, JSON.stringify(this.selectedAthros));
    
    // Dispatch event locally
    this.dispatchEvent('selection-changed', { selectedAthros: this.selectedAthros });
    
    // For cross-project communication (conditionally)
    if (broadcast) {
      n8nEventService.publishEvent(EventNames.ATHRO_SELECTION_UPDATED, {
        athroIds: this.selectedAthros,
        source: 'workspace'
      });
    }
  }

  /**
   * Update confidence level for an athro
   */
  updateConfidence(athroId: string, level: ConfidenceLevel, broadcast: boolean = true): void {
    // Update local state
    this.confidenceLevels = {
      ...this.confidenceLevels,
      [athroId]: level
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CONFIDENCE_LEVELS, JSON.stringify(this.confidenceLevels));
    
    // Dispatch event locally
    this.dispatchEvent('confidence-changed', { 
      athroId, 
      level,
      confidenceLevels: this.confidenceLevels 
    });
    
    // For cross-project communication (conditionally)
    if (broadcast) {
      n8nEventService.publishEvent(EventNames.ATHRO_CONFIDENCE_UPDATED, {
        athroId,
        level,
        source: 'workspace'
      });
    }
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Dispatch event
   */
  private dispatchEvent(event: string, data: any): void {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
  
  /**
   * Clean up subscriptions when service is no longer needed
   */
  destroy(): void {
    // Clean up event subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // No more polling intervals to clean up - we use storage events now!
  }

  public getSelections(appId: string): AthroSelection[] {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.SELECTED_ATHROS}_${appId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading Athro selections:', e);
    }
    return [];
  }

  public setSelection(appId: string, athroId: string, selected: boolean): void {
    const normalizedId = this.normalizeAthroId(athroId);
    const selections = this.getSelections(appId);
    const existingSelection = selections.find((s: AthroSelection) => s.athroId === normalizedId);
    
    if (existingSelection) {
      existingSelection.selected = selected;
    } else {
      selections.push({ athroId: normalizedId, selected });
    }
    
    // Save to localStorage
    localStorage.setItem(`${STORAGE_KEYS.SELECTED_ATHROS}_${appId}`, JSON.stringify(selections));
    
    // Notify listeners
    this.notifyListeners('selectionsChanged', selections);
  }
}

// Export singleton instance
const athroSelectionService = AthroSelectionService.getInstance();
export default athroSelectionService;
