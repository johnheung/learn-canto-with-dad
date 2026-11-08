import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from '@/components/ProgressBar';
import { describeGoal, describeRemaining } from '@/lib/rewards';
import { Reward } from '@/lib/types';
import { theme } from '@/lib/theme';

interface RewardCardProps {
  reward: Reward;
  /** Progress toward the target (stars: the spendable balance). */
  progress: number;
  ready: boolean;
  onClaim: () => void;
}

/** A reward and how close she is. When it can be claimed it glows and the whole card is tappable. */
export function RewardCard({ reward, progress, ready, onClaim }: RewardCardProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ready) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ready, pulse]);

  const shown = Math.min(progress, reward.target);
  const remaining = reward.target - shown;

  return (
    <Animated.View
      style={ready ? { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }] } : undefined}
    >
      <Pressable
        testID={ready ? 'claim' : `reward-${reward.id}`}
        accessibilityRole={ready ? 'button' : undefined}
        accessibilityLabel={ready ? `Claim ${reward.title}` : undefined}
        disabled={!ready}
        onPress={onClaim}
        style={({ pressed }) => [styles.card, ready && styles.cardReady, pressed && styles.pressed]}
      >
        {ready ? <Animated.View pointerEvents="none" style={[styles.glow, { opacity: pulse }]} /> : null}
        {ready ? <Text style={styles.tapLabel}>🎁 Tap to claim!</Text> : null}
        <Text style={styles.title}>{reward.title}</Text>
        <Text style={styles.muted}>
          {describeGoal(reward.goal, reward.target)}
          {reward.repeat ? ' · repeats' : ''}
          {reward.claims.length ? ` · claimed ${reward.claims.length}×` : ''}
        </Text>
        <View style={styles.row}>
          <View style={styles.bar}>
            <ProgressBar value={shown / reward.target} color={ready ? theme.colors.success : theme.colors.accent} />
          </View>
          <Text style={styles.count}>
            {shown}/{reward.target}
          </Text>
        </View>
        {!ready ? <Text style={styles.remaining}>{describeRemaining(reward.goal, remaining)} to go</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    borderWidth: 2,
    borderColor: theme.colors.surface,
    overflow: 'hidden',
  },
  cardReady: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successBg,
  },
  pressed: {
    opacity: 0.85,
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(34,197,94,0.18)',
  },
  tapLabel: {
    color: theme.colors.success,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
  },
  count: {
    color: theme.colors.text,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'right',
  },
  remaining: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
});
