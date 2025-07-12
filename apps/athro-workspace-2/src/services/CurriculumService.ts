import { AthroPersonality } from './openai';

// UK Curriculum Standards and Specifications
export interface CurriculumSpecification {
  subject: string;
  examBoard: string;
  level: 'GCSE' | 'A-Level';
  topics: string[];
  skills: string[];
  assessmentObjectives: string[];
  terminology: string[];
}

// UK Exam Boards
export const UK_EXAM_BOARDS = {
  AQA: 'Assessment and Qualifications Alliance',
  EDEXCEL: 'Pearson Edexcel',
  OCR: 'Oxford, Cambridge and RSA Examinations',
  WJEC: 'Welsh Joint Education Committee',
  CCEA: 'Council for the Curriculum, Examinations and Assessment'
} as const;

// UK Qualification Levels
export const UK_LEVELS = {
  GCSE: 'General Certificate of Secondary Education',
  A_LEVEL: 'Advanced Level',
  AS_LEVEL: 'Advanced Subsidiary Level'
} as const;

// Curriculum specifications for different subjects and exam boards
export const CURRICULUM_SPECIFICATIONS: Record<string, CurriculumSpecification> = {
  'english-aqa-gcse': {
    subject: 'English Language & Literature',
    examBoard: 'AQA',
    level: 'GCSE',
    topics: [
      'Reading and comprehension',
      'Writing for different purposes and audiences',
      'Spoken language',
      'Shakespeare and the 19th-century novel',
      'Modern texts and poetry',
      'Unseen poetry',
      'Creative writing',
      'Transactional writing'
    ],
    skills: [
      'Critical analysis',
      'Creative writing',
      'Comparative analysis',
      'Contextual understanding',
      'Language analysis',
      'Form and structure analysis'
    ],
    assessmentObjectives: [
      'AO1: Identify and interpret explicit and implicit information and ideas',
      'AO2: Explain, comment on and analyse how writers use language and structure',
      'AO3: Compare writers\' ideas and perspectives',
      'AO4: Evaluate texts critically and support with textual references',
      'AO5: Communicate clearly, effectively and imaginatively',
      'AO6: Use a range of vocabulary and sentence structures for clarity'
    ],
    terminology: [
      'Alliteration', 'Metaphor', 'Simile', 'Personification', 'Onomatopoeia',
      'Rhyme scheme', 'Iambic pentameter', 'Sonnet', 'Ballad', 'Free verse',
      'Narrative voice', 'Point of view', 'Characterisation', 'Setting',
      'Theme', 'Motif', 'Symbolism', 'Irony', 'Foreshadowing', 'Climax'
    ]
  },
  'maths-edexcel-gcse': {
    subject: 'Mathematics & Statistics',
    examBoard: 'Edexcel',
    level: 'GCSE',
    topics: [
      'Number and place value',
      'Fractions, decimals and percentages',
      'Ratio and proportion',
      'Algebra',
      'Geometry and measures',
      'Statistics and probability',
      'Pythagoras\' theorem',
      'Trigonometry',
      'Quadratic equations',
      'Linear graphs',
      'Circle theorems',
      'Vectors'
    ],
    skills: [
      'Problem solving',
      'Mathematical reasoning',
      'Mathematical fluency',
      'Mathematical modelling',
      'Statistical analysis',
      'Geometric reasoning'
    ],
    assessmentObjectives: [
      'AO1: Use and apply standard techniques',
      'AO2: Reason, interpret and communicate mathematically',
      'AO3: Solve problems within mathematics and in other contexts'
    ],
    terminology: [
      'Coefficient', 'Variable', 'Expression', 'Equation', 'Inequality',
      'Function', 'Gradient', 'Intercept', 'Vertex', 'Root', 'Factor',
      'Prime factorisation', 'Highest common factor', 'Lowest common multiple',
      'Surd', 'Rational number', 'Irrational number', 'Real number'
    ]
  },
  'science-aqa-gcse': {
    subject: 'Science (Biology, Chemistry, Physics)',
    examBoard: 'AQA',
    level: 'GCSE',
    topics: [
      'Cell biology',
      'Organisation',
      'Infection and response',
      'Bioenergetics',
      'Homeostasis and response',
      'Inheritance, variation and evolution',
      'Ecology',
      'Atomic structure and the periodic table',
      'Bonding, structure and properties of matter',
      'Quantitative chemistry',
      'Chemical changes',
      'Energy changes',
      'The rate and extent of chemical change',
      'Organic chemistry',
      'Chemical analysis',
      'Chemistry of the atmosphere',
      'Using resources',
      'Energy',
      'Electricity',
      'Particle model of matter',
      'Atomic structure',
      'Forces',
      'Waves',
      'Magnetism and electromagnetism',
      'Space physics'
    ],
    skills: [
      'Scientific enquiry',
      'Data analysis',
      'Experimental design',
      'Critical evaluation',
      'Mathematical skills',
      'Practical skills'
    ],
    assessmentObjectives: [
      'AO1: Demonstrate knowledge and understanding of scientific ideas',
      'AO2: Apply knowledge and understanding of scientific ideas',
      'AO3: Analyse information and ideas to interpret and evaluate'
    ],
    terminology: [
      'Hypothesis', 'Variable', 'Control', 'Independent variable', 'Dependent variable',
      'Reliability', 'Validity', 'Accuracy', 'Precision', 'Systematic error',
      'Random error', 'Mean', 'Median', 'Mode', 'Range', 'Standard deviation',
      'Correlation', 'Causation', 'Placebo', 'Double-blind trial'
    ]
  },
  'geography-ocr-gcse': {
    subject: 'Geography',
    examBoard: 'OCR',
    level: 'GCSE',
    topics: [
      'Global hazards',
      'Changing climate',
      'Distinctive landscapes',
      'Sustaining ecosystems',
      'Urban futures',
      'Dynamic development',
      'UK in the 21st century',
      'Resource reliance',
      'Fieldwork and geographical skills'
    ],
    skills: [
      'Geographical enquiry',
      'Data collection and analysis',
      'Map reading and interpretation',
      'Fieldwork skills',
      'Critical thinking',
      'Spatial awareness'
    ],
    assessmentObjectives: [
      'AO1: Demonstrate knowledge of locations, places, processes, environments and different scales',
      'AO2: Demonstrate geographical understanding of concepts and how they are used',
      'AO3: Apply knowledge and understanding to interpret, analyse and evaluate geographical information',
      'AO4: Select, adapt and use a variety of skills and techniques to investigate questions'
    ],
    terminology: [
      'Ecosystem', 'Biodiversity', 'Sustainability', 'Climate change', 'Global warming',
      'Urbanisation', 'Migration', 'Demographic transition', 'Economic development',
      'Globalisation', 'Interdependence', 'Natural hazard', 'Risk assessment',
      'Geographic information system (GIS)', 'Remote sensing', 'Cartography'
    ]
  },
  'history-aqa-gcse': {
    subject: 'History',
    examBoard: 'AQA',
    level: 'GCSE',
    topics: [
      'Period studies',
      'Wider world depth studies',
      'Thematic studies',
      'British depth studies',
      'Historical investigation',
      'Source analysis'
    ],
    skills: [
      'Historical enquiry',
      'Source analysis and evaluation',
      'Chronological understanding',
      'Cause and consequence',
      'Change and continuity',
      'Significance',
      'Interpretation'
    ],
    assessmentObjectives: [
      'AO1: Demonstrate knowledge and understanding of the key features and characteristics',
      'AO2: Explain and analyse historical events and periods studied',
      'AO3: Analyse, evaluate and use sources to make substantiated judgements',
      'AO4: Analyse, evaluate and make substantiated judgements about interpretations'
    ],
    terminology: [
      'Primary source', 'Secondary source', 'Bias', 'Reliability', 'Validity',
      'Chronology', 'Causation', 'Consequence', 'Change', 'Continuity',
      'Significance', 'Interpretation', 'Evidence', 'Corroboration',
      'Context', 'Perspective', 'Historiography', 'Archive'
    ]
  },
  'rs-wjec-gcse': {
    subject: 'Religious Studies',
    examBoard: 'WJEC',
    level: 'GCSE',
    topics: [
      'Religious, philosophical and ethical studies',
      'Study of religions',
      'Christianity',
      'Islam',
      'Judaism',
      'Buddhism',
      'Hinduism',
      'Sikhism',
      'Philosophy of religion',
      'Religion and ethics'
    ],
    skills: [
      'Critical analysis',
      'Philosophical reasoning',
      'Ethical evaluation',
      'Comparative study',
      'Textual analysis',
      'Reflective thinking'
    ],
    assessmentObjectives: [
      'AO1: Demonstrate knowledge and understanding of religion and belief',
      'AO2: Analyse and evaluate aspects of religion and belief',
      'AO3: Demonstrate knowledge and understanding of religion and belief'
    ],
    terminology: [
      'Theism', 'Atheism', 'Agnosticism', 'Monotheism', 'Polytheism',
      'Pantheism', 'Deism', 'Secularism', 'Humanism', 'Utilitarianism',
      'Virtue ethics', 'Divine command theory', 'Natural law', 'Karma',
      'Dharma', 'Nirvana', 'Enlightenment', 'Salvation', 'Grace', 'Sin'
    ]
  },
  'languages-aqa-gcse': {
    subject: 'Languages',
    examBoard: 'AQA',
    level: 'GCSE',
    topics: [
      'Identity and culture',
      'Local, national, international and global areas of interest',
      'Current and future study and employment',
      'Grammar and structures',
      'Vocabulary',
      'Pronunciation and intonation'
    ],
    skills: [
      'Listening comprehension',
      'Speaking and interaction',
      'Reading comprehension',
      'Writing',
      'Translation',
      'Cultural awareness'
    ],
    assessmentObjectives: [
      'AO1: Understand and respond to different types of spoken language',
      'AO2: Communicate and interact effectively in speech',
      'AO3: Understand and respond to different types of written language',
      'AO4: Communicate in writing'
    ],
    terminology: [
      'Conjugation', 'Declension', 'Gender', 'Case', 'Tense', 'Mood',
      'Voice', 'Aspect', 'Register', 'Dialect', 'Accent', 'Intonation',
      'Stress', 'Phoneme', 'Morpheme', 'Syntax', 'Semantics', 'Pragmatics'
    ]
  }
};

export class CurriculumService {
  /**
   * Get curriculum specification for a given athro personality
   */
  static getCurriculumSpecification(personality: AthroPersonality): CurriculumSpecification | null {
    const key = `${personality.subject.toLowerCase().replace(/\s+/g, '-')}-${personality.examBoard.toLowerCase()}-${personality.level.toLowerCase()}`;
    return CURRICULUM_SPECIFICATIONS[key] || null;
  }

  /**
   * Generate curriculum-aligned prompt for quiz generation
   */
  static generateQuizPrompt(subject: string, examBoard: string, level: string, numQuestions: number = 10): string {
    const spec = this.getCurriculumSpecification({ subject, examBoard, level } as AthroPersonality);
    
    if (!spec) {
      return `Generate ${numQuestions} unique multiple-choice questions (with 4 options each) for the subject: ${subject}.
      
IMPORTANT: All questions must align with current UK curriculum standards for ${subject}.
- Questions should be appropriate for ${level} level
- Use terminology and assessment styles consistent with UK exam boards
- Include questions that test key learning objectives from UK curriculum specifications

🚨 CRITICAL UNIVERSAL ACCURACY REQUIREMENTS - 100% ACCURACY ACROSS ALL SUBJECTS:

MATHEMATICS:
- ALL mathematical calculations MUST be 100% correct - NO EXCEPTIONS
- Triangle problems: angles must sum to EXACTLY 180° (not 179° or 181°)
- Arithmetic: verify ALL calculations multiple times before finalizing
- Geometry: double-check ALL area/perimeter formulas and calculations
- Percentages: ensure decimal conversions are EXACT and precise
- Mathematical errors in quiz questions are COMPLETELY UNACCEPTABLE

SCIENCE:
- ALL scientific facts must be 100% accurate - NO EXCEPTIONS
- Chemical symbols and atomic numbers must be correct
- Physics formulas (Speed = Distance ÷ Time) must be exact
- Biology facts must be current and accurate
- NO SCIENTIFIC ERRORS are acceptable

HISTORY:
- ALL historical dates must be 100% accurate - NO EXCEPTIONS
- World War I started in 1914, World War II in 1939
- British monarchs and their reign dates must be correct
- NO HISTORICAL ERRORS are acceptable

ENGLISH:
- ALL literary facts must be 100% accurate - NO EXCEPTIONS
- Shakespeare work classifications must be correct
- Grammar rules must be perfect
- NO LANGUAGE ERRORS are acceptable

GEOGRAPHY:
- ALL capital cities must be 100% correct - NO EXCEPTIONS
- Country and continent facts must be accurate
- NO GEOGRAPHICAL ERRORS are acceptable

LANGUAGES:
- ALL translations must be 100% accurate - NO EXCEPTIONS
- Basic vocabulary must be correct
- NO TRANSLATION ERRORS are acceptable

GENERAL KNOWLEDGE:
- ALL common facts must be 100% accurate - NO EXCEPTIONS
- Days in week (7), months in year (12), etc.
- NO FACTUAL ERRORS are acceptable

TOTAL ACCURACY IS NON-NEGOTIABLE - VERIFY EVERY FACT, CALCULATION, AND ANSWER

Format as JSON array: [{question, options, answer, difficulty}] where 'answer' is the index (0-3) of the correct option.`;
    }

    return `Generate ${numQuestions} unique multiple-choice questions (with 4 options each) for ${subject} (${examBoard} ${level}).

CURRICULUM ALIGNMENT REQUIREMENTS:
- All questions MUST align with the current UK ${level} ${examBoard} curriculum for ${subject}
- Questions should cover topics from the official ${examBoard} ${level} specification: ${spec.topics.join(', ')}
- Test the following skills: ${spec.skills.join(', ')}
- Use terminology consistent with ${examBoard} ${level} exams: ${spec.terminology.join(', ')}
- Include questions that test the specific assessment objectives: ${spec.assessmentObjectives.join('; ')}
- Ensure difficulty levels match ${level} standards (Foundation/Higher for GCSE, AS/A2 for A-Level)

🚨 CRITICAL UNIVERSAL ACCURACY REQUIREMENTS - 100% ACCURACY ACROSS ALL SUBJECTS:

MATHEMATICS:
- ALL mathematical calculations MUST be 100% correct - NO EXCEPTIONS
- Triangle problems: angles must sum to EXACTLY 180° (not 179° or 181°)
- Arithmetic: verify ALL calculations multiple times before finalizing
- Geometry: double-check ALL area/perimeter formulas and calculations
- Percentages: ensure decimal conversions are EXACT and precise
- Algebra: verify equation solving step-by-step
- Statistics: check mean, median, mode calculations carefully
- Mathematical errors in quiz questions are COMPLETELY UNACCEPTABLE

SCIENCE:
- ALL scientific facts must be 100% accurate - NO EXCEPTIONS
- Chemical symbols and atomic numbers must be correct
- Physics formulas (Speed = Distance ÷ Time) must be exact
- Biology facts must be current and accurate
- NO SCIENTIFIC ERRORS are acceptable

HISTORY:
- ALL historical dates must be 100% accurate - NO EXCEPTIONS
- World War I started in 1914, World War II in 1939
- British monarchs and their reign dates must be correct
- NO HISTORICAL ERRORS are acceptable

ENGLISH:
- ALL literary facts must be 100% accurate - NO EXCEPTIONS
- Shakespeare work classifications must be correct
- Grammar rules must be perfect
- NO LANGUAGE ERRORS are acceptable

GEOGRAPHY:
- ALL capital cities must be 100% correct - NO EXCEPTIONS
- Country and continent facts must be accurate
- NO GEOGRAPHICAL ERRORS are acceptable

LANGUAGES:
- ALL translations must be 100% accurate - NO EXCEPTIONS
- Basic vocabulary must be correct
- NO TRANSLATION ERRORS are acceptable

GENERAL KNOWLEDGE:
- ALL common facts must be 100% accurate - NO EXCEPTIONS
- Days in week (7), months in year (12), etc.
- NO FACTUAL ERRORS are acceptable

TOTAL ACCURACY IS NON-NEGOTIABLE - VERIFY EVERY FACT, CALCULATION, AND ANSWER

CRITICAL REQUIREMENTS:
- All questions MUST be aligned with current UK curriculum standards
- Use proper UK educational terminology and assessment language
- Include a mix of easy, medium, and hard questions appropriate for the level
- Questions should test both knowledge recall and application skills
- Ensure all answer options are plausible and well-distributed
- Use clear, unambiguous language suitable for UK students
- MATHEMATICAL ACCURACY IS NON-NEGOTIABLE - verify every calculation

Format as JSON array: [{question, options, answer, difficulty}] where 'answer' is the index (0-3) of the correct option.`;
  }

  /**
   * Generate curriculum-aligned prompt for chat responses
   */
  static generateChatPrompt(personality: AthroPersonality): string {
    const spec = this.getCurriculumSpecification(personality);
    
    if (!spec) {
      return `You are teaching ${personality.subject} according to UK curriculum standards. Always ensure your explanations and examples align with current UK educational requirements and terminology.`;
    }

    return `CURRICULUM ALIGNMENT:
You are teaching ${personality.subject} according to the UK ${personality.examBoard} ${personality.level} curriculum.

CURRICULUM CONTEXT:
- Exam Board: ${personality.examBoard} (${UK_EXAM_BOARDS[personality.examBoard as keyof typeof UK_EXAM_BOARDS]})
- Level: ${personality.level} (${UK_LEVELS[personality.level as keyof typeof UK_LEVELS]})
- Key Topics: ${spec.topics.join(', ')}
- Core Skills: ${spec.skills.join(', ')}
- Assessment Objectives: ${spec.assessmentObjectives.join('; ')}
- Key Terminology: ${spec.terminology.join(', ')}

TEACHING REQUIREMENTS:
- Always reference specific topics from the ${personality.examBoard} ${personality.level} specification
- Use terminology and language consistent with ${personality.examBoard} ${personality.level} exams
- Ensure explanations align with the assessment objectives
- Provide examples that match the difficulty level expected at ${personality.level}
- Reference real-world applications relevant to UK students
- Use assessment language and question styles consistent with ${personality.examBoard} ${personality.level} papers

When creating practice questions, examples, or explanations, always ensure they:
1. Cover topics from the official ${personality.examBoard} ${personality.level} specification
2. Use the correct terminology and assessment language
3. Match the difficulty and style of ${personality.examBoard} ${personality.level} questions
4. Test the specific skills and assessment objectives outlined in the curriculum`;
  }

  /**
   * Validate if a question aligns with curriculum standards
   */
  static validateQuestionAlignment(question: string, personality: AthroPersonality): {
    isAligned: boolean;
    suggestions: string[];
    topics: string[];
  } {
    const spec = this.getCurriculumSpecification(personality);
    if (!spec) {
      return { isAligned: true, suggestions: [], topics: [] };
    }

    const questionLower = question.toLowerCase();
    const foundTopics = spec.topics.filter(topic => 
      questionLower.includes(topic.toLowerCase())
    );
    
    const foundTerminology = spec.terminology.filter(term => 
      questionLower.includes(term.toLowerCase())
    );

    const suggestions: string[] = [];
    if (foundTopics.length === 0) {
      suggestions.push(`Consider including topics from the ${personality.examBoard} ${personality.level} specification: ${spec.topics.slice(0, 5).join(', ')}`);
    }
    
    if (foundTerminology.length === 0) {
      suggestions.push(`Use curriculum terminology like: ${spec.terminology.slice(0, 5).join(', ')}`);
    }

    return {
      isAligned: foundTopics.length > 0 || foundTerminology.length > 0,
      suggestions,
      topics: foundTopics
    };
  }

  /**
   * Get curriculum topics for a subject
   */
  static getCurriculumTopics(personality: AthroPersonality): string[] {
    const spec = this.getCurriculumSpecification(personality);
    return spec?.topics || [];
  }

  /**
   * Get curriculum terminology for a subject
   */
  static getCurriculumTerminology(personality: AthroPersonality): string[] {
    const spec = this.getCurriculumSpecification(personality);
    return spec?.terminology || [];
  }
} 