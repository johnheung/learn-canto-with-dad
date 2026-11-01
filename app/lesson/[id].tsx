import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// Consistent across Android versions with edge-to-edge, unlike React Native's own.
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { StatPill } from '@/components/StatPills';
import { ExerciseView } from '@/components/exercises';
import { useProgress } from '@/lib/context/ProgressContext';
import { resolveLesson } from '@/lib/content';
import { resolveScript } from '@/lib/engine/difficulty';
import { planLesson, MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { seededRng } from '@/lib/engine/random';
import { currentHearts } from '@/lib/progress';
import { Exercise } from '@/lib/types';
import { confirm, feedbackHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

const PRAISE = ['Nice!', 'Great job!', 'Correct!', 'Excellent!', '好嘢! (hou2 je5)', 'Amazing!'];

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading } = useProgress();
  // Wait for saved progress, or the lesson would be planned for a brand-new learner.
  if (loading) {
    return (
      <Screen style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }
  return <LessonRunner key={id} id={id} />;
}

function LessonRunner({ id }: { id: string }) {
  const { state, answer, loseHeart, complete } = useProgress();
  const ref = useMemo(() => resolveLesson(id), [id]);

  // Plan once on mount; later progress updates must not reshuffle the lesson.
  const [plan] = useState(() => (ref ? planLesson(state, ref, seededRng(Date.now()), Date.now()) : null));
  const [queue, setQueue] = useState<Exercise[]>(() => plan?.exercises ?? []);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; correction?: string; praise: string } | null>(null);
  const firstTry = useRef(new Map<string, boolean>());
  const mistakes = useRef(0);

  // Android back button asks before throwing the lesson away, like the close button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quitLesson();
      return true;
    });
    return () => sub.remove();
  }, []);

  const isPractice = ref?.kind === 'practice';
  const heartsOn = state.settings.hearts && !isPractice;
  const hearts = currentHearts(state, Date.now());
  const originalCount = plan?.exercises.length ?? 0;

  if (!ref || !plan) {
    return <Message title="Lesson not found" onClose={leave} />;
  }
  if (isPractice && plan.exercises.length === 0) {
    return (
      <Message
        title="Nothing to practise yet"
        detail={`Finish a lesson first. Practice reviews words you've learned (at least ${MIN_PRACTICE_WORDS}).`}
        onClose={leave}
      />
    );
  }
  if (heartsOn && hearts === 0 && !feedback) {
    return (
      <Message
        title="Out of hearts"
        detail="Practise words you've learned to earn a heart, or wait for them to refill."
        onClose={() => router.replace('/')}
      />
    );
  }

  const exercise = queue[index];
  const script = resolveScript(state.settings.script, plan.score);

  const onResult = (correct: boolean, correction?: string) => {
    feedbackHaptic(correct);
    answer(exercise.wordIds, correct);
    // Requeued copies have a suffix; score only the first attempt.
    const baseId = exercise.id.split('~')[0];
    if (!firstTry.current.has(baseId)) firstTry.current.set(baseId, correct);
    if (!correct) {
      mistakes.current++;
      if (heartsOn) loseHeart();
      setQueue((q) => [...q, { ...exercise, id: `${baseId}~${q.length}` }]);
    }
    setFeedback({ correct, correction, praise: PRAISE[Math.floor(Math.random() * PRAISE.length)] });
  };

  const finish = () => {
    const correctCount = [...firstTry.current.values()].filter(Boolean).length;
    const result = complete({
      kind: ref.kind,
      id: ref.kind === 'practice' ? 'practice' : ref.kind === 'checkpoint' ? `${ref.unit.id}-checkpoint` : ref.lesson.id,
      unitIndex: ref.kind === 'practice' ? undefined : ref.unit.index,
      correct: correctCount,
      total: originalCount,
      mistakes: mistakes.current,
    });
    router.replace({
      pathname: '/lesson/complete',
      params: {
        xp: String(result.xpEarned),
        accuracy: String(Math.round((correctCount / Math.max(1, originalCount)) * 100)),
        kind: ref.kind,
        passed: result.passed ? '1' : '0',
        stars: String(result.starsEarned),
        ...(result.sticker ? { sticker: result.sticker.sticker.wordId, stickerNew: result.sticker.isNew ? '1' : '0' } : {}),
        ...(result.pageCompleted ? { page: result.pageCompleted } : {}),
        ...(result.newStage !== undefined ? { stage: String(result.newStage) } : {}),
      },
    });
  };

  const next = () => {
    const wasWrong = feedback && !feedback.correct;
    setFeedback(null);
    // Lost the last heart: the lesson ends without credit.
    if (wasWrong && heartsOn && hearts <= 0) {
      router.replace({ pathname: '/lesson/complete', params: { kind: ref.kind, failed: '1' } });
      return;
    }
    if (index + 1 >= queue.length) finish();
    else setIndex(index + 1);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.top}>
        <Pressable testID="quit" onPress={quitLesson} hitSlop={12}>
          <Ionicons name="close" size={30} color={theme.colors.textMuted} />
        </Pressable>
        <ProgressBar value={index / queue.length} />
        {heartsOn ? <StatPill icon="heart" color={theme.colors.heart} value={hearts} /> : null}
      </View>
      {ref.kind === 'checkpoint' ? <Text style={styles.tag}>Checkpoint · score 80% to pass</Text> : null}

      <KeyboardAvoidingView style={styles.body} behavior="padding">
        <ExerciseView
          key={exercise.id}
          exercise={exercise}
          script={script}
          sound={state.settings.sound}
          locked={!!feedback}
          onResult={onResult}
        />
      </KeyboardAvoidingView>

      {feedback ? (
        <View
          testID="feedback"
          style={[styles.sheet, { backgroundColor: feedback.correct ? theme.colors.successBg : theme.colors.dangerBg }]}
        >
          <View style={styles.sheetHead}>
            <Ionicons
              name={feedback.correct ? 'checkmark-circle' : 'close-circle'}
              size={30}
              color={feedback.correct ? theme.colors.success : theme.colors.danger}
            />
            <Text style={[styles.sheetTitle, { color: feedback.correct ? theme.colors.success : theme.colors.danger }]}>
              {feedback.correct ? feedback.praise : 'Not quite'}
            </Text>
          </View>
          {!feedback.correct && feedback.correction ? (
            <Text style={styles.correction}>
              Correct answer: <Text style={styles.correctionStrong}>{feedback.correction}</Text>
            </Text>
          ) : null}
          <Button
            testID="continue"
            label="Continue"
            variant={feedback.correct ? 'success' : 'danger'}
            onPress={next}
          />
        </View>
      ) : null}
    </Screen>
  );
}

async function quitLesson() {
  if (await confirm('Quit lesson?', "You'll lose your progress in this lesson.", 'Quit')) leave();
}

/** Back to where the lesson was opened from, or home when opened directly (deep link, web refresh). */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    paddingHorizontal: theme.spacing(5),
    paddingTop: theme.spacing(3),
  },
  tag: {
    color: theme.colors.accent,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  body: {
    flex: 1,
  },
  // In the layout flow (not overlaid), so the exercise above stays fully scrollable.
  sheet: {
    padding: theme.spacing(5),
    paddingBottom: theme.spacing(8),
    gap: theme.spacing(3),
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  correction: {
    color: theme.colors.text,
    fontSize: 16,
  },
  correctionStrong: {
    fontWeight: '800',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
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
