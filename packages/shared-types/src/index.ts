/**
 * Core event types for the Athro federation
 */

/**
 * Base event interface following the {source}.{action}.{result} pattern
 */
export interface FederationEvent<T = any> {
  source: string;
  action: string;
  result: 'success' | 'error' | 'pending';
  payload: T;
  timestamp: string;
  correlationId?: string;
}

/**
 * Navigation event payload
 */
export interface NavigationPayload {
  destination: string;
  params?: Record<string, string>;
  previousRoute?: string;
}

/**
 * Data synchronization payload with versioning
 */
export interface SyncPayload<T> {
  data: T;
  version: number;
  lastModified: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    permissions: string[];
  };
  token?: string;
  tokenExpiry?: string;
}

/**
 * Application registry entry
 */
export interface AppRegistration {
  name: string;
  url: string;
  version: string;
  exposed: {
    components: string[];
    services: string[];
  };
}

/**
 * Confidence level for Athro subjects
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * UK Exam Boards
 */
export type ExamBoard = 'AQA' | 'Edexcel' | 'OCR' | 'WJEC' | 'CCEA';

/**
 * UK Qualification Levels
 */
export type QualificationLevel = 'GCSE' | 'A-Level' | 'AS-Level';

/**
 * Athro character interface
 */
export interface Athro {
  id: string;
  name: string;
  subject: string;
  description: string;
  image: string;
  isSystem?: boolean;
  isPriority: boolean;
  confidenceLevel: ConfidenceLevel;
  examBoard?: ExamBoard;
  level?: QualificationLevel;
}
