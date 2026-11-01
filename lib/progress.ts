import { Level, ProgressState, Unit } from '@/lib/types';
import { units } from '@/lib/content';
import { LEVEL_START_UNIT } from '@/lib/engine/difficulty';
import { Rng } from '@/lib/engine/random';
import { reviewWord } from '@/lib/engine/srs';
import { stageIndex, starsForAccuracy } from '@/lib/mascot';
import { isPageComplete, openUnitIds, PAGE_BONUS_STARS, pageFor, pickSticker, Sticker } from '@/lib/stickers';

export const MAX_HEARTS = 5;
export const HEART_REFILL_MS = 30 * 60 * 1000;
export const MAX_CROWNS = 3;
export const CHECKPOINT_PASS = 0.8;

export const XP = {
  lesson: 10,
  perfectBonus: 5,
  checkpoint: 20,
  practice: 5,
};

export const DAILY_GOALS = [
  { xp: 10, label: 'Casual', detail: '1 lesson a day' },
  { xp: 20, label: 'Regular', detail: '2 lessons a day' },
  { xp: 30, label: 'Serious', detail: '3 lessons a day' },
  { xp: 50, label: 'Intense', detail: '5 lessons a day' },
];

export function initialState(now: number = Date.now()): ProgressState {
  return {
    onboarded: false,
    settings: { level: 'beginner', script: 'auto', sound: true, hearts: false, dailyGoal: 20, voiceTipDismissed: false },
    lessons: {},
    unlockedUnitIndex: 0,
    passedCheckpoints: [],
    xp: 0,
    xpByDay: {},
    streak: { count: 0, lastDay: null, best: 0 },
    hearts: { count: MAX_HEARTS, updatedAt: now },
    words: {},
    mascot: null,
    stickers: {},
    rewards: [],
    totals: { stars: 0, lessons: 0, checkpoints: 0 },
    parentPin: null,
  };
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function previousDay(ts: number): string {
  const d = new Date(ts);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
}

export function completeOnboarding(state: ProgressState, level: Level, dailyGoal: number): ProgressState {
  return {
    ...state,
    onboarded: true,
    settings: { ...state.settings, level, dailyGoal, hearts: level !== 'beginner' },
    unlockedUnitIndex: Math.max(state.unlockedUnitIndex, LEVEL_START_UNIT[level]),
  };
}

// --- Hearts -----------------------------------------------------------------

export function currentHearts(state: ProgressState, now: number): number {
  const { count, updatedAt } = state.hearts;
  if (count >= MAX_HEARTS) return MAX_HEARTS;
  return Math.min(MAX_HEARTS, count + Math.floor((now - updatedAt) / HEART_REFILL_MS));
}

/** Milliseconds until the next heart refills, or null when full. */
export function nextHeartIn(state: ProgressState, now: number): number | null {
  if (currentHearts(state, now) >= MAX_HEARTS) return null;
  return HEART_REFILL_MS - ((now - state.hearts.updatedAt) % HEART_REFILL_MS);
}

function setHearts(state: ProgressState, count: number, now: number): ProgressState {
  // Keep partial refill progress so a lost heart doesn't reset the timer.
  const current = currentHearts(state, now);
  const elapsed = current >= MAX_HEARTS ? 0 : (now - state.hearts.updatedAt) % HEART_REFILL_MS;
  return {
    ...state,
    hearts: { count: Math.max(0, Math.min(MAX_HEARTS, count)), updatedAt: count >= MAX_HEARTS ? now : now - elapsed },
  };
}

export function loseHeart(state: ProgressState, now: number): ProgressState {
  return setHearts(state, currentHearts(state, now) - 1, now);
}

export function gainHeart(state: ProgressState, now: number): ProgressState {
  return setHearts(state, currentHearts(state, now) + 1, now);
}

// --- Answers & completion ---------------------------------------------------

export function recordAnswer(state: ProgressState, wordIds: string[], correct: boolean, now: number): ProgressState {
  const words = { ...state.words };
  for (const id of wordIds) words[id] = reviewWord(words[id], correct, now);
  return { ...state, words };
}

function addXp(state: ProgressState, xp: number, now: number): ProgressState {
  const today = dayKey(now);
  const { streak } = state;
  let count = streak.count;
  if (streak.lastDay !== today) count = streak.lastDay === previousDay(now) ? count + 1 : 1;
  return {
    ...state,
    xp: state.xp + xp,
    xpByDay: { ...state.xpByDay, [today]: (state.xpByDay[today] ?? 0) + xp },
    streak: { count, lastDay: today, best: Math.max(streak.best, count) },
  };
}

/** The streak shown to the user: it lapses after a full missed day. */
export function displayStreak(state: ProgressState, now: number): number {
  const { lastDay, count } = state.streak;
  return lastDay === dayKey(now) || lastDay === previousDay(now) ? count : 0;
}

export function xpToday(state: ProgressState, now: number): number {
  return state.xpByDay[dayKey(now)] ?? 0;
}

export type CompletionKind = 'lesson' | 'checkpoint' | 'practice';

export interface CompletionResult {
  state: ProgressState;
  xpEarned: number;
  passed: boolean;
  starsEarned: number;
  sticker?: { sticker: Sticker; isNew: boolean };
  /** A sticker page was just filled; its bonus is included in starsEarned. */
  pageCompleted?: string;
  /** The buddy grew to this stage. */
  newStage?: number;
}

export function completeLesson(
  state: ProgressState,
  args: { kind: CompletionKind; id: string; unitIndex?: number; correct: number; total: number; mistakes: number },
  now: number,
  unitCount: number,
  rng: Rng = Math.random,
): CompletionResult {
  const accuracy = args.total > 0 ? args.correct / args.total : 0;
  let next = state;
  let xpEarned = 0;
  let passed = true;
  let starsEarned = 1;

  if (args.kind === 'lesson') {
    const prev = state.lessons[args.id] ?? { crowns: 0, bestAccuracy: 0 };
    next = {
      ...next,
      lessons: {
        ...next.lessons,
        [args.id]: { crowns: Math.min(MAX_CROWNS, prev.crowns + 1), bestAccuracy: Math.max(prev.bestAccuracy, accuracy) },
      },
    };
    xpEarned = XP.lesson + (args.mistakes === 0 ? XP.perfectBonus : 0);
    starsEarned = starsForAccuracy(accuracy);
  } else if (args.kind === 'checkpoint') {
    passed = accuracy >= CHECKPOINT_PASS;
    if (passed && args.unitIndex !== undefined) {
      next = {
        ...next,
        passedCheckpoints: [...new Set([...next.passedCheckpoints, args.id])],
        unlockedUnitIndex: Math.max(next.unlockedUnitIndex, Math.min(unitCount - 1, args.unitIndex + 1)),
      };
    }
    xpEarned = passed ? XP.checkpoint : XP.practice;
    starsEarned = passed ? 3 : 1;
  } else {
    xpEarned = XP.practice;
    next = gainHeart(next, now);
  }

  // Every finished session earns a sticker: from its unit, or from any open unit for practice.
  const unitId =
    args.unitIndex !== undefined ? units[args.unitIndex]?.id : pickFrom(openUnitIds(next), rng);
  let sticker: CompletionResult['sticker'];
  let pageCompleted: string | undefined;
  const page = unitId ? pageFor(unitId) : undefined;
  if (page) {
    const picked = pickSticker(next, page.unitId, rng);
    if (picked) {
      const wasComplete = isPageComplete(next, page);
      const isNew = !next.stickers[picked.wordId];
      next = { ...next, stickers: { ...next.stickers, [picked.wordId]: (next.stickers[picked.wordId] ?? 0) + 1 } };
      sticker = { sticker: picked, isNew };
      if (!wasComplete && isPageComplete(next, page)) {
        pageCompleted = page.unitId;
        starsEarned += PAGE_BONUS_STARS;
      }
    }
  }

  next = {
    ...next,
    totals: {
      stars: next.totals.stars + starsEarned,
      lessons: next.totals.lessons + 1,
      checkpoints: next.totals.checkpoints + (args.kind === 'checkpoint' && passed ? 1 : 0),
    },
  };

  const stageBefore = stageIndex(state.xp);
  const finalState = addXp(next, xpEarned, now);
  const stageAfter = stageIndex(finalState.xp);

  return {
    state: finalState,
    xpEarned,
    passed,
    starsEarned,
    sticker,
    pageCompleted,
    newStage: stageAfter > stageBefore ? stageAfter : undefined,
  };
}

function pickFrom<T>(items: T[], rng: Rng): T | undefined {
  return items.length ? items[Math.floor(rng() * items.length)] : undefined;
}

// --- Unlocking --------------------------------------------------------------

export function isUnitUnlocked(state: ProgressState, unitIndex: number): boolean {
  return unitIndex <= state.unlockedUnitIndex;
}

export function crownsFor(state: ProgressState, lessonId: string): number {
  return state.lessons[lessonId]?.crowns ?? 0;
}

export function isLessonUnlocked(state: ProgressState, unit: Unit, lessonIndex: number): boolean {
  if (!isUnitUnlocked(state, unit.index)) return false;
  if (lessonIndex === 0 || unit.index < state.unlockedUnitIndex) return true;
  return crownsFor(state, unit.lessons[lessonIndex - 1].id) > 0;
}

export function isCheckpointUnlocked(state: ProgressState, unit: Unit): boolean {
  if (!isUnitUnlocked(state, unit.index)) return false;
  return unit.index < state.unlockedUnitIndex || unit.lessons.every((l) => crownsFor(state, l.id) > 0);
}

export function unitProgress(state: ProgressState, unit: Unit): number {
  const total = unit.lessons.length * MAX_CROWNS;
  const done = unit.lessons.reduce((sum, l) => sum + crownsFor(state, l.id), 0);
  return done / total;
}
