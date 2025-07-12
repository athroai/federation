import { ChatMessage } from '../services/openai';
import { Resource } from './resources';
import { MindMap } from './mindmap';
import { Flashcard } from './flashcard';
import { Note } from './note';

/**
 * Represents a saved study session
 */
export interface StudyHistory {
  id: string;              // Unique identifier for the study session
  athroId: string;         // ID of the athro used in this session
  title: string;           // User-friendly title for this session
  createdAt: number;       // Timestamp when this history was created
  updatedAt: number;       // Timestamp when this history was last updated
  messages: ChatMessage[]; // Chat messages from the session
  
  // Associated resources
  resources: string[];     // IDs of resources used in this session
  mindMaps: string[];      // IDs of mind maps created/used in this session
  notes: string[];         // IDs of notes created/used in this session
  flashcards: string[];    // IDs of flashcard sets created/used in this session
}

/**
 * Represents a summary of a study session for display in the history list
 */
export interface StudyHistorySummary {
  id: string;
  athroId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;    // Number of messages in the session
  resourceCount: number;   // Number of resources used
  toolsCount: number;      // Number of tools (mindmaps, notes, flashcards) used
}
