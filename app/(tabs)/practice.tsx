import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { HeaderStats } from '@/components/HeaderStats';
import { ProgressBar } from '@/components/ProgressBar';
import { SpeakerButton } from '@/components/SpeakerButton';
import { useProgress } from '@/lib/context/ProgressContext';
import { getWord } from '@/lib/content';
import { MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { dueCount, strength } from '@/lib/engine/srs';
import { XP } from '@/lib/progress';
import { theme } from '@/lib/theme';

export default function PracticeScreen() {
  const { state } = useProgress();
  const now = Date.now();
  const learned = Object.keys(state.words)
    .map((id) => ({ word: getWord(id), progress: state.words[id] }))
    .filter((x) => x.word)
    .sort((a, b) => a.progress.box - b.progress.box);
  const due = dueCount(state.words, now);
  const canPractice = learned.length >= MIN_PRACTICE_WORDS;

  return (
    <Screen>
      <HeaderStats />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.detail}>
            {canPractice
              ? `${due} word${due === 1 ? '' : 's'} due for review. Practice reviews your weakest words, earns ${XP.practice} XP and refills a heart.`
              : `Finish a lesson to unlock practice (you need ${MIN_PRACTICE_WORDS} words).`}
          </Text>
          <Button
            testID="start-practice"
            label={state.settings.learnMode === 'game' ? '🏮 Play practice game' : 'Start practice'}
            disabled={!canPractice}
            onPress={() => router.push(state.settings.learnMode === 'game' ? '/game/practice' : '/lesson/practice')}
          />
        </View>

        {learned.length > 0 ? <Text style={styles.section}>Your words ({learned.length})</Text> : null}
        {learned.map(({ word, progress }) => (
          <View key={word!.id} style={styles.row}>
            <SpeakerButton text={word!.hanzi} enabled={state.settings.sound} />
            <View style={styles.wordText}>
              <Text style={styles.hanzi}>
                {word!.hanzi} <Text style={styles.jyutping}>{word!.jyutping}</Text>
              </Text>
              <Text style={styles.english}>{word!.english}</Text>
            </View>
            <View style={styles.strength}>
              <ProgressBar value={strength(progress)} height={8} color={theme.colors.primary} />
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    gap: theme.spacing(3),
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  section: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing(3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
  },
  wordText: {
    flex: 1,
  },
  hanzi: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  jyutping: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  english: {
    color: theme.colors.textMuted,
  },
  strength: {
    width: 64,
    flexDirection: 'row',
  },
});
