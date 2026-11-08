import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { OptionCard } from '@/components/OptionCard';
import { SpeakerButton } from '@/components/SpeakerButton';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { syllables, TONE_NAMES } from '@/lib/engine/grading';
import { tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

export function ToneQuiz({ exercise, script, sound, locked, onResult }: ExerciseProps<'tone'>) {
  const [selected, setSelected] = useState<number | null>(null);
  const { word, syllableIndex, answer } = exercise;
  const syl = syllables(word.jyutping);
  const hanziChar = [...word.hanzi][syllableIndex] ?? word.hanzi;

  const stateOf = (tone: number) => {
    if (locked && tone === answer) return 'correct';
    if (locked && tone === selected) return 'wrong';
    return tone === selected ? 'selected' : 'idle';
  };

  return (
    <ExerciseFrame
      title={syl.length > 1 ? `Which tone is “${hanziChar}”?` : 'Which tone is this?'}
      locked={locked}
      canCheck={selected !== null}
      onCheck={() =>
        onResult(
          selected === answer,
          `${syl[syllableIndex]} – tone ${answer} (${TONE_NAMES[answer]})`,
          selected ? `tone ${selected} (${TONE_NAMES[selected]})` : undefined,
        )
      }
    >
      <View style={styles.prompt}>
        <SpeakerButton text={word.hanzi} enabled={sound} autoPlay />
        <CantoText
          hanzi={word.hanzi}
          jyutping={word.jyutping}
          mode={script === 'characters' ? 'both' : script}
          size="lg"
          hideToneAt={syllableIndex}
          align="flex-start"
        />
      </View>
      <Text style={styles.meaning}>“{word.english}”</Text>
      <View style={styles.grid}>
        {exercise.options.map((tone) => (
          <OptionCard
            key={tone}
            testID={`tone-${tone}`}
            style={styles.cell}
            state={stateOf(tone)}
            disabled={locked}
            onPress={() => {
              tapHaptic();
              setSelected(tone);
            }}
          >
            <Text style={styles.toneNumber}>{tone}</Text>
            <Text style={styles.toneName}>{TONE_NAMES[tone]}</Text>
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
  meaning: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  cell: {
    flexGrow: 1,
    flexBasis: '30%',
  },
  toneNumber: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  toneName: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
