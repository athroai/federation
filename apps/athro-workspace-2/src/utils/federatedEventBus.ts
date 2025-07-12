// FederatedEventBus - Enhanced event bus for cross-app federation communication
// This enables seamless communication between the onboarding and workspace apps

type EventHandler = (...args: any[]) => void;

class FederatedEventBus {
  private listeners: Record<string, EventHandler[]> = {};
  private broadcastChannel: BroadcastChannel | null = null;
  private federationId = 'athro-federation'; // Unique ID for our federation - must match onboarding app

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
    const appSource = window.location.pathname.includes('workspace') ? 
      'workspace' : 'onboarding';
    
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
    this.emit(`${key}Changed`, value);
  }
}

// Create a singleton instance
const federatedEventBus = new FederatedEventBus();

// Define standard event names to prevent typos
export const EVENTS = {
  ATHRO_SELECTION_CHANGED: 'athroSelectionChanged',
  CONFIDENCE_UPDATED: 'confidenceUpdated',
  FINAL_ATHROS_UPDATED: 'finalAthrosUpdated',
  
  // Federation-specific events
  FEDERATION_SYNC_REQUEST: 'federationSyncRequest',
  FEDERATION_SYNC_RESPONSE: 'federationSyncResponse',
  FEDERATION_ATHRO_UPDATE: 'federationAthroUpdate',
};

export default federatedEventBus;
