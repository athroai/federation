// Simple event bus implementation for sharing between components
// This is a temporary solution until we properly set up Module Federation

export const simpleEventBus = {
  events: {},
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return () => this.events[event] = this.events[event].filter(cb => cb !== callback);
  },
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback({ 
        payload: data,
        timestamp: new Date().toISOString()
      }));
    }
  },
  unsubscribe(unsubFn) {
    if (typeof unsubFn === 'function') {
      unsubFn();
    }
  }
};
