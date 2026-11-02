import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { displayStreak, xpToday } from '@/lib/progress';
import { theme } from '@/lib/theme';

/** Today's goal and streak at a glance (shown beside the path on wide screens). */
export function TodayCard() {
  const { state } = useProgress();
  const now = Date.now();
  const today = xpToday(state, now);
  const goal = state.settings.dailyGoal;
  const streak = displayStreak(state, now);

  return (
    <View style={styles.card} testID="today-card">
      <Text style={styles.title}>Today</Text>
      <Text style={styles.detail}>
        {Math.min(today, goal)} / {goal} XP{today >= goal ? ' · goal reached! 🎉' : ''}
      </Text>
      <View style={styles.bar}>
        <ProgressBar value={today / goal} color={theme.colors.xp} />
      </View>
      <Text style={styles.detail}>
        🔥 {streak}-day streak{streak > 0 && today === 0 ? ' · practise today to keep it' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  bar: {
    flexDirection: 'row',
  },
});
