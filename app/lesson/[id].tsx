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
import { goToTab } from '@/lib/navigation';
import { resolveLesson } from '@/lib/content';
import { resolveScript } from '@/lib/engine/difficulty';
import { planLesson, MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { seededRng } from '@/lib/engine/random';
import { currentHearts } from '@/lib/progress';
import { useSessionTimer } from '@/lib/sessionTimer';
import { Exercise } from '@/lib/types';
import { confirm, feedbackHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

const PRAISE = ['Nice!', 'Great job!', 'Correct!', 'Excellent!', '好嘢! (hou2 je5)', 'Amazing!'];

/** An answered question, kept so she can look back at it. */
interface Step {
  exercise: Exercise;
  correct: boolean;
  correction?: string;
  given?: string;
}

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
  const { state, answer, loseHeart, complete, logSession } = useProgress();
  const ref = useMemo(() => resolveLesson(id), [id]);
  const timer = useSessionTimer();
  const logged = useRef(false);

  // Plan once on mount; later progress updates must not reshuffle the lesson.
  const [plan] = useState(() => (ref ? planLesson(state, ref, seededRng(Date.now()), Date.now()) : null));
  const [queue, setQueue] = useState<Exercise[]>(() => plan?.exercises ?? []);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; correction?: string; praise: string } | null>(null);
  const firstTry = useRef(new Map<string, boolean>());
  const mistakes = useRef(0);
  const [history, setHistory] = useState<Step[]>([]);
  // Index into history while looking back at an earlier question; null when on the current one.
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  /** Records the session in the time log, once. */
  const log = (completed: boolean, stars: number, accuracy: number) => {
    if (logged.current || !ref) return;
    logged.current = true;
    logSession({
      lessonId: ref.kind === 'practice' ? 'practice' : ref.kind === 'checkpoint' ? `${ref.unit.id}-checkpoint` : ref.lesson.id,
      kind: ref.kind,
      mode: 'qa',
      startedAt: timer.startedAt,
      activeMs: timer.activeMs(),
      stars,
      accuracy,
      completed,
    });
  };

  const quit = async () => {
    if (await confirm('Quit lesson?', "You'll lose your progress in this lesson.", 'Quit')) {
      // Time spent still counts in the log, even without finishing.
      if (firstTry.current.size > 0) log(false, 0, firstTryAccuracy());
      leave();
    }
  };
  const quitRef = useRef(quit);
  quitRef.current = quit;

  // Android back button: steps back out of a review, otherwise asks before quitting, like ✕.
  const reviewRef = useRef(reviewIndex);
  reviewRef.current = reviewIndex;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (reviewRef.current !== null) setReviewIndex(null);
      else quitRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const firstTryAccuracy = () => {
    const tries = [...firstTry.current.values()];
    return tries.length ? tries.filter(Boolean).length / tries.length : 0;
  };

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
        onClose={() => goToTab('/')}
      />
    );
  }

  const exercise = queue[index];
  const script = resolveScript(state.settings.script, plan.score);
  // While feedback shows, the current question is already the last history entry.
  const lastReviewable = history.length - 1 - (feedback ? 1 : 0);
  const canGoBack = reviewIndex === null ? lastReviewable >= 0 : reviewIndex > 0;
  const reviewing = reviewIndex !== null;
  const reviewed = reviewing ? history[reviewIndex] : undefined;
  const goBack = () => setReviewIndex((i) => (i === null ? lastReviewable : Math.max(0, i - 1)));

  const onResult = (correct: boolean, correction?: string, given?: string) => {
    feedbackHaptic(correct);
    setHistory((h) => [...h, { exercise, correct, correction, given }]);
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
    const activeMs = timer.activeMs();
    log(true, result.starsEarned, correctCount / Math.max(1, originalCount));
    router.replace({
      pathname: '/lesson/complete',
      params: {
        xp: String(result.xpEarned),
        accuracy: String(Math.round((correctCount / Math.max(1, originalCount)) * 100)),
        kind: ref.kind,
        passed: result.passed ? '1' : '0',
        stars: String(result.starsEarned),
        time: String(activeMs),
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
      log(false, 0, firstTryAccuracy());
      router.replace({ pathname: '/lesson/complete', params: { kind: ref.kind, failed: '1' } });
      return;
    }
    if (index + 1 >= queue.length) finish();
    else setIndex(index + 1);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.top}>
        <Pressable testID="quit" onPress={quit} hitSlop={12} accessibilityLabel="Quit lesson">
          <Ionicons name="close" size={30} color={theme.colors.textMuted} />
        </Pressable>
        <Pressable
          testID="back"
          accessibilityRole="button"
          onPress={goBack}
          disabled={!canGoBack}
          hitSlop={12}
          accessibilityLabel="Previous question"
          style={!canGoBack && styles.disabled}
        >
          <Ionicons name="arrow-back" size={28} color={canGoBack ? theme.colors.text : theme.colors.textMuted} />
        </Pressable>
        <ProgressBar value={index / queue.length} />
        {heartsOn ? <StatPill icon="heart" color={theme.colors.heart} value={hearts} /> : null}
      </View>
      {ref.kind === 'checkpoint' ? <Text style={styles.tag}>Checkpoint · score 80% to pass</Text> : null}

      <KeyboardAvoidingView style={styles.body} behavior="padding">
        {/* The current question stays mounted while looking back, so a half-built answer is kept. */}
        <View style={[styles.body, reviewing && styles.hidden]}>
          <ExerciseView
            key={exercise.id}
            exercise={exercise}
            script={script}
            sound={state.settings.sound}
            locked={!!feedback}
            onResult={onResult}
          />
        </View>
        {reviewing ? (
          <View style={styles.body} testID="review-question">
            <ExerciseView
              key={`review-${reviewIndex}`}
              exercise={reviewed!.exercise}
              script={script}
              sound={state.settings.sound}
              locked
              onResult={() => {}}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {reviewing ? (
        <View testID="review" style={[styles.sheet, styles.reviewSheet]}>
          <Text style={styles.reviewTag}>
            Looking back · question {reviewIndex! + 1} of {history.length}
          </Text>
          <View style={styles.sheetHead}>
            <Ionicons
              name={reviewed!.correct ? 'checkmark-circle' : 'close-circle'}
              size={26}
              color={reviewed!.correct ? theme.colors.success : theme.colors.danger}
            />
            <Text style={styles.correction} testID="review-given">
              {reviewed!.given ? (
                <>
                  Your answer: <Text style={styles.correctionStrong}>{reviewed!.given}</Text>
                </>
              ) : reviewed!.correct ? (
                'You got this one right.'
              ) : (
                'You got this one wrong.'
              )}
            </Text>
          </View>
          {!reviewed!.correct && reviewed!.correction ? (
            <Text style={styles.correction}>
              Correct answer: <Text style={styles.correctionStrong}>{reviewed!.correction}</Text>
            </Text>
          ) : null}
          <View style={styles.reviewButtons}>
            <View style={styles.flex}>
              <Button
                testID="review-prev"
                label="← Previous"
                variant="secondary"
                disabled={reviewIndex === 0}
                onPress={() => setReviewIndex((i) => Math.max(0, (i ?? 0) - 1))}
              />
            </View>
            <View style={styles.flex}>
              <Button
                testID="review-next"
                label={reviewIndex! >= lastReviewable ? 'Back to quiz' : 'Next →'}
                onPress={() => setReviewIndex((i) => (i === null || i >= lastReviewable ? null : i + 1))}
              />
            </View>
          </View>
        </View>
      ) : feedback ? (
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
  hidden: {
    display: 'none',
  },
  disabled: {
    opacity: 0.35,
  },
  flex: {
    flex: 1,
  },
  reviewSheet: {
    backgroundColor: theme.colors.surface,
  },
  reviewTag: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: theme.spacing(3),
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
