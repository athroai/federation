/**
 * Event Bus Service for the Workspace App
 * 
 * This service follows the federation architecture principles by providing
 * standardized event-based communication between components and with other 
 * services in the federation.
 */

// Type for event handlers
export type EventHandler = (...args: any[]) => void;

class EventBusService {
  private static instance: EventBusService;
  private listeners: Record<string, EventHandler[]> = {};
  private broadcastChannel: BroadcastChannel | null = null;
  private federationId = 'athro-federation';

  constructor() {
    // Set up cross-app communication using BroadcastChannel API if supported
    try {
      this.broadcastChannel = new BroadcastChannel(this.federationId);
      
      // Listen for events from other apps in the federation
      this.broadcastChannel.onmessage = (event) => {
        const { eventName, args, source } = event.data;
        console.log(`[Federation] Received ${eventName} from ${source}`, args);
        
        // Trigger local listeners but don't re-broadcast
        this.triggerLocalListeners(eventName, ...args);
      };
      
      console.log('[Federation] BroadcastChannel initialized for cross-app communication');
    } catch (e) {
      console.warn('[Federation] BroadcastChannel not supported, falling back to localStorage events');
      this.broadcastChannel = null;
      
      // Set up localStorage event listener as fallback
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  // Get singleton instance
  public static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  private handleStorageEvent = (e: StorageEvent) => {
    // Only process federation events
    if (e.key && e.key.startsWith(`${this.federationId}:event:`)) {
      try {
        if (e.newValue) {
          const { eventName, args } = JSON.parse(e.newValue);
          console.log(`[Federation] Received ${eventName} via localStorage`, args);
          this.triggerLocalListeners(eventName, ...args);
        }
      } catch (err) {
        console.error('[Federation] Error processing storage event:', err);
      }
    }
  };

  // Trigger only local listeners without re-broadcasting
  private triggerLocalListeners(event: string, ...args: any[]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`[Federation] Error in listener for ${event}:`, e);
        }
      });
    }
  }

  // Subscribe to an event
  on(event: string, callback: EventHandler): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  // Emit an event locally and across the federation
  emit(event: string, ...args: any[]): void {
    // First trigger local listeners
    this.triggerLocalListeners(event, ...args);
    
    // Then broadcast to other apps
    const appSource = 'workspace';
    
    if (this.broadcastChannel) {
      // Use BroadcastChannel if available
      this.broadcastChannel.postMessage({
        eventName: event,
        args,
        source: appSource,
        timestamp: Date.now()
      });
    } else {
      // Fallback to localStorage
      const storageKey = `${this.federationId}:event:${event}`;
      const storageValue = JSON.stringify({
        eventName: event,
        args,
        source: appSource,
        timestamp: Date.now()
      });
      
      localStorage.setItem(storageKey, storageValue);
      // Remove after a short delay to allow events to trigger again
      setTimeout(() => localStorage.removeItem(storageKey), 100);
    }
  }

  // Helper to sync with localStorage
  syncWithLocalStorage(key: string, initialValue: any): any {
    // Get from localStorage
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
    }
    
    // Set initial value if nothing in localStorage
    if (initialValue !== undefined) {
      localStorage.setItem(key, JSON.stringify(initialValue));
    }
    
    return initialValue;
  }
  
  // Save to localStorage and emit federated change event
  saveAndEmit(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));
    // Emit a federated event that can be listened to by any component across all apps
    this.emit(`${key}.changed`, value);
  }
}

// Create a singleton instance
const eventBus = EventBusService.getInstance();

// Export standard event names to prevent typos
export const EVENTS = {
  // Athro-specific events
  ATHRO_SELECTION_CHANGED: 'athroSelection.changed',
  CONFIDENCE_UPDATED: 'confidence.updated',
  FINAL_ATHROS_UPDATED: 'finalAthros.updated',
  
  // Federation-specific events
  FEDERATION_SYNC_REQUEST: 'federation.sync.requested',
  FEDERATION_SYNC_RESPONSE: 'federation.sync.responded',
  FEDERATION_ATHRO_UPDATE: 'federation.athro.updated',
  
  // Language and translation events
  LANGUAGE_CHANGED: 'language.changed',
  TRANSLATION_UPDATED: 'translation.updated',
  TRANSLATION_REQUESTED: 'translation.requested',
};

export default eventBus;
