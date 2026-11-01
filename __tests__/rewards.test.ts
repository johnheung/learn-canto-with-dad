import { describe, expect, it } from '@jest/globals';
import { getWord, units } from '@/lib/content';
import { seededRng } from '@/lib/engine/random';
import { mood, nextStage, stageIndex, STAGES, starsForAccuracy } from '@/lib/mascot';
import { completeLesson, initialState } from '@/lib/progress';
import {
  addReward,
  claimReward,
  deleteReward,
  describeGoal,
  readyRewardCount,
  rewardProgress,
  rewardStatus,
  updateReward,
} from '@/lib/rewards';
import { isPageComplete, PAGE_BONUS_STARS, STICKER_PAGES, TOTAL_STICKERS } from '@/lib/stickers';
import { ProgressState } from '@/lib/types';

const DAY = 86400000;
const T0 = new Date(2026, 0, 10, 12).getTime();

function finish(s: ProgressState, opts: { correct?: number; unitIndex?: number; t?: number; seed?: number } = {}) {
  return completeLesson(
    s,
    { kind: 'lesson', id: 'u1-l1', unitIndex: opts.unitIndex ?? 0, correct: opts.correct ?? 10, total: 10, mistakes: 10 - (opts.correct ?? 10) },
    opts.t ?? T0,
    units.length,
    seededRng(opts.seed ?? 1),
  );
}

describe('stickers', () => {
  it('use real course words, one page per unit', () => {
    expect(STICKER_PAGES.map((p) => p.unitId)).toEqual(units.map((u) => u.id));
    for (const page of STICKER_PAGES) {
      const unitWords = new Set(units.find((u) => u.id === page.unitId)!.lessons.flatMap((l) => l.words.map((w) => w.id)));
      for (const st of page.stickers) {
        expect(getWord(st.wordId)).toBeDefined();
        expect(unitWords.has(st.wordId)).toBe(true);
        expect(st.emoji).toBeTruthy();
      }
    }
    expect(TOTAL_STICKERS).toBe(64);
  });

  it('every lesson earns a sticker from its unit, new ones first, and a full page earns bonus stars', () => {
    let s = initialState(T0);
    const page = STICKER_PAGES[2];
    const seen = new Set<string>();
    let bonusAt = -1;
    for (let i = 0; i < page.stickers.length; i++) {
      const r = finish(s, { unitIndex: 2, seed: i + 1 });
      expect(r.sticker?.isNew).toBe(true);
      expect(page.stickers.map((x) => x.wordId)).toContain(r.sticker!.sticker.wordId);
      seen.add(r.sticker!.sticker.wordId);
      if (r.pageCompleted) bonusAt = i;
      s = r.state;
    }
    expect(seen.size).toBe(page.stickers.length);
    expect(isPageComplete(s, page)).toBe(true);
    expect(bonusAt).toBe(page.stickers.length - 1);
    // 8 perfect lessons × 3 stars + page bonus.
    expect(s.totals.stars).toBe(8 * 3 + PAGE_BONUS_STARS);
    // Page already full: duplicates, no second bonus.
    const again = finish(s, { unitIndex: 2 });
    expect(again.sticker?.isNew).toBe(false);
    expect(again.pageCompleted).toBeUndefined();
  });
});

describe('stars and buddy', () => {
  it('gives 1–3 stars by accuracy', () => {
    expect(starsForAccuracy(1)).toBe(3);
    expect(starsForAccuracy(0.9)).toBe(3);
    expect(starsForAccuracy(0.7)).toBe(2);
    expect(starsForAccuracy(0.5)).toBe(1);
    expect(finish(initialState(T0), { correct: 6 }).starsEarned).toBe(1);
  });

  it('grows through stages with XP and reports when it grows', () => {
    expect(stageIndex(0)).toBe(0);
    expect(stageIndex(10)).toBe(1);
    expect(stageIndex(99999)).toBe(STAGES.length - 1);
    expect(nextStage(99999)).toBeNull();
    expect(nextStage(55)).toMatchObject({ xpToGo: 45, next: 'Kid' });
    // The first lesson (15 XP) hatches the egg.
    expect(finish(initialState(T0)).newStage).toBe(1);
    const s = { ...initialState(T0), xp: 50 };
    expect(finish(s).newStage).toBeUndefined();
  });

  it('is happy after practice today, misses her after a day off, then gets sleepy', () => {
    const s = finish(initialState(T0)).state;
    expect(mood(s, T0)).toBe('happy');
    expect(mood(s, T0 + DAY)).toBe('missing');
    expect(mood(s, T0 + 3 * DAY)).toBe('sleepy');
  });
});

describe('rewards', () => {
  it('counts lessons from when the reward was set and unlocks at the target', () => {
    let s = finish(initialState(T0)).state; // one lesson before the reward exists
    s = addReward(s, { title: 'Ice cream', goal: 'lessons', target: 2, repeat: false }, T0);
    const r = () => s.rewards[0];
    expect(rewardProgress(s, r(), T0)).toBe(0);
    s = finish(s).state;
    expect(rewardStatus(s, r(), T0)).toBe('in-progress');
    s = finish(s).state;
    expect(rewardStatus(s, r(), T0)).toBe('ready');
    expect(readyRewardCount(s, T0)).toBe(1);
    s = claimReward(s, r().id, T0);
    expect(rewardStatus(s, r(), T0)).toBe('claimed');
    expect(r().claims).toHaveLength(1);
    // Claiming twice does nothing.
    s = claimReward(s, r().id, T0);
    expect(r().claims).toHaveLength(1);
  });

  it('cannot be claimed before it is unlocked', () => {
    let s = addReward(initialState(T0), { title: 'Toy', goal: 'stars', target: 30, repeat: false }, T0);
    s = claimReward(s, s.rewards[0].id, T0);
    expect(s.rewards[0].claims).toHaveLength(0);
  });

  it('repeating rewards start counting again after each claim', () => {
    let s = addReward(initialState(T0), { title: 'Pocket money', goal: 'stars', target: 3, repeat: true }, T0);
    s = finish(s).state; // 3 stars + sticker
    expect(rewardStatus(s, s.rewards[0], T0)).toBe('ready');
    s = claimReward(s, s.rewards[0].id, T0);
    expect(rewardStatus(s, s.rewards[0], T0)).toBe('in-progress');
    expect(rewardProgress(s, s.rewards[0], T0)).toBe(0);
    s = finish(s).state;
    expect(rewardStatus(s, s.rewards[0], T0)).toBe('ready');
  });

  it('streak goals use the current streak', () => {
    let s = initialState(T0);
    for (let d = 0; d < 3; d++) s = finish(s, { t: T0 + d * DAY }).state;
    s = addReward(s, { title: 'Movie', goal: 'streak', target: 3, repeat: false }, T0 + 2 * DAY);
    expect(rewardStatus(s, s.rewards[0], T0 + 2 * DAY)).toBe('ready');
    // A broken streak no longer counts.
    expect(rewardStatus(s, s.rewards[0], T0 + 5 * DAY)).toBe('in-progress');
  });

  it('can be edited: a new target keeps progress, a new goal type starts from now', () => {
    let s = addReward(initialState(T0), { title: 'A', goal: 'lessons', target: 5, repeat: false }, T0);
    s = finish(s).state;
    const id = s.rewards[0].id;
    s = updateReward(s, id, { title: 'B', goal: 'lessons', target: 1, repeat: false }, T0);
    expect(s.rewards[0].title).toBe('B');
    expect(rewardStatus(s, s.rewards[0], T0)).toBe('ready');
    s = updateReward(s, id, { title: 'B', goal: 'words', target: 1, repeat: false }, T0);
    expect(rewardProgress(s, s.rewards[0], T0)).toBe(0);
    s = deleteReward(s, id);
    expect(s.rewards).toHaveLength(0);
  });

  it('describes goals in plain English', () => {
    expect(describeGoal('lessons', 10)).toBe('Finish 10 lessons');
    expect(describeGoal('lessons', 1)).toBe('Finish 1 lesson');
    expect(describeGoal('streak', 7)).toBe('Reach a 7-day streak');
    expect(describeGoal('stars', 30)).toBe('Earn 30 stars');
    expect(describeGoal('checkpoints', 2)).toBe('Pass 2 unit tests');
  });
});
