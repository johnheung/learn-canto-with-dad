import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ExerciseView } from '@/components/exercises';
import { allSentences, allWords, units } from '@/lib/content';
import { buildProfile } from '@/lib/engine/difficulty';
import { generateLesson } from '@/lib/engine/generateLesson';
import { seededRng } from '@/lib/engine/random';
import { Exercise, ExerciseKind, ScriptMode } from '@/lib/types';

jest.mock('@/lib/speech', () => ({ speak: jest.fn(), detectCantoneseVoice: jest.fn(async () => null) }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

/** Generates lessons until one exercise of each kind is found. */
function exerciseOfKind(kind: ExerciseKind): Exercise {
  for (let seed = 1; seed < 500; seed++) {
    const unit = seed % 8;
    const lesson = units[unit].lessons[seed % 4];
    const found = generateLesson({
      focusWords: lesson.words,
      focusSentences: lesson.sentences,
      wordPool: allWords,
      sentencePool: allSentences,
      profile: buildProfile(seed % 11),
      rng: seededRng(seed),
    }).find((e) => e.kind === kind);
    if (found) return found;
  }
  throw new Error(`No ${kind} exercise generated`);
}

function setup(exercise: Exercise, script: ScriptMode = 'both') {
  const onResult = jest.fn();
  const utils = render(<ExerciseView exercise={exercise} script={script} sound={false} locked={false} onResult={onResult} />);
  return { onResult, ...utils };
}

const SCRIPTS: ScriptMode[] = ['jyutping', 'both', 'characters'];

describe.each(SCRIPTS)('exercises in %s mode', (script) => {
  it('mc-meaning: marks right and wrong answers', () => {
    const ex = exerciseOfKind('mc-meaning') as Extract<Exercise, { kind: 'mc-meaning' }>;
    const right = ex.options.indexOf(ex.answer);
    const { onResult } = setup(ex, script);
    expect(screen.getByTestId('check')).toBeDisabled();
    fireEvent.press(screen.getByTestId(`option-${right}`));
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenLastCalledWith(true, ex.answer, ex.answer);

    const second = setup(ex, script);
    fireEvent.press(screen.getByTestId(`option-${(right + 1) % ex.options.length}`));
    fireEvent.press(screen.getByTestId('check'));
    expect(second.onResult).toHaveBeenLastCalledWith(false, ex.answer, ex.options[(right + 1) % ex.options.length]);
  });

  it.each(['mc-cantonese', 'listen'] as const)('%s: marks the chosen word', (kind) => {
    const ex = exerciseOfKind(kind) as Extract<Exercise, { kind: 'mc-cantonese' | 'listen' }>;
    const right = ex.options.findIndex((o) => o.id === ex.answerId);
    const { onResult } = setup(ex, script);
    fireEvent.press(screen.getByTestId(`option-${(right + 1) % ex.options.length}`));
    fireEvent.press(screen.getByTestId(`option-${right}`));
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenCalledWith(true, expect.stringContaining(ex.word.hanzi), expect.stringContaining(ex.word.hanzi));
  });

  it('match: finishes only after every pair is matched, ignoring mismatches', () => {
    const ex = exerciseOfKind('match') as Extract<Exercise, { kind: 'match' }>;
    const { onResult } = setup(ex, script);
    const n = ex.pairs.length;
    const leftIds = ex.pairs.map((_, i) => screen.getByTestId(`match-left-${i}`));
    const rightIds = ex.pairs.map((_, i) => screen.getByTestId(`match-right-${i}`));
    // Pair by finding, for each left card, the right card whose English matches.
    const leftWords = leftIds.map((el) => ex.pairs.find((p) => screen.queryAllByText(p.hanzi).some((t) => isInside(t, el)))!);
    const rightWords = rightIds.map((el) => ex.pairs.find((p) => screen.queryAllByText(p.english).some((t) => isInside(t, el)))!);
    // One deliberate mismatch.
    const wrongRight = rightWords.findIndex((w) => w.id !== leftWords[0].id);
    fireEvent.press(leftIds[0]);
    fireEvent.press(rightIds[wrongRight]);
    expect(onResult).not.toHaveBeenCalled();
    for (let i = 0; i < n; i++) {
      fireEvent.press(leftIds[i]);
      fireEvent.press(rightIds[rightWords.findIndex((w) => w.id === leftWords[i].id)]);
    }
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('tone: marks the tone', () => {
    const ex = exerciseOfKind('tone') as Extract<Exercise, { kind: 'tone' }>;
    const { onResult } = setup(ex, script);
    const wrong = ex.options.find((t) => t !== ex.answer)!;
    fireEvent.press(screen.getByTestId(`tone-${wrong}`));
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenLastCalledWith(false, expect.stringContaining(`tone ${ex.answer}`), expect.stringContaining(`tone ${wrong}`));
  });

  it('build-en: accepts the sentence in order, rejects it out of order', () => {
    const ex = exerciseOfKind('build-en') as Extract<Exercise, { kind: 'build-en' }>;
    const tap = (tokens: string[]) => {
      const used = new Set<number>();
      for (const tok of tokens) {
        const i = ex.bank.findIndex((b, j) => b === tok && !used.has(j));
        used.add(i);
        fireEvent.press(screen.getByTestId(`bank-${i}`));
      }
    };
    const first = setup(ex, script);
    tap(ex.answer);
    fireEvent.press(screen.getByTestId('check'));
    expect(first.onResult).toHaveBeenLastCalledWith(true, ex.sentence.english, ex.answer.join(' '));

    if (ex.answer.length > 1) {
      const second = setup(ex, script);
      tap([...ex.answer].reverse());
      fireEvent.press(screen.getByTestId('check'));
      expect(second.onResult).toHaveBeenLastCalledWith(false, ex.sentence.english, [...ex.answer].reverse().join(' '));
    }
  });

  it('build-yue: accepts the right tokens', () => {
    const ex = exerciseOfKind('build-yue') as Extract<Exercise, { kind: 'build-yue' }>;
    const { onResult } = setup(ex, script);
    const used = new Set<number>();
    for (const tok of ex.answer) {
      const i = ex.bank.findIndex((b, j) => b.hanzi === tok.hanzi && !used.has(j));
      used.add(i);
      fireEvent.press(screen.getByTestId(`bank-${i}`));
    }
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenLastCalledWith(true, expect.any(String), ex.answer.map((t) => t.hanzi).join(''));
  });

  it('type: grades typed Jyutping', () => {
    const ex = exerciseOfKind('type') as Extract<Exercise, { kind: 'type' }>;
    const { onResult } = setup(ex, script);
    expect(screen.getByTestId('check')).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('type-input'), ex.word.jyutping);
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenLastCalledWith(true, expect.stringContaining(ex.word.jyutping), ex.word.jyutping);
    fireEvent.changeText(screen.getByTestId('type-input'), 'zzz');
    fireEvent.press(screen.getByTestId('check'));
    expect(onResult).toHaveBeenLastCalledWith(false, expect.any(String), 'zzz');
  });
});

describe('locked state', () => {
  it('hides the Check button while feedback is showing', () => {
    const ex = exerciseOfKind('mc-meaning');
    render(<ExerciseView exercise={ex} script="both" sound={false} locked onResult={jest.fn()} />);
    expect(screen.queryByTestId('check')).toBeNull();
  });
});

function isInside(node: { parent: unknown } | null, container: unknown): boolean {
  for (let n = node as { parent: unknown } | null; n; n = n.parent as { parent: unknown } | null) {
    if (n === container) return true;
  }
  return false;
}
