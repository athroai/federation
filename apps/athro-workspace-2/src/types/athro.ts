// Types for Athro AI character system
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Athro {
  id: string;
  name: string;
  subject: string;
  description: string;
  image: string;
  isSystem?: boolean;
  isPriority: boolean;
  confidenceLevel?: ConfidenceLevel;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
