import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatPill } from '@/components/StatPills';
import { useProgress } from '@/lib/context/ProgressContext';
import { currentHearts, displayStreak } from '@/lib/progress';
import { theme } from '@/lib/theme';

export function HeaderStats() {
  const { state } = useProgress();
  const now = Date.now();
  return (
    <View style={styles.header}>
      <View style={styles.flag}>
        <Text style={styles.flagText}>粵</Text>
      </View>
      <StatPill testID="streak" icon="flame" color={theme.colors.streak} value={displayStreak(state, now)} />
      <StatPill testID="stars" icon="star" color={theme.colors.xp} value={state.totals.stars} />
      <StatPill
        icon="heart"
        color={theme.colors.heart}
        value={state.settings.hearts ? currentHearts(state, now) : '∞'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(5),
    paddingVertical: theme.spacing(3),
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.surfaceAlt,
  },
  flag: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
});
