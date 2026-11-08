export type Level = 'beginner' | 'intermediate' | 'advanced';

/** How Cantonese text is presented. `auto` lets the difficulty profile decide. */
export type ScriptPreference = 'auto' | 'jyutping' | 'both' | 'characters';
export type ScriptMode = 'jyutping' | 'both' | 'characters';

export interface Word {
  id: string;
  hanzi: string;
  jyutping: string;
  english: string;
  /** Extra English answers accepted when typing. */
  alt?: string[];
}

export interface Token {
  hanzi: string;
  jyutping: string;
}

export interface Sentence {
  id: string;
  tokens: Token[];
  english: string;
  alt?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  words: Word[];
  sentences: Sentence[];
}

export interface Unit {
  id: string;
  index: number;
  title: string;
  hanziTitle: string;
  description: string;
  color: string;
  lessons: Lesson[];
}

interface ExerciseBase {
  id: string;
  /** Words this exercise tests, for spaced-repetition updates. */
  wordIds: string[];
}

export type Exercise =
  | (ExerciseBase & { kind: 'mc-meaning'; word: Word; options: string[]; answer: string; isNew?: boolean })
  | (ExerciseBase & { kind: 'mc-cantonese'; word: Word; options: Word[]; answerId: string })
  | (ExerciseBase & { kind: 'listen'; word: Word; options: Word[]; answerId: string })
  | (ExerciseBase & { kind: 'match'; pairs: Word[] })
  | (ExerciseBase & { kind: 'tone'; word: Word; syllableIndex: number; options: number[]; answer: number })
  | (ExerciseBase & { kind: 'build-en'; sentence: Sentence; bank: string[]; answer: string[] })
  | (ExerciseBase & { kind: 'build-yue'; sentence: Sentence; bank: Token[]; answer: Token[] })
  | (ExerciseBase & { kind: 'type'; word: Word; requireTones: boolean });

export type ExerciseKind = Exercise['kind'];

export interface DifficultyProfile {
  score: number;
  exerciseCount: number;
  optionCount: number;
  toneOptionCount: number;
  distractorTokens: number;
  similarDistractors: boolean;
  script: ScriptMode;
  requireTones: boolean;
  reviewWords: number;
  weights: Record<ExerciseKind, number>;
}

export interface WordProgress {
  box: number;
  due: number;
  seen: number;
  correct: number;
}

export interface LessonProgress {
  crowns: number;
  bestAccuracy: number;
}

export interface Settings {
  level: Level;
  script: ScriptPreference;
  sound: boolean;
  hearts: boolean;
  dailyGoal: number;
  /** The "install a Cantonese voice" tip on the Learn screen was dismissed. */
  voiceTipDismissed: boolean;
  /** How lessons are played: questions and answers, or the Lantern Catch game. */
  learnMode: LearnMode;
}

export type LearnMode = 'qa' | 'game';

/** One learning session, for the time log and dashboard. */
export interface SessionLog {
  id: string;
  lessonId: string;
  kind: 'lesson' | 'checkpoint' | 'practice';
  mode: LearnMode;
  startedAt: number;
  /** Time spent with the app open, excluding time in the background. */
  activeMs: number;
  stars: number;
  /** 0–1, first-attempt accuracy (or catches for the game). */
  accuracy: number;
  /** False if she quit or ran out of hearts/lives. */
  completed: boolean;
}

export type MascotSpecies = 'panda' | 'cat' | 'dog' | 'rabbit' | 'tiger' | 'dragon';

export interface Mascot {
  species: MascotSpecies;
  name: string;
}

/** What a reward's progress is measured in. */
export type RewardGoal = 'stars' | 'lessons' | 'streak' | 'words' | 'checkpoints';

export interface Totals {
  stars: number;
  lessons: number;
  checkpoints: number;
}

/** A real-life reward set by a parent, unlocked by reaching a goal. */
export interface Reward {
  id: string;
  title: string;
  goal: RewardGoal;
  target: number;
  /**
   * Goal value progress counts from: 0 for new rewards (everything she's done counts),
   * moved up after each claim of a repeating reward. Not used for star rewards, which
   * are paid for from the star balance instead.
   */
  baseline: number;
  /** Start again after each claim, e.g. a weekly treat. */
  repeat: boolean;
  /** Claim times, newest last. A non-repeating reward is done once claimed. */
  claims: number[];
}

export interface ProgressState {
  onboarded: boolean;
  settings: Settings;
  lessons: Record<string, LessonProgress>;
  /** Units with index <= this are open. */
  unlockedUnitIndex: number;
  passedCheckpoints: string[];
  xp: number;
  xpByDay: Record<string, number>;
  streak: { count: number; lastDay: string | null; best: number };
  hearts: { count: number; updatedAt: number };
  words: Record<string, WordProgress>;
  mascot: Mascot | null;
  /** Sticker id → times collected. */
  stickers: Record<string, number>;
  rewards: Reward[];
  /** Lifetime counters that reward goals are measured against. */
  totals: Totals;
  /** Parent PIN guarding rewards and resets. */
  parentPin: string | null;
  /** Stars spent on rewards; the balance is totals.stars − starsSpent. */
  starsSpent: number;
  /** Learning sessions, oldest first (newest kept when trimmed). */
  sessions: SessionLog[];
  /** Best Lantern Catch score per lesson id. */
  gameBest: Record<string, number>;
}
