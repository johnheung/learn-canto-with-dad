import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Exercise, ScriptMode } from '@/lib/types';
import { Button } from '@/components/Button';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

export interface ExerciseProps<K extends Exercise['kind']> {
  exercise: Extract<Exercise, { kind: K }>;
  script: ScriptMode;
  sound: boolean;
  /** True while the feedback sheet is showing. */
  locked: boolean;
  onResult: (correct: boolean, correction?: string) => void;
}

interface FrameProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
  canCheck?: boolean;
  onCheck?: () => void;
  locked: boolean;
}

export function ExerciseFrame({ title, badge, children, canCheck, onCheck, locked }: FrameProps) {
  const { scale } = useLayout();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={[styles.title, { fontSize: 22 * scale }]}>{title}</Text>
        {children}
      </ScrollView>
      {onCheck && !locked ? (
        <View style={styles.footer}>
          <Button testID="check" label="Check" onPress={onCheck} disabled={!canCheck} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: theme.spacing(5),
    gap: theme.spacing(5),
    paddingBottom: theme.spacing(8),
  },
  badge: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  footer: {
    padding: theme.spacing(5),
    borderTopWidth: 2,
    borderTopColor: theme.colors.surfaceAlt,
  },
});
