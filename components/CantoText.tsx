import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScriptMode } from '@/lib/types';
import { syllables } from '@/lib/engine/grading';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

interface CantoTextProps {
  hanzi: string;
  jyutping: string;
  mode: ScriptMode;
  size?: 'sm' | 'md' | 'lg';
  /** Show this syllable's tone as "?" (tone exercises). */
  hideToneAt?: number;
  color?: string;
  align?: 'center' | 'flex-start';
  /** Tap to reveal Jyutping in characters mode. Off inside tappable answer cards. */
  revealable?: boolean;
}

const SIZES = {
  sm: { main: 18, sub: 12 },
  md: { main: 24, sub: 14 },
  lg: { main: 40, sub: 18 },
};

/**
 * Cantonese in the current script mode. In `characters` mode the Jyutping is
 * hidden until the learner taps, as a hint.
 */
export function CantoText({
  hanzi,
  jyutping,
  mode,
  size = 'md',
  hideToneAt,
  color,
  align = 'center',
  revealable = true,
}: CantoTextProps) {
  const [revealed, setRevealed] = useState(false);
  const { scale } = useLayout();
  const sz = { main: SIZES[size].main * scale, sub: SIZES[size].sub * scale };
  const textColor = color ?? theme.colors.text;

  const jp =
    hideToneAt === undefined
      ? jyutping
      : syllables(jyutping)
          .map((s, i) => (i === hideToneAt ? `${s.replace(/[1-6]$/, '')}?` : s))
          .join(' ');

  if (mode === 'jyutping') {
    return (
      <View style={[styles.wrap, { alignItems: align }]}>
        <Text style={[styles.main, { fontSize: sz.main, color: textColor }]}>{jp}</Text>
        <Text style={[styles.sub, { fontSize: sz.sub }]}>{hanzi}</Text>
      </View>
    );
  }

  const showJyutping = mode === 'both' || revealed || hideToneAt !== undefined;
  if (!revealable) {
    return (
      <View style={[styles.wrap, { alignItems: align }]}>
        <Text style={[styles.main, { fontSize: sz.main * 1.1, color: textColor }]}>{hanzi}</Text>
        {showJyutping ? <Text style={[styles.sub, { fontSize: sz.sub }]}>{jp}</Text> : null}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => setRevealed((r) => !r)}
      disabled={mode !== 'characters'}
      style={[styles.wrap, { alignItems: align }]}
    >
      <Text style={[styles.main, { fontSize: sz.main * 1.1, color: textColor }]}>{hanzi}</Text>
      {showJyutping ? (
        <Text style={[styles.sub, { fontSize: sz.sub }]}>{jp}</Text>
      ) : (
        <Text style={[styles.hint, { fontSize: sz.sub - 2 }]}>tap for Jyutping</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  main: {
    fontWeight: '700',
  },
  sub: {
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  hint: {
    color: theme.colors.border,
    fontWeight: '600',
  },
});
