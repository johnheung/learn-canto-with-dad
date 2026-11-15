import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { formatClock } from '@/lib/dashboard';
import { theme } from '@/lib/theme';

/** Ticking ⏱ m:ss of time spent in this session (paused while the app is in the background). */
export function SessionClock({ activeMs }: { activeMs: () => number }) {
  const [ms, setMs] = useState(activeMs());
  useEffect(() => {
    const id = setInterval(() => setMs(activeMs()), 1000);
    return () => clearInterval(id);
  }, [activeMs]);
  return (
    <Text style={styles.clock} testID="session-clock" accessibilityLabel={`Time learning: ${formatClock(ms)}`}>
      ⏱ {formatClock(ms)}
    </Text>
  );
}

const styles = StyleSheet.create({
  clock: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    overflow: 'hidden',
  },
});
