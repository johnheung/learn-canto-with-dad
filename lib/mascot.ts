import { MascotSpecies, ProgressState } from '@/lib/types';
import { dayKey } from '@/lib/progress';

export const SPECIES: { id: MascotSpecies; emoji: string; hanzi: string; jyutping: string; english: string }[] = [
  { id: 'panda', emoji: '🐼', hanzi: '熊貓', jyutping: 'hung4 maau1', english: 'panda' },
  { id: 'cat', emoji: '🐱', hanzi: '貓', jyutping: 'maau1', english: 'cat' },
  { id: 'dog', emoji: '🐶', hanzi: '狗', jyutping: 'gau2', english: 'dog' },
  { id: 'rabbit', emoji: '🐰', hanzi: '兔仔', jyutping: 'tou3 zai2', english: 'rabbit' },
  { id: 'tiger', emoji: '🐯', hanzi: '老虎', jyutping: 'lou5 fu2', english: 'tiger' },
  { id: 'dragon', emoji: '🐲', hanzi: '龍', jyutping: 'lung4', english: 'dragon' },
];

export function speciesInfo(id: MascotSpecies) {
  return SPECIES.find((s) => s.id === id)!;
}

/** Growth stages by lifetime XP. The buddy hatches after the first lesson. */
export const STAGES = [
  { name: 'Egg', minXp: 0, size: 56, accessory: '' },
  { name: 'Baby', minXp: 10, size: 64, accessory: '' },
  { name: 'Kid', minXp: 100, size: 76, accessory: '🎈' },
  { name: 'Teen', minXp: 300, size: 88, accessory: '🎒' },
  { name: 'Grown-up', minXp: 700, size: 100, accessory: '👑' },
  { name: 'Master', minXp: 1500, size: 112, accessory: '✨' },
];

export function stageIndex(xp: number): number {
  let i = 0;
  while (i + 1 < STAGES.length && xp >= STAGES[i + 1].minXp) i++;
  return i;
}

/** Progress (0–1) toward the next stage, and the XP still needed; null at the last stage. */
export function nextStage(xp: number): { progress: number; xpToGo: number; next: string } | null {
  const i = stageIndex(xp);
  if (i + 1 >= STAGES.length) return null;
  const from = STAGES[i].minXp;
  const to = STAGES[i + 1].minXp;
  return { progress: (xp - from) / (to - from), xpToGo: to - xp, next: STAGES[i + 1].name };
}

export function mascotEmoji(state: ProgressState): string {
  if (!state.mascot) return '🥚';
  return stageIndex(state.xp) === 0 ? '🥚' : speciesInfo(state.mascot.species).emoji;
}

export interface Phrase {
  hanzi: string;
  jyutping: string;
  english: string;
}

const CHEERS: Phrase[] = [
  { hanzi: '你好叻！', jyutping: 'nei5 hou2 lek1', english: "You're so clever!" },
  { hanzi: '好嘢！', jyutping: 'hou2 je5', english: 'Yay!' },
  { hanzi: '做得好！', jyutping: 'zou6 dak1 hou2', english: 'Well done!' },
  { hanzi: '加油！', jyutping: 'gaa1 jau2', english: 'Keep going!' },
];

export type Mood = 'happy' | 'missing' | 'sleepy';

/** Happy after practising today, missing her after a day off, sleepy after longer. */
export function mood(state: ProgressState, now: number): Mood {
  const last = state.streak.lastDay;
  if (last === dayKey(now)) return 'happy';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return last === dayKey(yesterday.getTime()) ? 'missing' : 'sleepy';
}

export function moodPhrase(m: Mood, now: number): Phrase {
  if (m === 'missing') return { hanzi: '我好掛住你！', jyutping: 'ngo5 hou2 gwaa3 zyu6 nei5', english: 'I miss you!' };
  if (m === 'sleepy') return { hanzi: '叫醒我啦！', jyutping: 'giu3 seng2 ngo5 laa1', english: 'Wake me up! Do a lesson.' };
  return cheer(now);
}

/** A cheer that changes through the day, so it isn't always the same. */
export function cheer(seed: number): Phrase {
  return CHEERS[Math.floor(seed / 3_600_000) % CHEERS.length];
}

/** Stars for a lesson: 3 for 90%+, 2 for 70%+, else 1. */
export function starsForAccuracy(accuracy: number): number {
  return accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
}
