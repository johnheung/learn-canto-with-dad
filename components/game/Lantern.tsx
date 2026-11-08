import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { CantoText } from '@/components/CantoText';
import { ScriptMode, Word } from '@/lib/types';
import { theme } from '@/lib/theme';

export type LanternState = 'falling' | 'caught' | 'wrong' | 'faded';

interface LanternProps {
  word: Word;
  /** Show Cantonese on the lantern (hard mode); otherwise the English meaning. */
  cantonese: boolean;
  script: ScriptMode;
  /** Shared fall progress for the wave, 0 (top) to 1 (ground). */
  fall: Animated.Value;
  left: number;
  width: number;
  /** Distance from top of the play area to the ground. */
  ground: number;
  /** Small per-lane head start so lanterns don't move in lockstep. */
  offset: number;
  state: LanternState;
  onPress: () => void;
  testID: string;
}

export const LANTERN_HEIGHT = 112;

export function Lantern({ word, cantonese, script, fall, left, width, ground, offset, state, onPress, testID }: LanternProps) {
  const pop = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  useEffect(() => {
    if (state === 'caught') {
      Animated.timing(pop, { toValue: 1.5, duration: 260, useNativeDriver: true }).start();
    } else if (state === 'wrong') {
      Animated.sequence(
        [10, -10, 8, -8, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 50, useNativeDriver: true })),
      ).start();
    }
  }, [state, pop, shake]);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-LANTERN_HEIGHT + offset, ground - LANTERN_HEIGHT + offset],
  });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });
  const gone = state === 'caught' || state === 'faded';

  return (
    <Animated.View
      pointerEvents={gone ? 'none' : 'auto'}
      style={[
        styles.wrap,
        {
          left,
          width,
          opacity: state === 'faded' ? 0.25 : state === 'caught' ? pop.interpolate({ inputRange: [1, 1.5], outputRange: [1, 0] }) : 1,
          transform: [{ translateY }, { translateX: shake }, { rotate }, { scale: pop }],
        },
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={cantonese ? word.hanzi : word.english}
        onPress={onPress}
        disabled={gone}
        style={styles.press}
      >
        <View style={styles.string} />
        <View style={[styles.lantern, state === 'wrong' && styles.wrong, state === 'caught' && styles.caught]}>
          <View style={styles.cap} />
          {cantonese ? (
            <CantoText hanzi={word.hanzi} jyutping={word.jyutping} mode={script} size="sm" color="#FFF7E6" revealable={false} />
          ) : (
            <Text style={styles.text} numberOfLines={3} adjustsFontSizeToFit>
              {word.english}
            </Text>
          )}
          <View style={styles.cap} />
        </View>
        <View style={styles.tassel} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    height: LANTERN_HEIGHT,
    alignItems: 'center',
  },
  press: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  string: {
    width: 2,
    height: 10,
    backgroundColor: '#C9A227',
  },
  lantern: {
    flex: 1,
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#D7263D',
    borderWidth: 3,
    borderColor: '#F5B83D',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    shadowColor: '#F5B83D',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  wrong: {
    backgroundColor: '#5B5F6B',
    borderColor: theme.colors.danger,
  },
  caught: {
    backgroundColor: theme.colors.success,
  },
  cap: {
    width: '50%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5B83D',
  },
  text: {
    color: '#FFF7E6',
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  tassel: {
    width: 6,
    height: 10,
    backgroundColor: '#F5B83D',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
