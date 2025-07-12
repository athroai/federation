/**
 * N8nEventService
 * 
 * Service for cross-project communication using n8n
 * Following the SERVICE LAYER ARCHITECTURE principles:
 * - Events follow the pattern: {source}.{action}.{result}
 * - Services publish events without knowing subscribers
 * - Services subscribe to events without knowing publishers
 */

// Standard event names following our pattern
export enum EventNames {
  // Athro-related events
  ATHRO_SELECTION_UPDATED = 'athro.selection.updated',
  ATHRO_CONFIDENCE_UPDATED = 'athro.confidence.updated',
  
  // Workspace-related events
  WORKSPACE_STATE_UPDATED = 'workspace.state.updated',
  CHAT_MESSAGE_SENT = 'workspace.chat.message.sent',
  CHAT_MESSAGE_RECEIVED = 'workspace.chat.message.received',
  
  // Document-related events
  DOCUMENT_UPLOADED = 'workspace.document.uploaded',
  DOCUMENT_PROCESSED = 'workspace.document.processed',
  
  // Study material events
  STUDY_MATERIAL_ADDED = 'workspace.study.material.added',
  STUDY_MATERIAL_REMOVED = 'workspace.study.material.removed'
}

// Following EVENT PAYLOAD STANDARDS from global rules
export interface EventPayload {
  timestamp: number;
  [key: string]: any;
}

/**
 * Singleton service for n8n event communication
 */
class N8nEventService {
  private static instance: N8nEventService;
  private readonly baseUrl: string = 'http://localhost:5678/webhook/';
  private readonly serviceName: string = 'workspace';
  
  // Store event handlers
  private eventHandlers: Record<string, Array<(data: EventPayload) => void>> = {};
  
  // Store pending messages if n8n is down
  private pendingMessages: Array<{eventName: string, payload: any, attempts: number}> = [];
  
  // Webhook server for receiving events (simulated with polling in development)
  private pollInterval: number | null = null;
  
  // Track if n8n is available
  private n8nAvailable: boolean = false;
  
  private constructor() {
    console.log('N8nEventService initialized');
    
    // Check if n8n is available
    this.checkN8nAvailability();
    
    // Load any pending messages from localStorage
    this.loadPendingMessages();
    
    // Start polling for events (simulating webhook server)
    this.startEventPolling();
    
    // Try to send any pending messages on startup
    this.retryPendingMessages();
  }
  
  /**
   * Check if n8n is available
   */
  private async checkN8nAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      this.n8nAvailable = response.ok;
      console.log(`n8n is ${this.n8nAvailable ? 'available' : 'not available'}`);
    } catch (error) {
      this.n8nAvailable = false;
      console.warn('n8n is not available:', error);
    }
  }
  
  private loadPendingMessages(): void {
    try {
      const storedMessages = localStorage.getItem('n8n_pending_messages');
      if (storedMessages) {
        this.pendingMessages = JSON.parse(storedMessages);
        console.log(`Loaded ${this.pendingMessages.length} pending messages`);
      }
    } catch (error) {
      console.error('Error loading pending messages:', error);
    }
  }
  
  private savePendingMessages(): void {
    try {
      localStorage.setItem('n8n_pending_messages', JSON.stringify(this.pendingMessages));
    } catch (error) {
      console.error('Error saving pending messages:', error);
    }
  }
  
  public static getInstance(): N8nEventService {
    if (!N8nEventService.instance) {
      N8nEventService.instance = new N8nEventService();
    }
    return N8nEventService.instance;
  }
  
  /**
   * Publish an event to n8n
   * @param eventName Standard event name
   * @param payload Event data (timestamp will be added automatically)
   * @returns Promise that resolves when the event is published
   */
  async publishEvent(eventName: string, payload: Omit<EventPayload, 'timestamp'>): Promise<void> {
    // If n8n is not available, just log and return
    if (!this.n8nAvailable) {
      console.log(`n8n is not available, skipping event: ${eventName}`);
      return;
    }
    
    // Add timestamp and source according to EVENT PAYLOAD STANDARDS
    const fullPayload = {
      ...payload,
      timestamp: Date.now(),
      source: this.serviceName
    };
    
    try {
      // Convert event name to webhook-compatible format
      const webhookName = eventName.replace(/\./g, '-');
      
      // Send to n8n webhook
      const response = await fetch(`${this.baseUrl}${webhookName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullPayload),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      console.log(`Event ${eventName} published successfully`, fullPayload);
    } catch (error) {
      console.error(`Error publishing event ${eventName}:`, error);
      
      // Store for retry following ERROR HANDLING PROTOCOL
      this.pendingMessages.push({
        eventName,
        payload: fullPayload,
        attempts: 1
      });
      
      this.savePendingMessages();
    }
  }
  
  /**
   * Subscribe to events of a specific type
   * @param eventName Event name to listen for
   * @param handler Function to call when event is received
   * @returns Unsubscribe function
   */
  subscribe(eventName: string, handler: (data: EventPayload) => void): () => void {
    if (!this.eventHandlers[eventName]) {
      this.eventHandlers[eventName] = [];
    }
    
    this.eventHandlers[eventName].push(handler);
    console.log(`Subscribed to event: ${eventName}`);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers[eventName] = this.eventHandlers[eventName].filter(h => h !== handler);
      console.log(`Unsubscribed from event: ${eventName}`);
    };
  }
  
  /**
   * Process an incoming event
   * @param eventName Name of the event
   * @param payload Event data
   */
  private handleIncomingEvent(eventName: string, payload: EventPayload): void {
    // Skip events that originated from this service
    if (payload.source === this.serviceName) {
      return;
    }
    
    console.log(`Received event: ${eventName}`, payload);
    
    // Call all registered handlers
    const handlers = this.eventHandlers[eventName] || [];
    handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  }
  
  /**
   * Retry sending any pending messages
   */
  private async retryPendingMessages(): Promise<void> {
    if (this.pendingMessages.length === 0 || !this.n8nAvailable) return;
    
    console.log(`Retrying ${this.pendingMessages.length} pending messages`);
    
    const stillPending: typeof this.pendingMessages = [];
    
    for (const message of this.pendingMessages) {
      // Skip if too many attempts (max 5)
      if (message.attempts >= 5) {
        console.error(`Max retry attempts reached for event ${message.eventName}`, message.payload);
        continue;
      }
      
      try {
        const webhookName = message.eventName.replace(/\./g, '-');
        const response = await fetch(`${this.baseUrl}${webhookName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message.payload),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        console.log(`Retried event ${message.eventName} published successfully`);
      } catch (error) {
        console.error(`Error retrying event ${message.eventName}:`, error);
        
        // Increment attempts and keep in pending queue
        message.attempts += 1;
        stillPending.push(message);
      }
    }
    
    // Update pending messages
    this.pendingMessages = stillPending;
    this.savePendingMessages();
  }
  
  /**
   * Start polling for events (simulating webhook server in development)
   */
  private startEventPolling(): void {
    // Only poll if n8n is available
    if (!this.n8nAvailable) {
      console.log('n8n is not available, skipping event polling');
      return;
    }
    
    console.log('n8n is available, starting event polling');
    
    // Poll every 10 seconds for new events (less frequent to reduce load)
    this.pollInterval = window.setInterval(() => {
      // In a real implementation, we would set up webhook endpoints
      // For development, we're simulating with polling
      fetch(`http://localhost:5678/api/v1/events/${this.serviceName}`)
        .then(response => response.json())
        .then(events => {
          events.forEach((event: {name: string, payload: EventPayload}) => {
            this.handleIncomingEvent(event.name, event.payload);
          });
        })
        .catch(error => {
          console.error('Error polling for events:', error);
        });
        
      // Also retry any pending messages
      this.retryPendingMessages();
    }, 10000);
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    // Save any pending messages
    this.savePendingMessages();
  }
}

// Export singleton instance
const n8nEventService = N8nEventService.getInstance();
export default n8nEventService;