import { describe, expect, it } from '@jest/globals';
import { allWords, resolveLesson, units } from '@/lib/content';
import { seededRng } from '@/lib/engine/random';
import { dailyStats, formatDuration, summarize } from '@/lib/dashboard';
import { buildWaves, fallMs, laneCount, multiplier, planGame, pointsFor, waveCount } from '@/lib/game';
import { completeLesson, initialState, logSession, MAX_SESSIONS, recordGameScore } from '@/lib/progress';
import { SessionLog } from '@/lib/types';

const MIN = 60000;
const day = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).getTime();

function session(startedAt: number, minutes: number, extra: Partial<SessionLog> = {}): Omit<SessionLog, 'id'> {
  return { lessonId: 'u1-l1', kind: 'lesson', mode: 'qa', startedAt, activeMs: minutes * MIN, stars: 2, accuracy: 0.8, completed: true, ...extra };
}

describe('session log', () => {
  it('appends sessions and keeps only the newest', () => {
    let s = initialState(0);
    s = logSession(s, session(day(2026, 10, 1), 5));
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].id).toBeTruthy();
    for (let i = 0; i < MAX_SESSIONS + 5; i++) s = logSession(s, session(day(2026, 10, 2) + i, 1));
    expect(s.sessions).toHaveLength(MAX_SESSIONS);
    expect(s.sessions[s.sessions.length - 1].startedAt).toBe(day(2026, 10, 2) + MAX_SESSIONS + 4);
  });

  it('formats durations', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(4 * MIN + 12_000)).toBe('4m 12s');
    expect(formatDuration(65 * MIN)).toBe('1h 05m');
    expect(formatDuration(0)).toBe('0s');
  });

  it('buckets time and stars by local day, including around midnight', () => {
    const now = day(2026, 10, 8, 9);
    const sessions = [
      session(day(2026, 10, 7, 23, 50), 15, { stars: 3 }), // late yesterday
      session(day(2026, 10, 8, 0, 5), 10, { stars: 1 }), // just after midnight today
      session(day(2026, 10, 8, 8), 5, { mode: 'game', stars: 2 }),
      session(day(2026, 9, 1), 30), // outside the 7-day window
    ].map((s, i) => ({ ...s, id: String(i) }));
    const week = dailyStats(sessions, now, 7);
    expect(week).toHaveLength(7);
    expect(week[6].day).toBe('2026-11-08');
    expect(week[6].minutes).toBeCloseTo(15);
    expect(week[6].stars).toBe(3);
    expect(week[6].sessions).toBe(2);
    expect(week[5].minutes).toBeCloseTo(15);
    expect(week.slice(0, 5).every((d) => d.minutes === 0)).toBe(true);
    expect(dailyStats(sessions, now, 30)).toHaveLength(30);

    const sum = summarize(sessions, now);
    expect(sum.todayMs).toBe(15 * MIN);
    expect(sum.weekMs).toBe(30 * MIN);
    expect(sum.weekSessions).toBe(3);
    expect(sum.totalMs).toBe(60 * MIN);
    expect(sum.averageMs).toBe(15 * MIN);
    expect(sum.byMode.game).toBe(5 * MIN);
    expect(sum.byMode.qa).toBe(55 * MIN);
  });
});

describe('Lantern Catch engine', () => {
  const words = units[2].lessons[0].words;

  it.each([0, 3, 6, 9])('builds valid waves at difficulty %p', (score) => {
    const waves = buildWaves(words, allWords, score, seededRng(score + 1));
    expect(waves).toHaveLength(waveCount(score));
    for (const w of waves) {
      expect(w.options).toHaveLength(laneCount(score));
      expect(w.options.map((o) => o.id)).toContain(w.target.id);
      expect(new Set(w.options.map((o) => o.english)).size).toBe(w.options.length);
      expect(new Set(w.options.map((o) => o.hanzi)).size).toBe(w.options.length);
      expect(w.promptCantonese).toBe(score < 5);
    }
    // Every word comes up before any repeats.
    expect(new Set(waves.slice(0, words.length).map((w) => w.target.id)).size).toBe(words.length);
  });

  it('gets faster each wave and with difficulty, but never too fast', () => {
    expect(fallMs(0, 0)).toBe(7000);
    expect(fallMs(0, 5)).toBeLessThan(fallMs(0, 0));
    expect(fallMs(6, 0)).toBeLessThan(fallMs(0, 0));
    expect(fallMs(10, 14)).toBe(3000);
  });

  it('rewards combos, up to ×4', () => {
    expect([0, 2, 3, 6, 9, 30].map(multiplier)).toEqual([1, 1, 2, 3, 4, 4]);
    expect(pointsFor(0)).toBe(100);
    expect(pointsFor(9)).toBe(400);
  });

  it('plans games for lessons and practice, never for unit tests', () => {
    const s = initialState(0);
    expect(planGame(s, resolveLesson('u1-l1')!, seededRng(1), 0).waves.length).toBeGreaterThan(10);
    expect(planGame(s, resolveLesson('u1-checkpoint')!, seededRng(1), 0).waves).toHaveLength(0);
    expect(planGame(s, resolveLesson('practice')!, seededRng(1), 0).waves).toHaveLength(0); // no words learned yet
  });

  it('keeps the best score per lesson', () => {
    let s = initialState(0);
    let r = recordGameScore(s, 'u1-l1', 800);
    expect(r.best).toBe(true);
    s = r.state;
    r = recordGameScore(s, 'u1-l1', 500);
    expect(r.best).toBe(false);
    expect(r.state.gameBest['u1-l1']).toBe(800);
  });

  it('a finished game earns stars like a lesson, adding to the same total', () => {
    let s = initialState(0);
    s = completeLesson(s, { kind: 'lesson', id: 'u1-l1', unitIndex: 0, correct: 10, total: 10, mistakes: 0 }, 0, units.length, seededRng(1)).state; // questions
    s = completeLesson(s, { kind: 'lesson', id: 'u1-l1', unitIndex: 0, correct: 12, total: 12, mistakes: 0 }, 0, units.length, seededRng(2)).state; // game
    expect(s.totals.stars).toBe(6);
    expect(s.lessons['u1-l1'].crowns).toBe(2);
  });
});
