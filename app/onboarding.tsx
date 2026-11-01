import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { useProgress } from '@/lib/context/ProgressContext';
import { LEVELS } from '@/lib/engine/difficulty';
import { DAILY_GOALS } from '@/lib/progress';
import { Level } from '@/lib/types';
import { theme } from '@/lib/theme';

export default function Onboarding() {
  const { onboard } = useProgress();
  const [step, setStep] = useState<'welcome' | 'level' | 'goal'>('welcome');
  const [level, setLevel] = useState<Level>('beginner');
  const [goal, setGoal] = useState(20);

  if (step === 'welcome') {
    return (
      <Screen style={styles.welcome} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>粵</Text>
          </View>
          <Text style={styles.brand}>Learn Canto with Dad</Text>
          <Text style={styles.tagline}>Learn Cantonese a few minutes a day. Free, no account needed.</Text>
        </ScrollView>
        <Button testID="get-started" label="Get started" onPress={() => setStep('level')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{step === 'level' ? 'How much Cantonese do you know?' : 'Pick a daily goal'}</Text>
        {step === 'level'
          ? LEVELS.map((l) => (
              <OptionCard
                key={l.id}
                testID={`level-${l.id}`}
                state={level === l.id ? 'selected' : 'idle'}
                onPress={() => setLevel(l.id)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>{l.label}</Text>
                <Text style={styles.cardDetail}>{l.description}</Text>
              </OptionCard>
            ))
          : DAILY_GOALS.map((g) => (
              <OptionCard
                key={g.xp}
                testID={`goal-${g.xp}`}
                state={goal === g.xp ? 'selected' : 'idle'}
                onPress={() => setGoal(g.xp)}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>
                  {g.label} · {g.xp} XP
                </Text>
                <Text style={styles.cardDetail}>{g.detail}</Text>
              </OptionCard>
            ))}
        <Text style={styles.note}>You can change this any time in Settings.</Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          testID="continue"
          label={step === 'level' ? 'Continue' : 'Start learning'}
          onPress={() => {
            if (step === 'level') return setStep('goal');
            onboard(level, goal);
            router.replace('/buddy');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: {
    padding: theme.spacing(6),
    gap: theme.spacing(4),
  },
  scroll: {
    flex: 1,
  },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(4),
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 6,
    borderBottomColor: theme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
  },
  brand: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 320,
  },
  content: {
    padding: theme.spacing(5),
    gap: theme.spacing(3),
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: theme.spacing(2),
  },
  card: {
    alignItems: 'flex-start',
    gap: 4,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardDetail: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  note: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  footer: {
    padding: theme.spacing(5),
  },
});
