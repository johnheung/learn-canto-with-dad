import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { goToTab } from '@/lib/navigation';
import { units } from '@/lib/content';
import { cheer, mascotEmoji, STAGES } from '@/lib/mascot';
import { displayStreak, xpToday } from '@/lib/progress';
import { formatDuration } from '@/lib/dashboard';
import { readyRewardCount } from '@/lib/rewards';
import { speak } from '@/lib/speech';
import { STICKER_PAGES, stickerWord } from '@/lib/stickers';
import { theme } from '@/lib/theme';

export default function CompleteScreen() {
  const params = useLocalSearchParams<{
    xp?: string;
    accuracy?: string;
    kind?: string;
    passed?: string;
    failed?: string;
    stars?: string;
    sticker?: string;
    stickerNew?: string;
    page?: string;
    stage?: string;
    /** Active time in ms. */
    time?: string;
    /** Lantern Catch: final score, and '1' for a new best. */
    score?: string;
    best?: string;
    /** Lantern Catch round lost: all lives gone. */
    gameOver?: string;
  }>();
  const { state } = useProgress();
  const now = Date.now();
  const failed = params.failed === '1';
  const checkpointFailed = params.kind === 'checkpoint' && params.passed === '0';
  const pop = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [pop]);

  const sticker = STICKER_PAGES.flatMap((p) => p.stickers).find((s) => s.wordId === params.sticker);
  const stickerInfo = sticker ? stickerWord(sticker) : undefined;
  const pageUnit = params.page ? units.find((u) => u.id === params.page) : undefined;
  const grewTo = params.stage !== undefined ? STAGES[Number(params.stage)] : undefined;
  const rewardsReady = readyRewardCount(state, now);
  const today = xpToday(state, now);
  const goal = state.settings.dailyGoal;

  const isGame = params.score !== undefined;
  const gameOver = params.gameOver === '1';
  const title = gameOver
    ? 'Game over!'
    : failed
    ? 'Out of hearts'
    : checkpointFailed
      ? 'So close!'
      : params.kind === 'checkpoint'
        ? 'Unit unlocked!'
        : params.kind === 'practice'
          ? 'Practice complete!'
          : isGame
            ? 'Lanterns caught!'
            : 'Lesson complete!';

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.hero}>
        <Animated.View
          style={[
            styles.badge,
            { backgroundColor: failed || checkpointFailed ? theme.colors.heart : theme.colors.accent, transform: [{ scale: pop }] },
          ]}
        >
          <Ionicons name={failed ? 'heart-dislike' : checkpointFailed ? 'refresh' : 'trophy'} size={64} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.title} testID="complete-title">
          {title}
        </Text>
        {failed && !gameOver ? (
          <Text style={styles.detail}>Practise to earn hearts back, then try again.</Text>
        ) : checkpointFailed ? (
          <Text style={styles.detail}>You need 80% to pass. Review the unit and try again.</Text>
        ) : null}

        {!failed && params.stars ? (
          <Text style={styles.stars} testID="stars-earned">
            {'⭐'.repeat(Math.min(3, Number(params.stars)))} +{params.stars} {Number(params.stars) === 1 ? 'star' : 'stars'}
          </Text>
        ) : null}

        {sticker && stickerInfo ? (
          <Pressable
            testID="sticker-earned"
            style={styles.sticker}
            onPress={() => state.settings.sound && speak(stickerInfo.hanzi)}
          >
            <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            <View style={styles.stickerText}>
              <Text style={styles.stickerTag}>{params.stickerNew === '1' ? 'New sticker!' : 'Another sticker!'}</Text>
              <Text style={styles.stickerHanzi}>
                {stickerInfo.hanzi} <Text style={styles.stickerSub}>{stickerInfo.jyutping}</Text>
              </Text>
              <Text style={styles.stickerSub}>{stickerInfo.english}</Text>
            </View>
          </Pressable>
        ) : null}
        {pageUnit ? (
          <Text style={styles.bonus}>📖 {pageUnit.title} sticker page complete! Bonus stars included.</Text>
        ) : null}

        {state.mascot && grewTo ? (
          <Text style={styles.bonus} testID="buddy-grew">
            {mascotEmoji(state)} {state.mascot.name} {params.stage === '1' ? 'hatched!' : `grew into a ${grewTo.name}!`} {grewTo.accessory}
          </Text>
        ) : state.mascot && !failed ? (
          <Text style={styles.cheer}>
            {mascotEmoji(state)} {state.mascot.name}: {cheer(now).hanzi} ({cheer(now).english})
          </Text>
        ) : null}

        {rewardsReady > 0 ? (
          <Pressable testID="reward-ready" style={styles.reward} onPress={() => goToTab('/rewards')}>
            <Text style={styles.rewardText}>🎁 A reward is ready to claim! Tap to see it.</Text>
          </Pressable>
        ) : null}

        {!failed ? (
          <View style={styles.stats}>
            <Stat label="XP earned" value={`+${params.xp ?? 0}`} color={theme.colors.xp} icon="flash" />
            <Stat label="Accuracy" value={`${params.accuracy ?? 0}%`} color={theme.colors.success} icon="checkmark-done" />
            <Stat label="Streak" value={String(displayStreak(state, now))} color={theme.colors.streak} icon="flame" />
          </View>
        ) : null}

        {isGame ? (
          <Text style={styles.score} testID="game-score">
            🏮 Score {params.score}
            {params.best === '1' ? '  ·  New high score! 🎉' : ''}
          </Text>
        ) : null}
        {gameOver ? <Text style={styles.cheer}>Out of lives. No stars this time: have another go!</Text> : null}
        {params.time ? (
          <Text style={styles.time} testID="session-time">
            ⏱ {formatDuration(Number(params.time))} this session
          </Text>
        ) : null}

        <View style={styles.goal}>
          <Text style={styles.goalLabel}>
            Daily goal · {Math.min(today, goal)}/{goal} XP{today >= goal ? ' ✓' : ''}
          </Text>
          <View style={styles.goalBar}>
            <ProgressBar value={today / goal} color={theme.colors.xp} />
          </View>
        </View>
      </ScrollView>
      <Button testID="done" label="Continue" onPress={() => goToTab('/')} />
    </Screen>
  );
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <View style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statLabel, { backgroundColor: color }]}>{label}</Text>
      <View style={styles.statBody}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    gap: theme.spacing(5),
  },
  badge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  stats: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: theme.spacing(3),
  },
  stat: {
    flex: 1,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  statLabel: {
    color: '#11141B',
    fontWeight: '800',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    paddingVertical: 4,
  },
  statBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: theme.spacing(3),
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  stars: {
    color: theme.colors.xp,
    fontSize: 22,
    fontWeight: '900',
  },
  sticker: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    padding: theme.spacing(3),
  },
  stickerEmoji: {
    fontSize: 44,
  },
  stickerText: {
    flex: 1,
  },
  stickerTag: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stickerHanzi: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  stickerSub: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  bonus: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  cheer: {
    color: theme.colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  reward: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.radius.md,
    padding: theme.spacing(3),
  },
  rewardText: {
    color: theme.colors.success,
    fontWeight: '800',
    textAlign: 'center',
  },
  score: {
    color: theme.colors.accent,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  goal: {
    alignSelf: 'stretch',
    gap: theme.spacing(2),
  },
  goalBar: {
    flexDirection: 'row',
  },
  goalLabel: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
});
