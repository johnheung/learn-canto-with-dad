import { ProgressState, Reward, RewardGoal } from '@/lib/types';
import { displayStreak, starBalance } from '@/lib/progress';

export const REWARD_GOALS: { id: RewardGoal; label: string; unit: string; defaultTarget: number; step: number }[] = [
  { id: 'stars', label: 'Costs stars', unit: 'stars', defaultTarget: 30, step: 5 },
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
      return `Costs ${plural(target, 'star')}`;
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

/** What's still needed, e.g. "18 more ⭐", "3 more lessons", "a 2-day longer streak". */
export function describeRemaining(goal: RewardGoal, remaining: number): string {
  switch (goal) {
    case 'stars':
      return `${remaining} more ⭐`;
    case 'lessons':
      return `${plural(remaining, 'more lesson')}`;
    case 'streak':
      return `${plural(remaining, 'more day')} in a row`;
    case 'words':
      return `${plural(remaining, 'more new word')}`;
    case 'checkpoints':
      return `${plural(remaining, 'more unit test')}`;
  }
}

/** Current value of a goal's measure. Stars are her spendable balance. */
export function goalValue(state: ProgressState, goal: RewardGoal, now: number): number {
  switch (goal) {
    case 'stars':
      return starBalance(state);
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

/**
 * Stars are paid from the balance and streaks count as they stand; other goals count
 * everything she has done (baseline 0), or since the last claim of a repeating reward.
 */
function countsFromBaseline(goal: RewardGoal): boolean {
  return goal !== 'streak' && goal !== 'stars';
}

export function rewardProgress(state: ProgressState, reward: Reward, now: number): number {
  const value = goalValue(state, reward.goal, now);
  return Math.max(0, countsFromBaseline(reward.goal) ? value - reward.baseline : value);
}

export function rewardRemaining(state: ProgressState, reward: Reward, now: number): number {
  return Math.max(0, reward.target - rewardProgress(state, reward, now));
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
    // Everything she has already done counts, whenever the reward is created.
    baseline: 0,
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
            // A new kind of goal counts everything she has done; a changed target keeps progress so far.
            baseline: draft.goal === r.goal ? r.baseline : 0,
          },
    ),
  };
}

export function deleteReward(state: ProgressState, id: string): ProgressState {
  return { ...state, rewards: state.rewards.filter((r) => r.id !== id) };
}

/**
 * Claims a reward that is ready. A star reward is paid for from the balance; another
 * repeating reward starts counting again from now.
 */
export function claimReward(state: ProgressState, id: string, now: number): ProgressState {
  const reward = state.rewards.find((r) => r.id === id);
  if (!reward || rewardStatus(state, reward, now) !== 'ready') return state;
  const claimed: Reward = {
    ...reward,
    claims: [...reward.claims, now],
    baseline: reward.repeat && reward.goal !== 'stars' ? goalValue(state, reward.goal, now) : reward.baseline,
  };
  return {
    ...state,
    starsSpent: state.starsSpent + (reward.goal === 'stars' ? reward.target : 0),
    rewards: state.rewards.map((r) => (r.id === id ? claimed : r)),
  };
}

export function readyRewardCount(state: ProgressState, now: number): number {
  return state.rewards.filter((r) => rewardStatus(state, r, now) === 'ready').length;
}
