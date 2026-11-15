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
import { SessionClock } from '@/components/SessionClock';
import { ExerciseView } from '@/components/exercises';
import { useProgress } from '@/lib/context/ProgressContext';
import { goToTab } from '@/lib/navigation';
import { resolveLesson } from '@/lib/content';
import { resolveScript } from '@/lib/engine/difficulty';
import { planLesson, MIN_PRACTICE_WORDS } from '@/lib/engine/plan';
import { seededRng } from '@/lib/engine/random';
import { currentHearts } from '@/lib/progress';
import { Attempts, recordAttempt, scoreAttempts } from '@/lib/engine/attempts';
import { useSessionTimer } from '@/lib/sessionTimer';
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
  const { state, answer, loseHeart, complete, logSession } = useProgress();
  const ref = useMemo(() => resolveLesson(id), [id]);
  const timer = useSessionTimer();
  const logged = useRef(false);

  // Plan once on mount; later progress updates must not reshuffle the lesson.
  const [plan] = useState(() => (ref ? planLesson(state, ref, seededRng(Date.now()), Date.now()) : null));
  const exercises = plan?.exercises ?? [];
  const [index, setIndex] = useState(0);
  // Her latest answer to each question. Going back lets her answer again; wrong answers aren't repeated.
  const [attempts, setAttempts] = useState<Attempts>({});
  // Bumped on every visit to a question, so returning to one shows it fresh to answer again.
  const [visit, setVisit] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; correction?: string; praise: string } | null>(null);

  const lessonId = !ref ? id : ref.kind === 'practice' ? 'practice' : ref.kind === 'checkpoint' ? `${ref.unit.id}-checkpoint` : ref.lesson.id;

  /** Records the session in the time log, once. */
  const log = (completed: boolean, stars: number) => {
    if (logged.current || !ref) return;
    logged.current = true;
    const score = scoreAttempts(attemptsRef.current);
    logSession({
      lessonId,
      kind: ref.kind,
      mode: 'qa',
      startedAt: timer.startedAt,
      activeMs: timer.activeMs(),
      stars,
      accuracy: score.answered ? score.correct / Math.max(1, exercises.length) : 0,
      completed,
    });
  };
  const attemptsRef = useRef(attempts);
  attemptsRef.current = attempts;

  const quit = async () => {
    if (await confirm('Quit lesson?', "You'll lose your progress in this lesson.", 'Quit')) {
      // Time spent still counts in the log, even without finishing.
      if (scoreAttempts(attemptsRef.current).answered > 0) log(false, 0);
      leave();
    }
  };
  const quitRef = useRef(quit);
  quitRef.current = quit;

  // Android back button asks before quitting, like ✕. (The ← button goes to the previous question.)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      quitRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const isPractice = ref?.kind === 'practice';
  const heartsOn = state.settings.hearts && !isPractice;
  const hearts = currentHearts(state, Date.now());

  if (!ref || !plan) {
    return <Message title="Lesson not found" onClose={leave} />;
  }
  if (isPractice && exercises.length === 0) {
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

  const exercise = exercises[index];
  const script = resolveScript(state.settings.script, plan.score);
  const previous = attempts[index];
  const isLast = index + 1 >= exercises.length;
  const answeredCount = scoreAttempts(attempts).answered;

  const goTo = (i: number) => {
    setFeedback(null);
    setIndex(i);
    setVisit((v) => v + 1);
  };

  const onResult = (correct: boolean, correction?: string, given?: string) => {
    feedbackHaptic(correct);
    setAttempts((a) => recordAttempt(a, index, { correct, correction, given }));
    answer(exercise.wordIds, correct);
    if (!correct && heartsOn) loseHeart();
    setFeedback({ correct, correction, praise: PRAISE[Math.floor(Math.random() * PRAISE.length)] });
  };

  const finish = () => {
    const score = scoreAttempts(attemptsRef.current);
    const result = complete({
      kind: ref.kind,
      id: lessonId,
      unitIndex: ref.kind === 'practice' ? undefined : ref.unit.index,
      correct: score.correct,
      total: exercises.length,
      mistakes: score.mistakes,
    });
    const activeMs = timer.activeMs();
    log(true, result.starsEarned);
    router.replace({
      pathname: '/lesson/complete',
      params: {
        xp: String(result.xpEarned),
        accuracy: String(Math.round((score.correct / Math.max(1, exercises.length)) * 100)),
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

  /** Onwards after answering (or skipping a question she'd already answered). */
  const next = () => {
    const wasWrong = feedback && !feedback.correct;
    // Lost the last heart: the lesson ends without credit.
    if (wasWrong && heartsOn && hearts <= 0) {
      setFeedback(null);
      log(false, 0);
      router.replace({ pathname: '/lesson/complete', params: { kind: ref.kind, failed: '1' } });
      return;
    }
    if (isLast) finish();
    else goTo(index + 1);
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
          onPress={() => goTo(index - 1)}
          disabled={index === 0}
          hitSlop={12}
          accessibilityLabel="Previous question"
          style={index === 0 && styles.disabled}
        >
          <Ionicons name="arrow-back" size={28} color={index > 0 ? theme.colors.text : theme.colors.textMuted} />
        </Pressable>
        <ProgressBar value={answeredCount / exercises.length} />
        <SessionClock activeMs={timer.activeMs} />
        {heartsOn ? <StatPill icon="heart" color={theme.colors.heart} value={hearts} /> : null}
      </View>
      <Text style={styles.position} testID="position">
        Question {index + 1} of {exercises.length}
        {ref.kind === 'checkpoint' ? ' · checkpoint: score 80% to pass' : ''}
      </Text>

      {previous && !feedback ? (
        <View style={styles.previous} testID="previous-answer">
          <Text style={styles.previousText}>
            {previous.correct ? '✓' : '✗'} Last time:{' '}
            <Text style={styles.correctionStrong}>{previous.given ?? (previous.correct ? 'right' : 'wrong')}</Text>. Answer
            again, or skip ahead.
          </Text>
          <Pressable testID="skip-next" onPress={next} hitSlop={8} style={styles.skip}>
            <Text style={styles.skipText}>{isLast ? 'Finish →' : 'Skip ahead →'}</Text>
          </Pressable>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.body} behavior="padding">
        <ExerciseView
          key={`${index}-${visit}`}
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
            label={isLast ? 'Finish' : 'Continue'}
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
  position: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    marginTop: theme.spacing(2),
  },
  previous: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginHorizontal: theme.spacing(5),
    marginTop: theme.spacing(2),
    padding: theme.spacing(3),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  previousText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
  },
  skip: {
    paddingVertical: theme.spacing(1),
  },
  skipText: {
    color: theme.colors.primary,
    fontWeight: '800',
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
  disabled: {
    opacity: 0.35,
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
