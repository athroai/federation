export interface StudySession {
  id: string;
  athroId: string;
  startTime: Date;
  endTime: Date;
  topic: string;
  progress: number;
  resources: StudyResource[];
  notes: string[];
}

export interface StudyResource {
  id: string;
  type: 'note' | 'flashcard' | 'quiz' | 'mindmap';
  title: string;
  content: string;
  created: Date;
  lastModified: Date;
}

export interface LearningProgress {
  subject: string;
  topics: {
    name: string;
    progress: number;
    lastStudied: Date;
  }[];
  overallProgress: number;
}
