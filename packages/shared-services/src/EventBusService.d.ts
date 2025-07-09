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
type EventHandler<T = any> = (payload: T) => void;
export interface EventPayload<T = any> {
    timestamp: string;
    source: string;
    payload: T;
    correlationId?: string;
    version?: number;
}
/**
 * Federation event bus for cross-application communication
 *
 * Follows the principle: "Events connect the system without hard dependencies"
 * Allows services to communicate without direct coupling
 */
export declare class EventBusService {
    private static instance;
    private subscriptions;
    private channels;
    private readonly CHANNEL_PREFIX;
    /**
     * Private constructor to enforce singleton pattern
     */
    private constructor();
    /**
     * Get the EventBusService singleton instance
     */
    static getInstance(): EventBusService;
    /**
     * Get or create a BroadcastChannel for a specific event namespace
     */
    private getChannel;
    /**
     * Get the namespace from an event name (first part of the dotted name)
     */
    private getNamespaceFromEvent;
    /**
     * Subscribe to an event
     * @param eventName - Format: {source}.{action}.{result}
     * @param handler - Callback function to handle the event
     * @returns Subscription ID that can be used to unsubscribe
     */
    subscribe<T = any>(eventName: string, handler: EventHandler<EventPayload<T>>): string;
    /**
     * Unsubscribe from an event using the subscription ID
     */
    unsubscribe(subscriptionId: string): boolean;
    /**
     * Publish an event to subscribers
     * @param eventName - Format: {source}.{action}.{result}
     * @param payload - Event data
     */
    publish<T = any>(eventName: string, payload: T): void;
    /**
     * Notify all subscribers of an event
     */
    private notifySubscribers;
    /**
     * Validate the event name format
     */
    private isValidEventName;
}
export declare const eventBus: EventBusService;
export {};
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
