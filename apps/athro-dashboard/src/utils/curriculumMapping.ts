// Curriculum mapping utility for UK curriculum alignment
export interface CurriculumInfo {
  subject: string;
  examBoard: string;
  level: 'GCSE' | 'A-Level';
}

// Map athro subjects to curriculum information
export const CURRICULUM_MAP: Record<string, { examBoard: string; level: string }> = {
  'English Language & Literature': { examBoard: 'AQA', level: 'GCSE' },
  'Mathematics & Statistics': { examBoard: 'Edexcel', level: 'GCSE' },
  'Biology, Chemistry, Physics': { examBoard: 'AQA', level: 'GCSE' },
  'Geography': { examBoard: 'OCR', level: 'GCSE' },
  'History & Ancient History': { examBoard: 'AQA', level: 'GCSE' },
  'Religious Studies': { examBoard: 'WJEC', level: 'GCSE' },
  'Languages': { examBoard: 'AQA', level: 'GCSE' },
  'Design, Engineering & Technology': { examBoard: 'AQA', level: 'GCSE' },
  'Drama & Dance': { examBoard: 'AQA', level: 'GCSE' },
  'Computer Science & ICT': { examBoard: 'AQA', level: 'GCSE' },
  'Business & Economics': { examBoard: 'AQA', level: 'GCSE' },
  'Food & Nutrition': { examBoard: 'AQA', level: 'GCSE' },
  'Media & Film Studies': { examBoard: 'AQA', level: 'GCSE' },
  'Psychology, Sociology & Citizenship': { examBoard: 'AQA', level: 'GCSE' },
  'Welsh Language & Literature': { examBoard: 'WJEC', level: 'GCSE' },
  'Nature & Agriculture': { examBoard: 'AQA', level: 'GCSE' }
};

/**
 * Get curriculum information for a given subject
 */
export function getCurriculumInfo(subject: string): CurriculumInfo | null {
  const curriculumData = CURRICULUM_MAP[subject];
  if (!curriculumData) {
    return null;
  }

  return {
    subject,
    examBoard: curriculumData.examBoard,
    level: curriculumData.level as 'GCSE' | 'A-Level'
  };
}

/**
 * Get curriculum information for a given subject with fallback
 */
export function getCurriculumInfoWithFallback(subject: string): CurriculumInfo {
  const curriculumInfo = getCurriculumInfo(subject);
  if (curriculumInfo) {
    return curriculumInfo;
  }

  // Fallback to default curriculum info
  return {
    subject,
    examBoard: 'AQA',
    level: 'GCSE'
  };
} 