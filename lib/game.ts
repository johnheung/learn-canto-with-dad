import { ProgressState, Word } from '@/lib/types';
import { allWords, contentBefore, getWord, LessonRef } from '@/lib/content';
import { difficultyScore } from '@/lib/engine/difficulty';
import { pickDistractors } from '@/lib/engine/generateLesson';
import { MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { Rng, shuffle } from '@/lib/engine/random';
import { wordsToReview } from '@/lib/engine/srs';
import { crownsFor } from '@/lib/progress';

// Lantern Catch: hear (or read) a word, tap the lantern with its meaning before it lands.

export const LIVES = 3;
const MAX_MULTIPLIER = 4;
const POINTS = 100;

export interface Wave {
  id: number;
  target: Word;
  /** One lantern per lane; exactly one is the target. */
  options: Word[];
  /**
   * Easy: the prompt is Cantonese (spoken, plus text) and lanterns show English.
   * Hard: the prompt is English and lanterns show Cantonese.
   */
  promptCantonese: boolean;
}

export function waveCount(score: number): number {
  return 12 + Math.min(3, Math.floor(score / 3));
}

export function laneCount(score: number): number {
  return score < 4 ? 3 : 4;
}

/** How long lanterns take to fall: slower when easy, faster each wave, never under 3s. */
export function fallMs(score: number, waveIndex: number): number {
  return Math.round(Math.max(3000, Math.min(7000, 7000 - score * 300 - waveIndex * 120)));
}

export function multiplier(combo: number): number {
  return Math.min(MAX_MULTIPLIER, 1 + Math.floor(combo / 3));
}

/** Points for a catch made with `combo` catches already in a row. */
export function pointsFor(combo: number): number {
  return POINTS * multiplier(combo);
}

/** Every focus word comes up at least once, in shuffled rounds, before any repeats. */
export function buildWaves(focus: Word[], pool: Word[], score: number, rng: Rng, count = waveCount(score)): Wave[] {
  const targets: Word[] = [];
  while (targets.length < count) targets.push(...shuffle(focus, rng));
  const lanes = laneCount(score);
  return targets.slice(0, count).map((target, id) => ({
    id,
    target,
    options: shuffle([target, ...pickDistractors(target, pool, lanes - 1, score >= 4, rng)], rng),
    promptCantonese: score < 5,
  }));
}

export interface GamePlan {
  waves: Wave[];
  score: number;
}

/** Words for a game: the lesson's own words plus a little review, or her weakest words for practice. */
export function planGame(state: ProgressState, ref: LessonRef, rng: Rng, now: number): GamePlan {
  const level = state.settings.level;
  if (ref.kind === 'lesson') {
    const score = difficultyScore(level, ref.unit.index, crownsFor(state, ref.lesson.id));
    const before = contentBefore(ref.unit.index, ref.lessonIndex).words.filter((w) => state.words[w.id]);
    const review = shuffle(before, rng).slice(0, Math.min(2, Math.floor(score / 3)));
    return { waves: buildWaves([...ref.lesson.words, ...review], allWords, score, rng), score };
  }
  if (ref.kind === 'practice') {
    const words = wordsToReview(state.words, now, 8)
      .map(getWord)
      .filter((w): w is Word => !!w);
    const score = difficultyScore(level, state.unlockedUnitIndex, 0);
    if (words.length < MIN_PRACTICE_WORDS) return { waves: [], score };
    return { waves: buildWaves(words, allWords, score, rng), score };
  }
  // Unit tests are always played as questions.
  return { waves: [], score: 0 };
}
