/**
 * Utility functions for Module Federation configuration
 */

/**
 * Creates a federation configuration for remote applications
 * @param {Object} options - Configuration options
 * @param {string} options.name - Name of the app
 * @param {number} options.port - Port number
 * @param {Object} options.exposes - Components to expose
 * @param {Array<string>} options.remotes - Remote apps to consume
 * @param {Array<string>} options.shared - Shared dependencies
 */
export function createFederationConfig(options) {
  const { name, port, exposes = {}, remotes = [], shared = [] } = options;
  
  const federationConfig = {
    name,
    filename: 'remoteEntry.js',
    exposes,
    remotes: remotes.reduce((acc, remote) => {
      const [remoteName, remotePort] = remote.split('@');
      acc[remoteName] = `${remoteName}@http://localhost:${remotePort}/remoteEntry.js`;
      return acc;
    }, {}),
    shared: [
      'react',
      'react-dom',
      'react-router-dom',
      ...shared
    ].reduce((acc, dep) => {
      acc[dep] = { singleton: true, requiredVersion: false };
      return acc;
    }, {})
  };
  
  return federationConfig;
}

/**
 * Creates an event bus for cross-application communication
 */
export class FederationEventBus {
  constructor() {
    this.events = {};
    
    // Listen for cross-window events
    window.addEventListener('message', this.handleExternalEvent.bind(this));
  }
  
  /**
   * Subscribe to an event
   * @param {string} eventName - Format: {source}.{action}.{result}
   * @param {Function} callback - Handler function
   */
  subscribe(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
    
    return () => {
      this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    };
  }
  
  /**
   * Publish an event
   * @param {string} eventName - Format: {source}.{action}.{result}
   * @param {any} data - Event data
   */
  publish(eventName, data) {
    // Handle local subscribers
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => callback(data));
    }
    
    // Broadcast to other applications
    window.postMessage({
      type: 'FEDERATION_EVENT',
      eventName,
      data,
      timestamp: new Date().toISOString(),
    }, '*');
  }
  
  /**
   * Handle events from other applications
   */
  handleExternalEvent(event) {
    if (event.data && event.data.type === 'FEDERATION_EVENT') {
      const { eventName, data } = event.data;
      
      if (this.events[eventName]) {
        this.events[eventName].forEach(callback => callback(data));
      }
    }
  }
}

// Create a singleton instance
export const eventBus = new FederationEventBus();
