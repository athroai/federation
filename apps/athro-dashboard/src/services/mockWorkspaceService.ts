import { StudySession, LearningProgress } from '../types/workspace';
import { subDays } from 'date-fns';

const today = new Date();

const mockSessions: StudySession[] = [
  {
    id: '1',
    athroId: '1',
    startTime: subDays(today, 1),
    endTime: subDays(today, 1),
    topic: 'Quantum Mechanics Basics',
    progress: 85,
    resources: [
      {
        id: 'r1',
        type: 'note',
        title: 'Wave Functions',
        content: 'Introduction to wave functions...',
        created: subDays(today, 1),
        lastModified: subDays(today, 1),
      },
    ],
    notes: ['Key concepts covered: superposition, wave-particle duality'],
  },
];

const mockProgress: LearningProgress = {
  subject: 'Physics',
  topics: [
    {
      name: 'Quantum Mechanics',
      progress: 85,
      lastStudied: subDays(today, 1),
    },
    {
      name: 'Electromagnetism',
      progress: 60,
      lastStudied: subDays(today, 3),
    },
  ],
  overallProgress: 72,
};

export const mockWorkspaceService = {
  getRecentSessions: () => mockSessions,
  getLearningProgress: () => mockProgress,
  getSessionById: (id: string) => mockSessions.find(session => session.id === id),
};
