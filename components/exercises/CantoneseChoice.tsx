import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { OptionCard } from '@/components/OptionCard';
import { SpeakerButton } from '@/components/SpeakerButton';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { displayWord } from '@/lib/engine/grading';
import { speak } from '@/lib/speech';
import { tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

/** Pick the Cantonese word, either from an English prompt or by ear. */
export function CantoneseChoice({ exercise, script, sound, locked, onResult }: ExerciseProps<'mc-cantonese' | 'listen'>) {
  const [selected, setSelected] = useState<string | null>(null);
  const { word } = exercise;
  const listening = exercise.kind === 'listen';

  const stateOf = (id: string) => {
    if (locked && id === exercise.answerId) return 'correct';
    if (locked && id === selected) return 'wrong';
    return id === selected ? 'selected' : 'idle';
  };

  return (
    <ExerciseFrame
      title={listening ? 'What do you hear?' : `How do you say “${word.english}”?`}
      locked={locked}
      canCheck={selected !== null}
      onCheck={() => {
        const chosen = exercise.options.find((o) => o.id === selected);
        onResult(selected === exercise.answerId, displayWord(word), chosen ? displayWord(chosen) : undefined);
      }}
    >
      {listening ? (
        <View style={styles.listen}>
          {sound ? (
            <>
              <SpeakerButton text={word.hanzi} enabled size="lg" autoPlay />
              <SpeakerButton text={word.hanzi} enabled slow />
            </>
          ) : (
            // Sound is off: fall back to reading the Jyutping.
            <Text style={styles.fallback}>{word.jyutping}</Text>
          )}
        </View>
      ) : null}
      <View style={styles.grid}>
        {exercise.options.map((option, i) => (
          <OptionCard
            key={option.id}
            testID={`option-${i}`}
            style={styles.cell}
            state={stateOf(option.id)}
            disabled={locked}
            onPress={() => {
              tapHaptic();
              setSelected(option.id);
              if (sound && !listening) speak(option.hanzi);
            }}
          >
            <CantoText
              hanzi={option.hanzi}
              jyutping={option.jyutping}
              // When listening, lead with characters so the answer isn't just matching sounds to spelling.
              mode={listening && script === 'jyutping' && sound ? 'both' : script}
              size="md"
              revealable={false}
            />
          </OptionCard>
        ))}
      </View>
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  listen: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: theme.spacing(4),
    paddingVertical: theme.spacing(2),
  },
  fallback: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  cell: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 96,
  },
});
