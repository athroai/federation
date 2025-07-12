export type FlashcardDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED' | 'FINISHED';

export type ReviewInterval = '1_DAY' | '2_DAYS' | '1_WEEK' | '1_MONTH';

export type NoteType = 'QUICK' | 'FULL';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  athroId: string;
  subject: string;
  topic: string;
  lastReviewed?: number | null;
  nextReview?: number | null;
  difficulty: FlashcardDifficulty | null | undefined;
  repetitionCount: number;
  reviewInterval?: ReviewInterval;
  deleted?: boolean;
  deletedAt?: number | null;
  saved?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StudyNote {
  id: string;
  athroId: string;
  subject: string;
  topic: string;
  content: string;
  tags: string[];
  noteType: NoteType;
  createdAt: number;
  updatedAt: number;
  lastReviewed?: number | null;
  nextReview?: number | null;
  reviewInterval?: ReviewInterval;
  reviewStatus: NoteReviewStatus;
}

export type NoteReviewStatus = 'NEEDS_REVIEW' | 'REVIEWED' | 'MASTERED';

export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
  color?: string;
}

export interface MindMap {
  id: string;
  athroId: string;
  subject: string;
  topic: string;
  rootNode: MindMapNode;
  edgeData?: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    style?: any;
    markerEnd?: any;
    animated?: boolean;
    sourceHandle?: string;
    targetHandle?: string;
    data?: any;
  }>; // PRESERVE EDGE/LINE INFORMATION
  createdAt: number;
  updatedAt: number;
}

export interface StudyProgress {
  athroId: string;
  subject: string;
  topic: string;
  flashcardsReviewed: number;
  notesCreated: number;
  mindMapsCreated: number;
  lastStudySession: number;
  totalStudyTime: number;  // in minutes
  streakDays: number;
}

export interface StudySession {
  id: string;
  athroId: string;
  subject: string;
  startTime: number;
  endTime?: number;
  activities: {
    type: 'flashcard' | 'note' | 'mindmap';
    itemId: string;
    duration: number;  // in minutes
  }[];
}
