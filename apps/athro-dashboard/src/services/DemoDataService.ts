export interface DemoProfile {
  id: string;
  full_name: string;
  preferred_name: string;
  school: string;
  year: number;
  email: string;
  user_tier: 'lite' | 'full';
  avatar_url?: string;
  created_at: string;
  last_sign_in_at: string;
}

export interface DemoDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploaded_at: string;
  subject: string;
  tags: string[];
}

export interface DemoConversation {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  subject: string;
  created_at: string;
  updated_at: string;
}

export interface DemoPlaylist {
  id: string;
  name: string;
  description: string;
  subject: string;
  resources: Array<{
    id: string;
    title: string;
    type: 'video' | 'article' | 'document' | 'quiz';
    url: string;
    duration?: number;
  }>;
  created_at: string;
}

export interface DemoCalendarEvent {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  subject: string;
  type: 'study' | 'exam' | 'assignment' | 'break';
  completed: boolean;
}

export interface DemoWellbeingEntry {
  id: string;
  date: string;
  mood: number; // 1-10
  stress_level: number; // 1-10
  energy_level: number; // 1-10
  sleep_hours: number;
  notes: string;
  gratitude_entries: string[];
}

export interface DemoFlashcardDeck {
  id: string;
  name: string;
  subject: string;
  cards: Array<{
    id: string;
    front: string;
    back: string;
    difficulty: 'easy' | 'medium' | 'hard';
    last_reviewed: string;
    next_review: string;
  }>;
  created_at: string;
}

export class DemoDataService {
  private static instance: DemoDataService;
  private isEnabled = false;

  private constructor() {}

  public static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  enableDemoMode(): void {
    // SECURITY CHECK: Only block if there's an active real user session
    // BUT allow demo login when no user is authenticated or when switching to demo
    try {
      // Check multiple possible localStorage auth keys for Supabase
      const possibleKeys = [
        'sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token',
        `sb-localhost-auth-token`,
        `sb-127-0-0-1-auth-token`
      ];
      
      let currentAuthUser = null;
      for (const key of possibleKeys) {
        try {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          if (authData?.user?.email) {
            currentAuthUser = authData.user;
            break;
          }
        } catch (e) {
          // Continue to next key
        }
      }
      
      // Only block if there's a REAL authenticated user (not demo)
      if (currentAuthUser && currentAuthUser.email && 
          !currentAuthUser.email.includes('demo') && 
          currentAuthUser.email !== 'alex.demo@athro.app') {
        console.error('🚨 SECURITY: Cannot enable demo mode when real user is authenticated!');
        console.log('🔒 Authenticated user:', currentAuthUser.email);
        return;
      }
    } catch (error) {
      // If security check fails, allow demo mode (better UX than blocking)
      console.log('⚠️ Security check failed, allowing demo mode:', error);
    }
    
    this.isEnabled = true;
    localStorage.setItem('demo_mode_enabled', 'true');
    console.log('🎭 Demo Mode Enabled - Alex Thompson login successful!');
  }

  disableDemoMode(): void {
    this.isEnabled = false;
    localStorage.removeItem('demo_mode_enabled');
    console.log('🎭 Demo Mode Disabled - Cleared demo data!');
  }

  isDemoModeEnabled(): boolean {
    // SECURITY CHECK: Only disable demo mode if there's an active real user session
    try {
      // Check multiple possible localStorage auth keys for Supabase
      const possibleKeys = [
        'sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token',
        `sb-localhost-auth-token`,
        `sb-127-0-0-1-auth-token`
      ];
      
      let currentAuthUser = null;
      for (const key of possibleKeys) {
        try {
          const authData = JSON.parse(localStorage.getItem(key) || '{}');
          if (authData?.user?.email) {
            currentAuthUser = authData.user;
            break;
          }
        } catch (e) {
          // Continue to next key
        }
      }
      
      // Only force OFF if there's a REAL authenticated user (not demo)
      if (currentAuthUser && currentAuthUser.email && 
          !currentAuthUser.email.includes('demo') && 
          currentAuthUser.email !== 'alex.demo@athro.app') {
        console.log('🔒 Real user authenticated - demo mode forced OFF');
        this.disableDemoMode();
        return false;
      }
    } catch (error) {
      // If security check fails, continue with normal demo mode check
      console.log('⚠️ Security check failed, continuing with demo mode check:', error);
    }
    
    return this.isEnabled || localStorage.getItem('demo_mode_enabled') === 'true';
  }

  getDemoProfile(): DemoProfile {
    return {
      id: 'demo-user-123',
      full_name: 'Alex Thompson',
      preferred_name: 'Alex',
      school: 'Westfield Academy',
      year: 11,
      email: 'alex.demo@athro.app',
      user_tier: 'full',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      created_at: '2024-09-15T10:30:00Z',
      last_sign_in_at: new Date().toISOString()
    };
  }

  // Demo login credentials
  getDemoLoginCredentials() {
    return {
      email: 'alex.demo@athro.app',
      password: 'AthroDemo2024!',
      profile: this.getDemoProfile()
    };
  }

  getDemoDocuments(): DemoDocument[] {
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Literature', 'History', 'Geography', 'Computer Science'];
    const fileTypes = [
      { ext: 'pdf', type: 'application/pdf', sizeRange: [500000, 5000000] },
      { ext: 'docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', sizeRange: [100000, 1000000] },
      { ext: 'txt', type: 'text/plain', sizeRange: [5000, 50000] },
      { ext: 'jpg', type: 'image/jpeg', sizeRange: [200000, 2000000] },
      { ext: 'png', type: 'image/png', sizeRange: [300000, 3000000] }
    ];

    const documents: DemoDocument[] = [];
    
    // Generate 28 documents (near upload limit for demo)
    for (let i = 0; i < 28; i++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      const size = Math.floor(Math.random() * (fileType.sizeRange[1] - fileType.sizeRange[0])) + fileType.sizeRange[0];
      
      documents.push({
        id: `doc-${i + 1}`,
        name: this.generateDocumentName(subject, fileType.ext),
        type: fileType.type,
        size,
        url: `https://demo-storage.athro.app/documents/doc-${i + 1}.${fileType.ext}`,
        uploaded_at: this.getRandomDate(30),
        subject,
        tags: this.generateTags(subject)
      });
    }

    return documents.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  getDemoConversations(): DemoConversation[] {
    const conversations: DemoConversation[] = [
      {
        id: 'conv-1',
        title: 'Quadratic Equations Help',
        subject: 'Mathematics',
        created_at: this.getRandomDate(7),
        updated_at: this.getRandomDate(2),
        messages: [
          {
            role: 'user',
            content: 'Can you help me understand how to solve quadratic equations using the quadratic formula?',
            timestamp: this.getRandomDate(7)
          },
          {
            role: 'assistant',
            content: 'Of course! The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a. Let me break this down step by step...',
            timestamp: this.getRandomDate(7)
          },
          {
            role: 'user',
            content: 'That makes sense! Can you give me a practice problem?',
            timestamp: this.getRandomDate(7)
          },
          {
            role: 'assistant',
            content: 'Sure! Try solving: 2x² + 5x - 3 = 0. Use a=2, b=5, c=-3 in the formula.',
            timestamp: this.getRandomDate(7)
          }
        ]
      },
      {
        id: 'conv-2',
        title: 'Photosynthesis Process',
        subject: 'Biology',
        created_at: this.getRandomDate(14),
        updated_at: this.getRandomDate(5),
        messages: [
          {
            role: 'user',
            content: 'I need help understanding the light-dependent reactions in photosynthesis',
            timestamp: this.getRandomDate(14)
          },
          {
            role: 'assistant',
            content: 'The light-dependent reactions occur in the thylakoid membranes. Here\'s what happens: 1) Light energy is absorbed by chlorophyll...',
            timestamp: this.getRandomDate(14)
          }
        ]
      },
      {
        id: 'conv-3',
        title: 'Shakespeare Analysis - Macbeth',
        subject: 'English Literature',
        created_at: this.getRandomDate(21),
        updated_at: this.getRandomDate(1),
        messages: [
          {
            role: 'user',
            content: 'What are the main themes in Macbeth and how does Shakespeare develop them?',
            timestamp: this.getRandomDate(21)
          },
          {
            role: 'assistant',
            content: 'Macbeth explores several key themes: 1) Ambition and its consequences, 2) Guilt and conscience, 3) Appearance vs reality...',
            timestamp: this.getRandomDate(21)
          }
        ]
      }
    ];

    // Generate more conversations
    const subjects = ['Physics', 'Chemistry', 'History', 'Geography', 'Computer Science'];
    const topics: Record<string, string[]> = {
      'Physics': ['Newton\'s Laws', 'Electromagnetic Waves', 'Quantum Mechanics', 'Thermodynamics'],
      'Chemistry': ['Organic Reactions', 'Periodic Table', 'Chemical Bonding', 'Acids and Bases'],
      'History': ['World War II', 'Industrial Revolution', 'Cold War', 'Medieval Period'],
      'Geography': ['Climate Change', 'Tectonic Plates', 'River Systems', 'Urban Development'],
      'Computer Science': ['Python Programming', 'Data Structures', 'Algorithms', 'Web Development']
    };

    subjects.forEach((subject, index) => {
      const topic = topics[subject]?.[Math.floor(Math.random() * topics[subject].length)] || 'General Topic';
      conversations.push({
        id: `conv-${conversations.length + 1}`,
        title: `${topic} Discussion`,
        subject,
        created_at: this.getRandomDate(30),
        updated_at: this.getRandomDate(10),
        messages: [
          {
            role: 'user',
            content: `Can you explain ${topic.toLowerCase()} in simple terms?`,
            timestamp: this.getRandomDate(30)
          },
          {
            role: 'assistant',
            content: `${topic} is a fascinating topic! Let me break it down for you...`,
            timestamp: this.getRandomDate(30)
          }
        ]
      });
    });

    return conversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getDemoPlaylists(): DemoPlaylist[] {
    return [
      {
        id: 'playlist-1',
        name: 'A-Level Maths Revision',
        description: 'Complete revision materials for A-Level Mathematics',
        subject: 'Mathematics',
        created_at: this.getRandomDate(14),
        resources: [
          {
            id: 'res-1',
            title: 'Calculus Fundamentals',
            type: 'video',
            url: 'https://youtube.com/watch?v=demo1',
            duration: 1800
          },
          {
            id: 'res-2',
            title: 'Integration Techniques',
            type: 'document',
            url: 'https://demo.athro.app/docs/integration.pdf'
          },
          {
            id: 'res-3',
            title: 'Practice Problems Set 1',
            type: 'quiz',
            url: 'https://demo.athro.app/quiz/calc1'
          }
        ]
      },
      {
        id: 'playlist-2',
        name: 'Biology Cell Structure',
        description: 'Understanding cellular biology and organelles',
        subject: 'Biology',
        created_at: this.getRandomDate(21),
        resources: [
          {
            id: 'res-4',
            title: 'Cell Membrane Structure',
            type: 'video',
            url: 'https://youtube.com/watch?v=demo2',
            duration: 1200
          },
          {
            id: 'res-5',
            title: 'Mitochondria Function',
            type: 'article',
            url: 'https://demo.athro.app/articles/mitochondria'
          }
        ]
      },
      {
        id: 'playlist-3',
        name: 'Physics Mechanics',
        description: 'Classical mechanics and motion',
        subject: 'Physics',
        created_at: this.getRandomDate(7),
        resources: [
          {
            id: 'res-6',
            title: 'Forces and Motion',
            type: 'video',
            url: 'https://youtube.com/watch?v=demo3',
            duration: 2100
          },
          {
            id: 'res-7',
            title: 'Momentum Conservation',
            type: 'document',
            url: 'https://demo.athro.app/docs/momentum.pdf'
          }
        ]
      }
    ];
  }

  getDemoCalendarEvents(): DemoCalendarEvent[] {
    const events: DemoCalendarEvent[] = [];
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English Literature', 'History'];
    const eventTypes = ['study', 'exam', 'assignment', 'break'] as const;

    // Generate events for the next 30 days
    for (let i = 0; i < 25; i++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
      startDate.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1 + Math.floor(Math.random() * 3));

      events.push({
        id: `event-${i + 1}`,
        title: this.generateEventTitle(subject, type),
        description: `${type === 'study' ? 'Study session' : type === 'exam' ? 'Examination' : type === 'assignment' ? 'Assignment due' : 'Break time'} for ${subject}`,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        subject,
        type,
        completed: Math.random() > 0.7 && startDate < new Date()
      });
    }

    return events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  getDemoWellbeingEntries(): DemoWellbeingEntry[] {
    const entries: DemoWellbeingEntry[] = [];
    const gratitudeOptions = [
      'Understood a difficult concept today',
      'Had a great study session with friends',
      'Teacher gave helpful feedback',
      'Feeling confident about upcoming exam',
      'Made progress on assignment',
      'Good night\'s sleep helped with focus'
    ];

    // Generate 14 days of wellbeing data
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      entries.push({
        id: `wellbeing-${i + 1}`,
        date: date.toISOString().split('T')[0],
        mood: Math.floor(Math.random() * 4) + 6, // 6-10 range (generally positive)
        stress_level: Math.floor(Math.random() * 6) + 3, // 3-8 range
        energy_level: Math.floor(Math.random() * 5) + 5, // 5-9 range
        sleep_hours: Math.random() * 3 + 6, // 6-9 hours
        notes: i % 3 === 0 ? 'Had a productive study day' : i % 3 === 1 ? 'Feeling a bit overwhelmed with workload' : 'Good balance today',
        gratitude_entries: [
          gratitudeOptions[Math.floor(Math.random() * gratitudeOptions.length)],
          gratitudeOptions[Math.floor(Math.random() * gratitudeOptions.length)]
        ]
      });
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getDemoFlashcardDecks(): DemoFlashcardDeck[] {
    return [
      {
        id: 'deck-1',
        name: 'Calculus Formulas',
        subject: 'Mathematics',
        created_at: this.getRandomDate(14),
        cards: [
          {
            id: 'card-1',
            front: 'What is the derivative of sin(x)?',
            back: 'cos(x)',
            difficulty: 'easy',
            last_reviewed: this.getRandomDate(2),
            next_review: this.getFutureDate(1)
          },
          {
            id: 'card-2',
            front: 'What is the integral of 1/x?',
            back: 'ln|x| + C',
            difficulty: 'medium',
            last_reviewed: this.getRandomDate(3),
            next_review: this.getFutureDate(2)
          },
          {
            id: 'card-3',
            front: 'State the chain rule',
            back: 'If y = f(g(x)), then dy/dx = f\'(g(x)) × g\'(x)',
            difficulty: 'hard',
            last_reviewed: this.getRandomDate(1),
            next_review: this.getFutureDate(3)
          }
        ]
      },
      {
        id: 'deck-2',
        name: 'Chemistry Elements',
        subject: 'Chemistry',
        created_at: this.getRandomDate(21),
        cards: [
          {
            id: 'card-4',
            front: 'What is the atomic number of Carbon?',
            back: '6',
            difficulty: 'easy',
            last_reviewed: this.getRandomDate(1),
            next_review: this.getFutureDate(1)
          },
          {
            id: 'card-5',
            front: 'What is the molecular formula for glucose?',
            back: 'C₆H₁₂O₆',
            difficulty: 'medium',
            last_reviewed: this.getRandomDate(4),
            next_review: this.getFutureDate(2)
          }
        ]
      }
    ];
  }

  // Helper methods
  private generateDocumentName(subject: string, extension: string): string {
    const prefixes: Record<string, string[]> = {
      'Mathematics': ['Calculus Notes', 'Algebra Homework', 'Statistics Assignment', 'Geometry Proofs'],
      'Physics': ['Mechanics Lab', 'Waves Experiment', 'Thermodynamics Notes', 'Quantum Physics'],
      'Chemistry': ['Organic Chemistry', 'Periodic Table', 'Chemical Reactions', 'Lab Report'],
      'Biology': ['Cell Biology', 'Genetics Study', 'Ecology Notes', 'Human Anatomy'],
      'English Literature': ['Shakespeare Essay', 'Poetry Analysis', 'Novel Study', 'Literary Criticism'],
      'History': ['World War Study', 'Ancient Civilizations', 'Historical Essay', 'Timeline Notes'],
      'Geography': ['Climate Change', 'Tectonic Plates', 'Population Study', 'Urban Geography'],
      'Computer Science': ['Python Code', 'Algorithm Notes', 'Data Structures', 'Web Development']
    };

    const subjectPrefixes = prefixes[subject] || ['Study Notes', 'Assignment', 'Research', 'Project'];
    const prefix = subjectPrefixes[Math.floor(Math.random() * subjectPrefixes.length)];
    const number = Math.floor(Math.random() * 20) + 1;
    
    return `${prefix} ${number}.${extension}`;
  }

  private generateTags(subject: string): string[] {
    const tagOptions: Record<string, string[]> = {
      'Mathematics': ['calculus', 'algebra', 'geometry', 'statistics', 'trigonometry'],
      'Physics': ['mechanics', 'waves', 'thermodynamics', 'electricity', 'quantum'],
      'Chemistry': ['organic', 'inorganic', 'physical', 'analytical', 'biochemistry'],
      'Biology': ['cell-biology', 'genetics', 'ecology', 'anatomy', 'physiology'],
      'English Literature': ['shakespeare', 'poetry', 'novel', 'drama', 'criticism'],
      'History': ['ancient', 'medieval', 'modern', 'war', 'politics'],
      'Geography': ['physical', 'human', 'climate', 'urban', 'environment'],
      'Computer Science': ['programming', 'algorithms', 'data-structures', 'web-dev', 'ai']
    };

    const subjectTags = tagOptions[subject] || ['study', 'notes', 'revision'];
    const numTags = Math.floor(Math.random() * 3) + 1;
    const selectedTags: string[] = [];
    
    for (let i = 0; i < numTags; i++) {
      const tag = subjectTags[Math.floor(Math.random() * subjectTags.length)];
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }
    
    return selectedTags;
  }

  private generateEventTitle(subject: string, type: string): string {
    const templates: Record<string, string[]> = {
      study: [`${subject} Study Session`, `Review ${subject}`, `${subject} Revision`],
      exam: [`${subject} Exam`, `${subject} Test`, `${subject} Assessment`],
      assignment: [`${subject} Assignment Due`, `${subject} Project Deadline`, `${subject} Homework`],
      break: ['Study Break', 'Rest Time', 'Free Period']
    };

    const options = templates[type] || [`${subject} Activity`];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getRandomDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    return date.toISOString();
  }

  private getFutureDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }
}

export const demoDataService = DemoDataService.getInstance(); 