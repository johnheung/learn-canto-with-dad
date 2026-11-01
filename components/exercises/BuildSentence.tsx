import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { SpeakerButton } from '@/components/SpeakerButton';
import { ExerciseFrame, ExerciseProps } from '@/components/exercises/ExerciseFrame';
import { sentenceAnswerTokens, tokensMatch } from '@/lib/engine/grading';
import { speak } from '@/lib/speech';
import { ScriptMode, Token } from '@/lib/types';
import { tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

function sentenceText(tokens: Token[]) {
  return {
    hanzi: tokens.map((t) => t.hanzi).join(''),
    jyutping: tokens.map((t) => t.jyutping).join(' '),
  };
}

/** Shared word-bank UI. `chosen` holds indexes into `bank`. */
function WordBank<T>({
  bank,
  chosen,
  setChosen,
  render,
  onTap,
  locked,
}: {
  bank: T[];
  chosen: number[];
  setChosen: React.Dispatch<React.SetStateAction<number[]>>;
  render: (item: T) => React.ReactNode;
  onTap?: (item: T) => void;
  locked: boolean;
}) {
  return (
    <>
      <View style={styles.answerArea} testID="answer-area">
        {chosen.map((i) => (
          <Pressable
            key={`a${i}`}
            disabled={locked}
            style={styles.chip}
            onPress={() => setChosen((cur) => cur.filter((c) => c !== i))}
          >
            {render(bank[i])}
          </Pressable>
        ))}
      </View>
      <View style={styles.bank}>
        {bank.map((item, i) => {
          const used = chosen.includes(i);
          return (
            <Pressable
              key={`b${i}`}
              testID={`bank-${i}`}
              disabled={locked || used}
              style={[styles.chip, used && styles.chipUsed]}
              onPress={() => {
                tapHaptic();
                onTap?.(item);
                setChosen((cur) => (cur.includes(i) ? cur : [...cur, i]));
              }}
            >
              <View style={used ? styles.hidden : undefined}>{render(item)}</View>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

export function BuildEnglish({ exercise, script, sound, locked, onResult }: ExerciseProps<'build-en'>) {
  const [chosen, setChosen] = useState<number[]>([]);
  const { sentence } = exercise;
  const text = sentenceText(sentence.tokens);

  const check = () => {
    const given = chosen.map((i) => exercise.bank[i]);
    const ok = sentenceAnswerTokens(sentence).some((answer) => tokensMatch(given, answer));
    onResult(ok, sentence.english);
  };

  return (
    <ExerciseFrame title="Translate this sentence" locked={locked} canCheck={chosen.length > 0} onCheck={check}>
      <View style={styles.prompt}>
        <SpeakerButton text={text.hanzi} enabled={sound} autoPlay />
        <View style={styles.flex}>
          <CantoText hanzi={text.hanzi} jyutping={text.jyutping} mode={script} size="md" align="flex-start" />
        </View>
      </View>
      <WordBank
        bank={exercise.bank}
        chosen={chosen}
        setChosen={setChosen}
        locked={locked}
        render={(t) => <Text style={styles.chipText}>{t}</Text>}
      />
    </ExerciseFrame>
  );
}

function TokenChip({ token, script }: { token: Token; script: ScriptMode }) {
  if (script === 'characters') return <Text style={styles.chipHanzi}>{token.hanzi}</Text>;
  if (script === 'jyutping') {
    return (
      <View style={styles.center}>
        <Text style={styles.chipText}>{token.jyutping}</Text>
        <Text style={styles.chipSub}>{token.hanzi}</Text>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <Text style={styles.chipHanzi}>{token.hanzi}</Text>
      <Text style={styles.chipSub}>{token.jyutping}</Text>
    </View>
  );
}

export function BuildCantonese({ exercise, script, sound, locked, onResult }: ExerciseProps<'build-yue'>) {
  const [chosen, setChosen] = useState<number[]>([]);
  const { sentence } = exercise;

  const check = () => {
    const given = chosen.map((i) => exercise.bank[i].hanzi);
    const answer = sentenceText(exercise.answer);
    onResult(tokensMatch(given, exercise.answer.map((t) => t.hanzi)), `${answer.hanzi} (${answer.jyutping})`);
  };

  return (
    <ExerciseFrame title="Write this in Cantonese" locked={locked} canCheck={chosen.length > 0} onCheck={check}>
      <Text style={styles.english}>“{sentence.english}”</Text>
      <WordBank
        bank={exercise.bank}
        chosen={chosen}
        setChosen={setChosen}
        locked={locked}
        onTap={(t) => sound && speak(t.hanzi)}
        render={(t) => <TokenChip token={t} script={script} />}
      />
    </ExerciseFrame>
  );
}

const styles = StyleSheet.create({
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(4),
  },
  flex: {
    flex: 1,
  },
  english: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  answerArea: {
    minHeight: 120,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: theme.spacing(2),
    paddingVertical: theme.spacing(3),
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: theme.colors.surfaceAlt,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(2),
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
  },
  chipUsed: {
    backgroundColor: theme.colors.surfaceAlt,
    borderColor: theme.colors.surfaceAlt,
  },
  hidden: {
    opacity: 0,
  },
  center: {
    alignItems: 'center',
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  chipHanzi: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  chipSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
