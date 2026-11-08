import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { BarChart } from '@/components/BarChart';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { resolveLesson } from '@/lib/content';
import { dailyStats, formatDuration, summarize } from '@/lib/dashboard';
import { useLayout } from '@/lib/layout';
import { goToTab } from '@/lib/navigation';
import { SessionLog } from '@/lib/types';
import { theme } from '@/lib/theme';

const PAGE = 30;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function lessonTitle(s: SessionLog): string {
  const ref = resolveLesson(s.lessonId);
  if (!ref) return s.lessonId;
  if (ref.kind === 'practice') return 'Practice';
  if (ref.kind === 'checkpoint') return `${ref.unit.title} unit test`;
  return `${ref.unit.title}: ${ref.lesson.title}`;
}

function when(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Time spent learning: totals, daily graphs and every session. */
export default function DashboardScreen() {
  const { state } = useProgress();
  const layout = useLayout();
  const now = Date.now();
  const [days, setDays] = useState<7 | 30>(7);
  const [shown, setShown] = useState(PAGE);

  const summary = summarize(state.sessions, now);
  const stats = dailyStats(state.sessions, now, days);
  const label = (d: Date) => (days === 7 ? WEEKDAYS[d.getDay()][0] : String(d.getDate()));
  const sessions = [...state.sessions].reverse();
  const modeTotal = summary.byMode.qa + summary.byMode.game;

  const charts = (
    <>
      <View style={styles.tiles}>
        <Tile label="Today" value={formatDuration(summary.todayMs)} testID="tile-today" />
        <Tile label="This week" value={formatDuration(summary.weekMs)} testID="tile-week" />
        <Tile label="Sessions this week" value={String(summary.weekSessions)} />
        <Tile label="Average session" value={formatDuration(summary.averageMs)} />
      </View>

      <View style={styles.segmented}>
        {([7, 30] as const).map((d) => (
          <Pressable key={d} testID={`range-${d}`} onPress={() => setDays(d)} style={[styles.segment, days === d && styles.segmentActive]}>
            <Text style={[styles.segmentText, days === d && styles.segmentTextActive]}>Last {d} days</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Minutes learning</Text>
        <BarChart
          testID="chart-minutes"
          bars={stats.map((d) => ({ label: label(d.date), value: d.minutes }))}
          color={theme.colors.primary}
          format={(m) => (m < 1 && m > 0 ? '<1m' : `${Math.round(m)}m`)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Stars earned</Text>
        <BarChart
          testID="chart-stars"
          bars={stats.map((d) => ({ label: label(d.date), value: d.stars }))}
          color={theme.colors.xp}
          format={(v) => String(Math.round(v))}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Questions vs Game</Text>
        {modeTotal > 0 ? (
          <>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>📝 Questions</Text>
              <View style={styles.splitBar}>
                <ProgressBar value={summary.byMode.qa / modeTotal} color={theme.colors.primary} height={10} />
              </View>
              <Text style={styles.splitValue}>{formatDuration(summary.byMode.qa)}</Text>
            </View>
            <View style={styles.splitRow}>
              <Text style={styles.splitLabel}>🏮 Game</Text>
              <View style={styles.splitBar}>
                <ProgressBar value={summary.byMode.game / modeTotal} color={theme.colors.accent} height={10} />
              </View>
              <Text style={styles.splitValue}>{formatDuration(summary.byMode.game)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>No sessions yet.</Text>
        )}
        <Text style={styles.muted}>All time: {formatDuration(summary.totalMs)}</Text>
      </View>
    </>
  );

  const log = (
    <>
      <Text style={styles.section}>Session log ({state.sessions.length})</Text>
      {sessions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.muted}>Sessions appear here after a lesson or game.</Text>
          <Button label="Start learning" onPress={() => goToTab('/')} />
        </View>
      ) : (
        sessions.slice(0, shown).map((s) => (
          <View key={s.id} style={styles.logRow} testID="session-row">
            <Text style={styles.logIcon}>{s.mode === 'game' ? '🏮' : '📝'}</Text>
            <View style={styles.logText}>
              <Text style={styles.logTitle} numberOfLines={1}>
                {lessonTitle(s)}
              </Text>
              <Text style={styles.muted}>{when(s.startedAt)}</Text>
            </View>
            <View style={styles.logStats}>
              <Text style={styles.logTime}>{formatDuration(s.activeMs)}</Text>
              <Text style={styles.muted}>{s.completed ? `⭐ ${s.stars}` : 'not finished'}</Text>
            </View>
          </View>
        ))
      )}
      {sessions.length > shown ? (
        <Button testID="show-more" label="Show more" variant="secondary" onPress={() => setShown((n) => n + PAGE)} />
      ) : null}
    </>
  );

  return (
    <Screen wide={layout.isWide} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable testID="dashboard-back" onPress={() => (router.canGoBack() ? router.back() : goToTab('/profile'))} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>Learning dashboard</Text>
      </View>
      {layout.isWide ? (
        <View style={styles.columns}>
          <ScrollView style={styles.column} contentContainerStyle={styles.content}>
            {charts}
          </ScrollView>
          <ScrollView style={styles.column} contentContainerStyle={styles.content}>
            {log}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {charts}
          {log}
        </ScrollView>
      )}
    </Screen>
  );
}

function Tile({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.tile} testID={testID}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingHorizontal: theme.spacing(4),
    paddingTop: theme.spacing(3),
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  content: {
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
    gap: 2,
  },
  tileValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  tileLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  splitLabel: {
    color: theme.colors.text,
    width: 104,
    fontWeight: '700',
  },
  splitBar: {
    flex: 1,
    flexDirection: 'row',
  },
  splitValue: {
    color: theme.colors.textMuted,
    width: 64,
    textAlign: 'right',
    fontWeight: '700',
  },
  section: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing(2),
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
  },
  logIcon: {
    fontSize: 22,
  },
  logText: {
    flex: 1,
    gap: 2,
  },
  logTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  logStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
  logTime: {
    color: theme.colors.text,
    fontWeight: '800',
  },
});
