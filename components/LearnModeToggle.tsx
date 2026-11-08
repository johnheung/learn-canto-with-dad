import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useProgress } from '@/lib/context/ProgressContext';
import { LearnMode } from '@/lib/types';
import { tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

const MODES: { id: LearnMode; label: string }[] = [
  { id: 'qa', label: '📝 Questions' },
  { id: 'game', label: '🏮 Game' },
];

/** Switches how lessons are played. Stars from both count towards the same rewards. */
export function LearnModeToggle() {
  const { state, updateSettings } = useProgress();
  const mode = state.settings.learnMode;
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {MODES.map((m) => (
        <Pressable
          key={m.id}
          testID={`mode-${m.id}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === m.id }}
          onPress={() => {
            tapHaptic();
            updateSettings({ learnMode: m.id });
          }}
          style={[styles.option, mode === m.id && styles.active]}
        >
          <Text style={[styles.label, mode === m.id && styles.activeLabel]}>{m.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  active: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 15,
  },
  activeLabel: {
    color: '#FFFFFF',
  },
});
