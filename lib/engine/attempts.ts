/**
 * Answers in a lesson, by question position. She can go back and answer a question
 * again; the latest answer is the one that counts. Wrong answers are not asked again.
 */
export interface Attempt {
  correct: boolean;
  /** The right answer, shown when hers was wrong. */
  correction?: string;
  /** What she answered. */
  given?: string;
  /** How many times she has answered this question. */
  tries: number;
}

export type Attempts = Record<number, Attempt>;

export function recordAttempt(attempts: Attempts, index: number, result: Omit<Attempt, 'tries'>): Attempts {
  return { ...attempts, [index]: { ...result, tries: (attempts[index]?.tries ?? 0) + 1 } };
}

export interface LessonScore {
  /** Questions whose latest answer is right. */
  correct: number;
  /** Questions whose latest answer is wrong. */
  mistakes: number;
  answered: number;
}

export function scoreAttempts(attempts: Attempts): LessonScore {
  const all = Object.values(attempts);
  const correct = all.filter((a) => a.correct).length;
  return { correct, mistakes: all.length - correct, answered: all.length };
}
