import { LearnMode, SessionLog } from '@/lib/types';
import { dayKey } from '@/lib/progress';

/** "45s", "4m 12s", "1h 05m". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export interface DayStat {
  day: string;
  /** Local midnight, for labels. */
  date: Date;
  minutes: number;
  stars: number;
  sessions: number;
}

/** One entry per calendar day for the last `days` days (oldest first), including empty days. */
export function dailyStats(sessions: SessionLog[], now: number, days: number): DayStat[] {
  const out: DayStat[] = [];
  const index = new Map<string, DayStat>();
  const today = new Date(now);
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const stat = { day: dayKey(date.getTime()), date, minutes: 0, stars: 0, sessions: 0 };
    out.push(stat);
    index.set(stat.day, stat);
  }
  for (const s of sessions) {
    const stat = index.get(dayKey(s.startedAt));
    if (!stat) continue;
    stat.minutes += s.activeMs / 60000;
    stat.stars += s.stars;
    stat.sessions += 1;
  }
  return out;
}

export interface Summary {
  todayMs: number;
  weekMs: number;
  totalMs: number;
  sessions: number;
  weekSessions: number;
  averageMs: number;
  byMode: Record<LearnMode, number>;
}

/** Totals for the dashboard tiles. "This week" is the last 7 days including today. */
export function summarize(sessions: SessionLog[], now: number): Summary {
  const today = new Date(now);
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).getTime();
  const todayKey = dayKey(now);
  const summary: Summary = { todayMs: 0, weekMs: 0, totalMs: 0, sessions: sessions.length, weekSessions: 0, averageMs: 0, byMode: { qa: 0, game: 0 } };
  for (const s of sessions) {
    summary.totalMs += s.activeMs;
    summary.byMode[s.mode] += s.activeMs;
    if (dayKey(s.startedAt) === todayKey) summary.todayMs += s.activeMs;
    if (s.startedAt >= weekStart) {
      summary.weekMs += s.activeMs;
      summary.weekSessions += 1;
    }
  }
  summary.averageMs = sessions.length ? summary.totalMs / sessions.length : 0;
  return summary;
}
