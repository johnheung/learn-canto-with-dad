import { ProgressState, Reward, RewardGoal } from '@/lib/types';
import { displayStreak } from '@/lib/progress';

export const REWARD_GOALS: { id: RewardGoal; label: string; unit: string; defaultTarget: number; step: number }[] = [
  { id: 'stars', label: 'Earn stars', unit: 'stars', defaultTarget: 30, step: 5 },
  { id: 'lessons', label: 'Finish lessons', unit: 'lessons', defaultTarget: 10, step: 1 },
  { id: 'streak', label: 'Reach a streak', unit: 'days in a row', defaultTarget: 7, step: 1 },
  { id: 'words', label: 'Learn new words', unit: 'words', defaultTarget: 25, step: 5 },
  { id: 'checkpoints', label: 'Pass unit tests', unit: 'unit tests', defaultTarget: 1, step: 1 },
];

export function goalInfo(goal: RewardGoal) {
  return REWARD_GOALS.find((g) => g.id === goal)!;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** e.g. "Finish 10 lessons", "Reach a 7-day streak". */
export function describeGoal(goal: RewardGoal, target: number): string {
  switch (goal) {
    case 'stars':
      return `Earn ${plural(target, 'star')}`;
    case 'lessons':
      return `Finish ${plural(target, 'lesson')}`;
    case 'streak':
      return `Reach a ${target}-day streak`;
    case 'words':
      return `Learn ${plural(target, 'new word')}`;
    case 'checkpoints':
      return `Pass ${plural(target, 'unit test')}`;
  }
}

/** Current value of a goal's measure. */
export function goalValue(state: ProgressState, goal: RewardGoal, now: number): number {
  switch (goal) {
    case 'stars':
      return state.totals.stars;
    case 'lessons':
      return state.totals.lessons;
    case 'checkpoints':
      return state.totals.checkpoints;
    case 'words':
      return Object.keys(state.words).length;
    case 'streak':
      return displayStreak(state, now);
  }
}

/** Streaks count as they stand; everything else counts from when the reward was set. */
function countsFromBaseline(goal: RewardGoal): boolean {
  return goal !== 'streak';
}

export function rewardProgress(state: ProgressState, reward: Reward, now: number): number {
  const value = goalValue(state, reward.goal, now);
  return Math.max(0, countsFromBaseline(reward.goal) ? value - reward.baseline : value);
}

export type RewardStatus = 'in-progress' | 'ready' | 'claimed';

export function rewardStatus(state: ProgressState, reward: Reward, now: number): RewardStatus {
  if (!reward.repeat && reward.claims.length > 0) return 'claimed';
  return rewardProgress(state, reward, now) >= reward.target ? 'ready' : 'in-progress';
}

function newId(now: number): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface RewardDraft {
  title: string;
  goal: RewardGoal;
  target: number;
  repeat: boolean;
}

export function addReward(state: ProgressState, draft: RewardDraft, now: number): ProgressState {
  const reward: Reward = {
    id: newId(now),
    ...draft,
    target: Math.max(1, Math.round(draft.target)),
    baseline: goalValue(state, draft.goal, now),
    claims: [],
  };
  return { ...state, rewards: [...state.rewards, reward] };
}

export function updateReward(state: ProgressState, id: string, draft: RewardDraft, now: number): ProgressState {
  return {
    ...state,
    rewards: state.rewards.map((r) =>
      r.id !== id
        ? r
        : {
            ...r,
            ...draft,
            target: Math.max(1, Math.round(draft.target)),
            // A new kind of goal starts counting from now; a changed target keeps progress so far.
            baseline: draft.goal === r.goal ? r.baseline : goalValue(state, draft.goal, now),
          },
    ),
  };
}

export function deleteReward(state: ProgressState, id: string): ProgressState {
  return { ...state, rewards: state.rewards.filter((r) => r.id !== id) };
}

/** Claims a reward that is ready. A repeating reward starts counting again. */
export function claimReward(state: ProgressState, id: string, now: number): ProgressState {
  return {
    ...state,
    rewards: state.rewards.map((r) => {
      if (r.id !== id || rewardStatus(state, r, now) !== 'ready') return r;
      return {
        ...r,
        claims: [...r.claims, now],
        baseline: r.repeat ? goalValue(state, r.goal, now) : r.baseline,
      };
    }),
  };
}

export function readyRewardCount(state: ProgressState, now: number): number {
  return state.rewards.filter((r) => rewardStatus(state, r, now) === 'ready').length;
}
