import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';

export interface Bar {
  label: string;
  value: number;
}

interface BarChartProps {
  bars: Bar[];
  color: string;
  /** How a value is written above its bar, e.g. "12m". */
  format: (value: number) => string;
  height?: number;
  testID?: string;
}

/** Simple vertical bar chart. With many bars, only some labels and values are shown. */
export function BarChart({ bars, color, format, height = 140, testID }: BarChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const dense = bars.length > 10;
  const labelEvery = dense ? Math.ceil(bars.length / 6) : 1;

  return (
    <View testID={testID} accessibilityLabel={bars.map((b) => `${b.label}: ${format(b.value)}`).join(', ')}>
      <View style={[styles.plot, { height }]}>
        {bars.map((b, i) => (
          <View key={i} style={styles.column}>
            {!dense && b.value > 0 ? (
              <Text style={styles.value} numberOfLines={1}>
                {format(b.value)}
              </Text>
            ) : null}
            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  { height: `${(b.value / max) * 100}%`, backgroundColor: color, minHeight: b.value > 0 ? 3 : 0 },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {bars.map((b, i) => (
          <Text key={i} style={styles.label} numberOfLines={1}>
            {i % labelEvery === 0 || i === bars.length - 1 ? b.label : ''}
          </Text>
        ))}
      </View>
      {dense ? <Text style={styles.max}>Highest: {format(max)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  value: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  track: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  labels: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  label: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  max: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
