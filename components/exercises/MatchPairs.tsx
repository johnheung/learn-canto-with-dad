import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { OptionCard, OptionState } from '@/components/OptionCard';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { shuffle } from '@/lib/engine/random';
import { speak } from '@/lib/speech';
import { feedbackHaptic, tapHaptic } from '@/lib/ui';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

/** Tap a Cantonese word and its meaning. Finishes itself once every pair is found. */
export function MatchPairs({ exercise, script, sound, locked, onResult }: ExerciseProps<'match'>) {
  const { scale } = useLayout();
  const left = useMemo(() => shuffle(exercise.pairs, Math.random), [exercise]);
  const right = useMemo(() => shuffle(exercise.pairs, Math.random), [exercise]);
  const [pickedLeft, setPickedLeftState] = useState<string | null>(null);
  const [pickedRight, setPickedRightState] = useState<string | null>(null);
  const [matched, setMatchedState] = useState<string[]>([]);
  // Latest picks, so fast taps don't act on a stale selection.
  const picks = useRef<{ left: string | null; right: string | null; matched: string[] }>({ left: null, right: null, matched: [] });
  const setPickedLeft = (id: string | null) => {
    picks.current.left = id;
    setPickedLeftState(id);
  };
  const setPickedRight = (id: string | null) => {
    picks.current.right = id;
    setPickedRightState(id);
  };
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);

  const tryMatch = (l: string | null, r: string | null) => {
    if (!l || !r) return;
    if (l === r) {
      if (picks.current.matched.includes(l)) return;
      const next = [...picks.current.matched, l];
      picks.current.matched = next;
      setMatchedState(next);
      if (next.length === exercise.pairs.length) {
        feedbackHaptic(true);
        onResult(true);
      }
    } else {
      feedbackHaptic(false);
      setMistakes((m) => m + 1);
      setWrong([`l:${l}`, `r:${r}`]);
      setTimeout(() => setWrong([]), 450);
    }
    setPickedLeft(null);
    setPickedRight(null);
  };

  const stateOf = (side: 'l' | 'r', id: string, picked: string | null): OptionState => {
    if (matched.includes(id)) return 'done';
    if (wrong.includes(`${side}:${id}`)) return 'wrong';
    return picked === id ? 'selected' : 'idle';
  };

  return (
    <ExerciseFrame title="Tap the matching pairs" locked={locked}>
      <View style={styles.columns}>
        <View style={styles.column}>
          {left.map((w, i) => (
            <OptionCard
              key={w.id}
              testID={`match-left-${i}`}
              style={styles.card}
              state={stateOf('l', w.id, pickedLeft)}
              disabled={locked}
              onPress={() => {
                tapHaptic();
                if (sound) speak(w.hanzi);
                setPickedLeft(w.id);
                tryMatch(w.id, picks.current.right);
              }}
            >
              <CantoText hanzi={w.hanzi} jyutping={w.jyutping} mode={script} size="sm" revealable={false} />
            </OptionCard>
          ))}
        </View>
        <View style={styles.column}>
          {right.map((w, i) => (
            <OptionCard
              key={w.id}
              testID={`match-right-${i}`}
              style={styles.card}
              state={stateOf('r', w.id, pickedRight)}
              disabled={locked}
              onPress={() => {
                tapHaptic();
                setPickedRight(w.id);
                tryMatch(picks.current.left, w.id);
              }}
            >
              <Text style={[styles.english, { fontSize: 15 * scale }]}>{w.english}</Text>
            </OptionCard>
          ))}
        </View>
      </View>
      {mistakes > 0 ? <Text style={styles.mistakes}>Mismatches: {mistakes}</Text> : null}
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    gap: theme.spacing(3),
  },
  column: {
    flex: 1,
    gap: theme.spacing(3),
  },
  card: {
    minHeight: 76,
  },
  english: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  mistakes: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
