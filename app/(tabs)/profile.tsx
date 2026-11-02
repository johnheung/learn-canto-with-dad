import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { units } from '@/lib/content';
import { LEVELS } from '@/lib/engine/difficulty';
import { MAX_BOX } from '@/lib/engine/srs';
import { dayKey, displayStreak, unitProgress, xpToday } from '@/lib/progress';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ProfileScreen() {
  const { state } = useProgress();
  const now = Date.now();
  const words = Object.values(state.words);
  const mastered = words.filter((w) => w.box >= MAX_BOX - 1).length;
  const crowns = Object.values(state.lessons).reduce((sum, l) => sum + l.crowns, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const ts = now - (6 - i) * DAY;
    return { day: WEEKDAYS[new Date(ts).getDay()], xp: state.xpByDay[dayKey(ts)] ?? 0 };
  });
  const maxXp = Math.max(state.settings.dailyGoal, ...week.map((d) => d.xp));
  const level = LEVELS.find((l) => l.id === state.settings.level)?.label;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your progress</Text>
        <Text style={styles.subtitle}>{level} learner · no account, saved on this device</Text>

        <View style={styles.grid}>
          <Tile icon="flame" color={theme.colors.streak} value={displayStreak(state, now)} label="Day streak" />
          <Tile icon="trophy" color={theme.colors.accent} value={state.streak.best} label="Best streak" />
          <Tile icon="flash" color={theme.colors.xp} value={state.xp} label="Total XP" />
          <Tile icon="ribbon" color={theme.colors.primary} value={crowns} label="Lesson levels" />
          <Tile icon="book" color={theme.colors.success} value={words.length} label="Words learned" />
          <Tile icon="star" color={theme.colors.heart} value={mastered} label="Words mastered" />
        </View>

        <Text style={styles.section}>This week</Text>
        <View style={styles.card}>
          <Text style={styles.goalText}>
            Today: {xpToday(state, now)} / {state.settings.dailyGoal} XP
          </Text>
          <View style={styles.chart}>
            {week.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(d.xp / maxXp) * 100}%`,
                        backgroundColor: d.xp >= state.settings.dailyGoal ? theme.colors.xp : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.section}>Units</Text>
        {units.map((u) => (
          <View key={u.id} style={styles.unitRow}>
            <Text style={styles.unitName}>
              {u.index + 1}. {u.title}
            </Text>
            <View style={styles.unitBar}>
              <ProgressBar value={unitProgress(state, u)} height={10} color={u.color} />
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Tile({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: number;
  label: string;
}) {
  const { isTablet } = useLayout();
  return (
    <View style={[styles.tile, { flexBasis: isTablet ? '15%' : '30%' }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
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
  section: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing(3),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
  },
  goalText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  chart: {
    flexDirection: 'row',
    height: 120,
    gap: theme.spacing(2),
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  unitName: {
    color: theme.colors.text,
    width: 150,
    fontWeight: '600',
  },
  unitBar: {
    flex: 1,
    flexDirection: 'row',
  },
});
