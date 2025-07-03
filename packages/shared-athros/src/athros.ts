import { Athro, ConfidenceLevel } from '@athro/shared-types';

export const ATHROS: Athro[] = [
  {
    id: 'athro-english',
    name: 'AthroEnglish',
    subject: 'English Language & Literature',
    description: 'Guides you through English reading, writing, and analysis.',
    image: '/athros/athro-english.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-maths',
    name: 'AthroMaths',
    subject: 'Mathematics & Statistics',
    description: 'Your magical maths mentor for numbers and logic.',
    image: '/athros/athro-maths.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'Edexcel',
    level: 'GCSE'
  },
  {
    id: 'athro-science',
    name: 'AthroScience',
    subject: 'Biology, Chemistry, Physics',
    description: 'Explores the wonders of the natural world with you.',
    image: '/athros/athro-science.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-geography',
    name: 'AthroGeography',
    subject: 'Geography',
    description: 'Takes you on journeys across the globe and through landscapes.',
    image: '/athros/athro-geography.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'OCR',
    level: 'GCSE'
  },
  {
    id: 'athro-history',
    name: 'AthroHistory',
    subject: 'History & Ancient History',
    description: 'Brings the past to life and helps you learn from it.',
    image: '/athros/athro-history.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-rs',
    name: 'AthroRS',
    subject: 'Religious Studies',
    description: 'Explores beliefs, values, and worldviews.',
    image: '/athros/athro-rs.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'WJEC',
    level: 'GCSE'
  },
  {
    id: 'athro-languages',
    name: 'AthroLanguages',
    subject: 'Languages',
    description: 'Helps you master new languages and communication.',
    image: '/athros/athro-languages.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-designtech',
    name: 'AthroDesignTech',
    subject: 'Design, Engineering & Technology',
    description: 'Inspires creativity in design and technology.',
    image: '/athros/athro-designtech.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-drama',
    name: 'AthroDrama',
    subject: 'Drama & Dance',
    description: 'Brings stories to life through performance and movement.',
    image: '/athros/athro-drama.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-it',
    name: 'AthroIT',
    subject: 'Computer Science & ICT',
    description: 'Guides you through coding and digital skills.',
    image: '/athros/athro-it.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-business',
    name: 'AthroBusiness',
    subject: 'Business & Economics',
    description: 'Teaches you about enterprise, finance, and the world of work.',
    image: '/athros/athro-business.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-cookery',
    name: 'AthroCookery',
    subject: 'Food & Nutrition',
    description: 'Explores the science and art of food.',
    image: '/athros/athro-cookery.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-media',
    name: 'AthroMedia',
    subject: 'Media & Film Studies',
    description: 'Guides you through media literacy and film analysis.',
    image: '/athros/athro-media.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-social',
    name: 'AthroSocial',
    subject: 'Psychology, Sociology & Citizenship',
    description: 'Explores the mind, society, and your place in it.',
    image: '/athros/athro-social.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  },
  {
    id: 'athro-welsh',
    name: 'AthroCymraeg',
    subject: 'Welsh Language & Literature',
    description: 'Celebrates Welsh language and culture.',
    image: '/athros/athro-welsh.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'WJEC',
    level: 'GCSE'
  },
  {
    id: 'athro-nature',
    name: 'AthroNature',
    subject: 'Nature & Agriculture',
    description: 'Connects you with the environment and sustainability.',
    image: '/athros/athro-nature.jpg',
    isPriority: false,
    confidenceLevel: 'MEDIUM',
    examBoard: 'AQA',
    level: 'GCSE'
  }
];

export const getAthroById = (id: string): Athro | undefined => {
  return ATHROS.find(athro => athro.id === id);
};

export const getAllAthros = (): Athro[] => {
  return [...ATHROS];
};

export const getAthrosBySubject = (subject: string): Athro[] => {
  return ATHROS.filter(athro => athro.subject.toLowerCase().includes(subject.toLowerCase()));
}; 