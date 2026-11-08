import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { CantoText } from '@/components/CantoText';
import { ProgressBar } from '@/components/ProgressBar';
import { SpeakerButton } from '@/components/SpeakerButton';
import { Lantern, LanternState, LANTERN_HEIGHT } from '@/components/game/Lantern';
import { useProgress } from '@/lib/context/ProgressContext';
import { resolveLesson } from '@/lib/content';
import { resolveScript } from '@/lib/engine/difficulty';
import { MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { seededRng } from '@/lib/engine/random';
import { fallMs, LIVES, multiplier, planGame, pointsFor } from '@/lib/game';
import { goToTab } from '@/lib/navigation';
import { useSessionTimer } from '@/lib/sessionTimer';
import { speak } from '@/lib/speech';
import { confirm, feedbackHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

/** Pause between waves, so a catch or miss can be seen. */
const WAVE_GAP_MS = 650;

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading } = useProgress();
  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }
  return <LanternCatch key={id} id={id} />;
}

function LanternCatch({ id }: { id: string }) {
  const { state, answer, complete, logSession, recordGameScore } = useProgress();
  const ref = useMemo(() => resolveLesson(id), [id]);
  const [plan] = useState(() => (ref ? planGame(state, ref, seededRng(Date.now()), Date.now()) : null));
  const timer = useSessionTimer();

  const [waveIndex, setWaveIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lanterns, setLanterns] = useState<LanternState[]>([]);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [toast, setToast] = useState<string | null>(null);

  // Mutable game state read by animation callbacks, which outlive renders.
  const game = useRef({ waveDone: false, waveMistake: false, cleanWaves: 0, mistakes: 0, lives: LIVES, combo: 0, score: 0, over: false });
  const fall = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const gap = useRef<ReturnType<typeof setTimeout> | null>(null);

  const waves = plan?.waves ?? [];
  const wave = waves[waveIndex];
  const script = resolveScript(state.settings.script, plan?.score ?? 0);
  const lessonId = !ref ? id : ref.kind === 'practice' ? 'practice' : ref.kind === 'checkpoint' ? `${ref.unit.id}-checkpoint` : ref.lesson.id;

  const log = useCallback(
    (completed: boolean, stars: number) =>
      logSession({
        lessonId,
        kind: ref?.kind ?? 'lesson',
        mode: 'game',
        startedAt: timer.startedAt,
        activeMs: timer.activeMs(),
        stars,
        accuracy: waves.length ? game.current.cleanWaves / waves.length : 0,
        completed,
      }),
    [lessonId, ref, timer, waves.length, logSession],
  );

  const stop = () => {
    anim.current?.stop();
    if (gap.current) clearTimeout(gap.current);
  };
  useEffect(() => stop, []);

  const endGame = (won: boolean) => {
    if (game.current.over || !ref) return;
    game.current.over = true;
    stop();
    const g = game.current;
    const activeMs = timer.activeMs();
    if (!won) {
      log(false, 0);
      router.replace({
        pathname: '/lesson/complete',
        params: { kind: ref.kind, failed: '1', gameOver: '1', score: String(g.score), time: String(activeMs) },
      });
      return;
    }
    const result = complete({
      kind: ref.kind,
      id: lessonId,
      unitIndex: ref.kind === 'practice' ? undefined : ref.unit.index,
      correct: g.cleanWaves,
      total: waves.length,
      mistakes: g.mistakes,
    });
    const best = recordGameScore(lessonId, g.score);
    log(true, result.starsEarned);
    router.replace({
      pathname: '/lesson/complete',
      params: {
        xp: String(result.xpEarned),
        accuracy: String(Math.round((g.cleanWaves / Math.max(1, waves.length)) * 100)),
        kind: ref.kind,
        passed: '1',
        stars: String(result.starsEarned),
        time: String(activeMs),
        score: String(g.score),
        best: best ? '1' : '0',
        ...(result.sticker ? { sticker: result.sticker.sticker.wordId, stickerNew: result.sticker.isNew ? '1' : '0' } : {}),
        ...(result.pageCompleted ? { page: result.pageCompleted } : {}),
        ...(result.newStage !== undefined ? { stage: String(result.newStage) } : {}),
      },
    });
  };

  const loseLife = () => {
    const g = game.current;
    g.lives -= 1;
    g.combo = 0;
    setLives(g.lives);
    setCombo(0);
    feedbackHaptic(false);
    if (g.lives <= 0) {
      setTimeout(() => endGame(false), WAVE_GAP_MS);
      return true;
    }
    return false;
  };

  const nextWave = () => {
    gap.current = setTimeout(() => {
      if (game.current.over) return;
      if (waveIndex + 1 >= waves.length) endGame(true);
      else setWaveIndex((i) => i + 1);
    }, WAVE_GAP_MS);
  };

  // Start each wave: reset lanterns, say the word, drop them.
  useEffect(() => {
    if (!wave || area.height === 0 || game.current.over) return;
    game.current.waveDone = false;
    game.current.waveMistake = false;
    setLanterns(wave.options.map(() => 'falling'));
    setToast(null);
    if (wave.promptCantonese && state.settings.sound) speak(wave.target.hanzi);
    fall.setValue(0);
    anim.current = Animated.timing(fall, {
      toValue: 1,
      duration: fallMs(plan!.score, waveIndex),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    anim.current.start(({ finished }) => finished && landed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveIndex, area.height]);

  /** The lanterns reached the river without the right one being caught. */
  const landed = () => {
    const g = game.current;
    if (!wave || g.waveDone || g.over) return;
    g.waveDone = true;
    if (!g.waveMistake) {
      g.mistakes += 1;
      answer([wave.target.id], false);
    }
    setLanterns(wave.options.map((o) => (o.id === wave.target.id ? 'caught' : 'faded')));
    setToast(`It was ${wave.promptCantonese ? wave.target.english : wave.target.hanzi}`);
    if (!loseLife()) nextWave();
  };

  const tap = (lane: number) => {
    const g = game.current;
    if (!wave || g.waveDone || g.over || lanterns[lane] !== 'falling') return;
    if (wave.options[lane].id === wave.target.id) {
      g.waveDone = true;
      anim.current?.stop();
      if (!g.waveMistake) {
        g.cleanWaves += 1;
        answer([wave.target.id], true);
      }
      const points = pointsFor(g.combo);
      g.combo += 1;
      g.score += points;
      setScore(g.score);
      setCombo(g.combo);
      feedbackHaptic(true);
      setLanterns((ls) => ls.map((s, i) => (i === lane ? 'caught' : 'faded')));
      setToast(`+${points}${multiplier(g.combo - 1) > 1 ? ` ×${multiplier(g.combo - 1)}` : ''}`);
      nextWave();
    } else {
      setLanterns((ls) => ls.map((s, i) => (i === lane ? 'wrong' : s)));
      if (!g.waveMistake) {
        g.waveMistake = true;
        g.mistakes += 1;
        answer([wave.target.id], false);
      }
      if (loseLife()) {
        g.waveDone = true;
        anim.current?.stop();
      }
    }
  };

  const quit = async () => {
    if (game.current.over) return;
    anim.current?.stop();
    if (await confirm('Quit game?', "You'll lose your progress in this round.", 'Quit')) {
      game.current.over = true;
      stop();
      if (waveIndex > 0) log(false, 0);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } else if (!game.current.waveDone) {
      // Carry on falling from where it stopped.
      fall.stopAnimation((v) => {
        anim.current = Animated.timing(fall, {
          toValue: 1,
          duration: Math.max(300, (1 - v) * fallMs(plan!.score, waveIndex)),
          easing: Easing.linear,
          useNativeDriver: true,
        });
        anim.current.start(({ finished }) => finished && landed());
      });
    }
  };
  const quitRef = useRef(quit);
  quitRef.current = quit;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quitRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== area.width || height !== area.height) setArea({ width, height });
  };

  if (!ref || !plan) return <Message title="Game not found" onClose={() => goToTab('/')} />;
  if (waves.length === 0) {
    return (
      <Message
        title="Nothing to play yet"
        detail={`Finish a lesson first. Practice games use words you've learned (at least ${MIN_PRACTICE_WORDS}).`}
        onClose={() => goToTab('/')}
      />
    );
  }

  const lanes = wave?.options.length ?? 3;
  const laneWidth = area.width / lanes;
  const lanternWidth = Math.min(150, laneWidth - 12);
  const ground = area.height - 24;

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.hud}>
        <Pressable testID="quit" onPress={quit} hitSlop={12} accessibilityLabel="Quit game">
          <Ionicons name="close" size={30} color={theme.colors.textMuted} />
        </Pressable>
        <ProgressBar value={waveIndex / waves.length} color={theme.colors.accent} />
        <Text style={styles.lives} testID="lives">
          {'♥'.repeat(Math.max(0, lives))}
          <Text style={styles.livesLost}>{'♥'.repeat(LIVES - Math.max(0, lives))}</Text>
        </Text>
      </View>
      <View style={styles.scoreRow}>
        <Text style={styles.score} testID="score">
          🏮 {score}
        </Text>
        {combo >= 2 ? <Text style={styles.combo}>🔥 {combo} in a row · ×{multiplier(combo)}</Text> : null}
      </View>

      {wave ? (
        <View style={styles.prompt} testID="prompt">
          <Text style={styles.promptLabel}>{wave.promptCantonese ? 'Catch the lantern that means…' : 'Catch the Cantonese for…'}</Text>
          {wave.promptCantonese ? (
            <View style={styles.promptRow}>
              <SpeakerButton text={wave.target.hanzi} enabled={state.settings.sound} />
              <CantoText hanzi={wave.target.hanzi} jyutping={wave.target.jyutping} mode={script} size="md" revealable={false} />
            </View>
          ) : (
            <Text style={styles.promptEnglish}>“{wave.target.english}”</Text>
          )}
        </View>
      ) : null}

      <View style={styles.sky} onLayout={onLayout}>
        {area.height > 0 && wave
          ? wave.options.map((word, lane) => (
              <Lantern
                key={`${waveIndex}-${lane}`}
                testID={`lantern-${lane}`}
                word={word}
                cantonese={!wave.promptCantonese}
                script={script}
                fall={fall}
                left={lane * laneWidth + (laneWidth - lanternWidth) / 2}
                width={lanternWidth}
                ground={ground}
                offset={(lane % 2) * 28}
                state={lanterns[lane] ?? 'falling'}
                onPress={() => tap(lane)}
              />
            ))
          : null}
        {toast ? (
          <Text style={styles.toast} testID="toast">
            {toast}
          </Text>
        ) : null}
        <View style={styles.water} />
      </View>
      <Text style={styles.hint}>
        Wave {Math.min(waveIndex + 1, waves.length)} of {waves.length} · lanterns that reach the river cost a life
      </Text>
    </Screen>
  );
}

function Message({ title, detail, onClose }: { title: string; detail?: string; onClose: () => void }) {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.message}>
        <Text style={styles.messageTitle}>{title}</Text>
        {detail ? <Text style={styles.messageDetail}>{detail}</Text> : null}
        <Button testID="message-ok" label="OK" onPress={onClose} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingHorizontal: theme.spacing(5),
    paddingTop: theme.spacing(3),
  },
  lives: {
    color: theme.colors.heart,
    fontSize: 22,
    fontWeight: '900',
  },
  livesLost: {
    color: theme.colors.locked,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing(5),
    paddingTop: theme.spacing(2),
  },
  score: {
    color: theme.colors.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  combo: {
    color: theme.colors.streak,
    fontWeight: '800',
  },
  prompt: {
    marginHorizontal: theme.spacing(5),
    marginTop: theme.spacing(2),
    padding: theme.spacing(3),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  promptLabel: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  promptEnglish: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  sky: {
    flex: 1,
    minHeight: LANTERN_HEIGHT * 2.5,
    margin: theme.spacing(3),
    borderRadius: theme.radius.lg,
    backgroundColor: '#0B1230',
    overflow: 'hidden',
  },
  water: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
    backgroundColor: '#1E3A8A',
    opacity: 0.8,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    color: '#FFF7E6',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: theme.spacing(4),
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
  },
  message: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(6),
    gap: theme.spacing(4),
  },
  messageTitle: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageDetail: {
    color: theme.colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});
