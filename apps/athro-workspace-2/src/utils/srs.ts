import { Flashcard, FlashcardDifficulty } from '../types/study';

// SuperMemo 2 algorithm parameters
const DEFAULT_EASE_FACTOR = 2.5;
const MINIMUM_EASE_FACTOR = 1.3;
const INITIAL_INTERVAL = 1; // 1 day

interface ReviewResult {
  nextReview: number;
  newEaseFactor: number;
  interval: number;
}

export function calculateNextReview(
  difficulty: FlashcardDifficulty | null | undefined,
  repetitionCount: number,
  previousEaseFactor: number = DEFAULT_EASE_FACTOR,
  previousInterval: number = INITIAL_INTERVAL
): ReviewResult {
  let easeFactor = previousEaseFactor;
  let interval: number;

  // Convert difficulty to numeric quality (treat null/undefined as HARD)
  const quality = difficulty === 'EASY' ? 5 : 
                  difficulty === 'MEDIUM' ? 3 : 
                  difficulty === 'FINISHED' ? 6 : 1; // FINISHED gets highest quality score

  // Special handling for FINISHED cards - set very long interval
  if (difficulty === 'FINISHED') {
    interval = 365; // 1 year
  } else if (repetitionCount === 0) {
    interval = INITIAL_INTERVAL;
  } else if (repetitionCount === 1) {
    interval = 6; // 6 days
  } else {
    interval = Math.round(previousInterval * previousEaseFactor);
  }

  // Update ease factor using SM2 formula
  easeFactor = previousEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor);

  // Calculate next review date
  const now = Date.now();
  const nextReview = now + interval * 24 * 60 * 60 * 1000; // Convert days to milliseconds

  return {
    nextReview,
    newEaseFactor: easeFactor,
    interval
  };
}

export function isCardDue(card: Flashcard): boolean {
  if (!card.nextReview) return true;
  return Date.now() >= card.nextReview;
}

export function getDueCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter(isCardDue);
}
