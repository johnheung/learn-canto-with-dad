import React, { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { jyutpingMatches } from '@/lib/engine/grading';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

export function TypeAnswer({ exercise, locked, onResult }: ExerciseProps<'type'>) {
  const { scale } = useLayout();
  const [text, setText] = useState('');
  const { word, requireTones } = exercise;

  const check = () =>
    onResult(jyutpingMatches(text, word.jyutping, requireTones), `${word.jyutping} (${word.hanzi})`, text.trim());

  return (
    <ExerciseFrame title="Type this in Jyutping" locked={locked} canCheck={text.trim().length > 0} onCheck={check}>
      <Text style={[styles.english, { fontSize: 22 * scale }]}>“{word.english}”</Text>
      <TextInput
        testID="type-input"
        value={text}
        onChangeText={setText}
        editable={!locked}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder={requireTones ? 'e.g. nei5 hou2' : 'e.g. nei hou'}
        placeholderTextColor={theme.colors.border}
        style={styles.input}
        onSubmitEditing={() => text.trim() && !locked && check()}
      />
      <Text style={styles.hint}>
        {requireTones ? 'Include tone numbers (1–6) after each syllable.' : 'Tone numbers are optional.'}
      </Text>
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  english: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing(4),
    color: theme.colors.text,
    fontSize: 20,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    color: theme.colors.textMuted,
  },
});
