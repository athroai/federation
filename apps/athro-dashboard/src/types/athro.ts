import { ConfidenceLevel } from '@athro/shared-types';

export interface Athro {
  id: string;
  name: string;
  subject: string;
  image: string;
  specialties: string[];
}

export interface AthroSession {
  id: string;
  athroId: string;
  startTime: Date;
  endTime: Date;
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface AthroPersonality {
  id: string;
  name: string;
  subject: string;
  level: string;
  teachingStyle: string;
  specialCapabilities: string[];
}

export type { ConfidenceLevel };

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number; // Index of correct option
  difficulty: 'easy' | 'medium' | 'hard';
};
