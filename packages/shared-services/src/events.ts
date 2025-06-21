type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }

  publish(event: string, data: any): void {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(data));
    }
  }

  unsubscribe(unsubFn: () => void): void {
    unsubFn();
  }
}