import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { OptionCard } from '@/components/OptionCard';
import { SpeakerButton } from '@/components/SpeakerButton';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { tapHaptic } from '@/lib/ui';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

export function MeaningChoice({ exercise, script, sound, locked, onResult }: ExerciseProps<'mc-meaning'>) {
  const { scale } = useLayout();
  const [selected, setSelected] = useState<string | null>(null);
  const { word } = exercise;

  const stateOf = (option: string) => {
    if (locked && option === exercise.answer) return 'correct';
    if (locked && option === selected) return 'wrong';
    return option === selected ? 'selected' : 'idle';
  };

  return (
    <ExerciseFrame
      title="What does this mean?"
      badge={exercise.isNew ? 'New word' : undefined}
      locked={locked}
      canCheck={selected !== null}
      onCheck={() => onResult(selected === exercise.answer, exercise.answer)}
    >
      <View style={styles.prompt}>
        <SpeakerButton text={word.hanzi} enabled={sound} autoPlay />
        <CantoText hanzi={word.hanzi} jyutping={word.jyutping} mode={script} size="lg" align="flex-start" />
      </View>
      <View style={styles.options}>
        {exercise.options.map((option, i) => (
          <OptionCard
            key={option}
            testID={`option-${i}`}
            state={stateOf(option)}
            disabled={locked}
            onPress={() => {
              tapHaptic();
              setSelected(option);
            }}
          >
            <Text style={[styles.optionText, { fontSize: 17 * scale }]}>{option}</Text>
          </OptionCard>
        ))}
      </View>
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
  },
  options: {
    gap: theme.spacing(3),
  },
  optionText: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
});
