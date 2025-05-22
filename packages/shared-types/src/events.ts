/**
 * Shared event type definitions for Athro Federation
 * 
 * These types ensure consistent communication between applications
 * following the principle of "shared state is synchronized, not copied"
 */

/**
 * Base event payload interface that all event payloads should extend
 */
export interface BaseEventPayload {
  timestamp: string;
  correlationId?: string;
  version?: number;
}

/**
 * Confidence level event payload
 * Used when athro-workspace-2 emits 'athro.confidence.updated'
 */
export interface ConfidenceLevelPayload extends BaseEventPayload {
  level: number;
  source: 'user' | 'model' | 'system';
  context?: string;
  previousLevel?: number;
}

/**
 * Document state payload
 * Used for document-related events
 */
export interface DocumentStatePayload extends BaseEventPayload {
  documentId: string;
  state: 'opened' | 'closed' | 'updated' | 'saved';
  title?: string;
  path?: string;
  metadata?: Record<string, any>;
}

/**
 * Dashboard update payload
 * Used for dashboard-related events
 */
export interface DashboardUpdatePayload extends BaseEventPayload {
  dashboardId: string;
  metrics: {
    id: string;
    name: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }[];
}

/**
 * Navigation event payload
 * Used when requesting navigation between applications
 */
export interface NavigationPayload extends BaseEventPayload {
  destination: string;
  params?: Record<string, string>;
  source: string;
  replace?: boolean;
}

/**
 * User state payload
 * Used for synchronizing user-related information
 */
export interface UserStatePayload extends BaseEventPayload {
  userId: string;
  displayName?: string;
  preferences?: Record<string, any>;
  settings?: Record<string, any>;
}

/**
 * Type guard to check if a payload is a ConfidenceLevelPayload
 */
export function isConfidenceLevelPayload(payload: any): payload is ConfidenceLevelPayload {
  return (
    payload &&
    typeof payload === 'object' &&
    'level' in payload &&
    'source' in payload &&
    typeof payload.level === 'number'
  );
}
