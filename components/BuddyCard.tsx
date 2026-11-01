import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { mascotEmoji, mood, moodPhrase, nextStage, STAGES, stageIndex } from '@/lib/mascot';
import { speak } from '@/lib/speech';
import { theme } from '@/lib/theme';

/** The learner's buddy: grows with XP and reacts to whether she practised today. */
export function BuddyCard() {
  const { state } = useProgress();
  const now = Date.now();

  if (!state.mascot) {
    return (
      <Pressable testID="adopt-buddy" style={[styles.card, styles.adopt]} onPress={() => router.push('/buddy')}>
        <Text style={styles.adoptEmoji}>🥚</Text>
        <View style={styles.text}>
          <Text style={styles.name}>Adopt a buddy!</Text>
          <Text style={styles.detail}>Pick an animal and watch it grow as you learn.</Text>
        </View>
      </Pressable>
    );
  }

  const stage = stageIndex(state.xp);
  const { size, accessory, name: stageName } = STAGES[stage];
  const next = nextStage(state.xp);
  const phrase = stage === 0 ? { hanzi: '…', jyutping: '', english: 'Finish a lesson to hatch me!' } : moodPhrase(mood(state, now), now);

  return (
    <View style={styles.card} testID="buddy-card">
      <Pressable
        accessibilityLabel={`${state.mascot.name}, say something`}
        onPress={() => state.settings.sound && phrase.jyutping && speak(phrase.hanzi)}
        style={styles.buddy}
      >
        <Text style={{ fontSize: size }}>{mascotEmoji(state)}</Text>
        {accessory ? <Text style={styles.accessory}>{accessory}</Text> : null}
      </Pressable>
      <View style={styles.text}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleHanzi}>{phrase.hanzi}</Text>
          {phrase.jyutping ? <Text style={styles.bubbleSub}>{phrase.jyutping}</Text> : null}
          <Text style={styles.bubbleSub}>{phrase.english}</Text>
        </View>
        <Text style={styles.name}>
          {state.mascot.name} <Text style={styles.stage}>· {stageName}</Text>
        </Text>
        {next ? (
          <>
            <View style={styles.bar}>
              <ProgressBar value={next.progress} height={8} color={theme.colors.accent} />
            </View>
            <Text style={styles.detail}>
              {next.xpToGo} XP until {next.next}
            </Text>
          </>
        ) : (
          <Text style={styles.detail}>Fully grown!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
  },
  adopt: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderStyle: 'dashed',
  },
  adoptEmoji: {
    fontSize: 48,
  },
  buddy: {
    width: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessory: {
    position: 'absolute',
    top: 0,
    right: 4,
    fontSize: 26,
  },
  text: {
    flex: 1,
    gap: 6,
  },
  bubble: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
  },
  bubbleHanzi: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  bubbleSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  name: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  stage: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  bar: {
    flexDirection: 'row',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
