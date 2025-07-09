/**
 * EventBusService.ts
 *
 * A federated event bus implementation that allows cross-application communication
 * using BroadcastChannel API for reliable cross-tab/cross-iframe communication.
 *
 * Events follow the {source}.{action}.{result} naming convention:
 * - source: the domain/app that owns the data (e.g., 'athro', 'workspace')
 * - action: what happened (e.g., 'confidence', 'document')
 * - result: outcome status (e.g., 'updated', 'created', 'failed')
 *
 * Example: 'athro.confidence.updated'
 */
import { v4 as uuidv4 } from 'uuid';
/**
 * Federation event bus for cross-application communication
 *
 * Follows the principle: "Events connect the system without hard dependencies"
 * Allows services to communicate without direct coupling
 */
export class EventBusService {
    /**
     * Private constructor to enforce singleton pattern
     */
    constructor() {
        this.subscriptions = [];
        this.channels = new Map();
        this.CHANNEL_PREFIX = 'athro-federation-';
        // Initialize the default channel
        this.getChannel('global');
        // Handle browser unload to clean up channels
        window.addEventListener('beforeunload', () => {
            this.channels.forEach(channel => channel.close());
        });
    }
    /**
     * Get the EventBusService singleton instance
     */
    static getInstance() {
        if (!EventBusService.instance) {
            EventBusService.instance = new EventBusService();
        }
        return EventBusService.instance;
    }
    /**
     * Get or create a BroadcastChannel for a specific event namespace
     */
    getChannel(namespace) {
        if (!this.channels.has(namespace)) {
            const channel = new BroadcastChannel(`${this.CHANNEL_PREFIX}${namespace}`);
            // Set up listener for incoming messages on this channel
            channel.addEventListener('message', (event) => {
                const { eventName, payload } = event.data;
                this.notifySubscribers(eventName, payload);
            });
            this.channels.set(namespace, channel);
        }
        return this.channels.get(namespace);
    }
    /**
     * Get the namespace from an event name (first part of the dotted name)
     */
    getNamespaceFromEvent(eventName) {
        const parts = eventName.split('.');
        return parts.length > 0 ? parts[0] : 'global';
    }
    /**
     * Subscribe to an event
     * @param eventName - Format: {source}.{action}.{result}
     * @param handler - Callback function to handle the event
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribe(eventName, handler) {
        // Validate event name format
        if (!this.isValidEventName(eventName)) {
            console.warn(`Invalid event name format: ${eventName}. Expected format: {source}.{action}.{result}`);
        }
        // Create subscription
        const id = uuidv4();
        this.subscriptions.push({ id, eventName, handler });
        // Make sure we have a channel for this namespace
        const namespace = this.getNamespaceFromEvent(eventName);
        this.getChannel(namespace);
        return id;
    }
    /**
     * Unsubscribe from an event using the subscription ID
     */
    unsubscribe(subscriptionId) {
        const initialLength = this.subscriptions.length;
        this.subscriptions = this.subscriptions.filter(sub => sub.id !== subscriptionId);
        return initialLength !== this.subscriptions.length;
    }
    /**
     * Publish an event to subscribers
     * @param eventName - Format: {source}.{action}.{result}
     * @param payload - Event data
     */
    publish(eventName, payload) {
        // Validate event name format
        if (!this.isValidEventName(eventName)) {
            console.warn(`Invalid event name format: ${eventName}. Expected format: {source}.{action}.{result}`);
        }
        // Create the standard event payload
        const eventPayload = {
            timestamp: new Date().toISOString(),
            source: this.getNamespaceFromEvent(eventName),
            payload,
            correlationId: uuidv4()
        };
        // Notify local subscribers
        this.notifySubscribers(eventName, eventPayload);
        // Broadcast to other applications via the appropriate channel
        const namespace = this.getNamespaceFromEvent(eventName);
        const channel = this.getChannel(namespace);
        channel.postMessage({ eventName, payload: eventPayload });
    }
    /**
     * Notify all subscribers of an event
     */
    notifySubscribers(eventName, payload) {
        this.subscriptions
            .filter(sub => sub.eventName === eventName || sub.eventName === '*')
            .forEach(sub => {
            try {
                sub.handler(payload);
            }
            catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }
    /**
     * Validate the event name format
     */
    isValidEventName(eventName) {
        return /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/.test(eventName);
    }
}
// Export singleton instance
export const eventBus = EventBusService.getInstance();
/**
 * Example usage:
 *
 * // Subscribe to an event
 * const subscriptionId = eventBus.subscribe<ConfidenceData>('athro.confidence.updated', (event) => {
 *   console.log('Confidence updated:', event.payload);
 *   updateUIWithNewConfidence(event.payload.level);
 * });
 *
 * // Publish an event
 * eventBus.publish('athro.confidence.updated', {
 *   level: 0.85,
 *   updatedBy: 'user-model',
 *   contextId: '12345'
 * });
 *
 * // Unsubscribe when component unmounts
 * useEffect(() => {
 *   return () => {
 *     eventBus.unsubscribe(subscriptionId);
 *   };
 * }, []);
 */
