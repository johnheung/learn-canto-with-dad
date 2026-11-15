import React from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { SessionClock } from '@/components/SessionClock';
import { formatClock } from '@/lib/dashboard';
import { recordAttempt, scoreAttempts } from '@/lib/engine/attempts';

describe('re-answering questions', () => {
  it('counts the latest answer to each question', () => {
    let a = recordAttempt({}, 0, { correct: true, given: 'hello' });
    a = recordAttempt(a, 1, { correct: false, given: 'bye', correction: 'thanks' });
    a = recordAttempt(a, 2, { correct: false, given: 'x' });
    expect(scoreAttempts(a)).toEqual({ correct: 1, mistakes: 2, answered: 3 });
    // She goes back and fixes question 2.
    a = recordAttempt(a, 1, { correct: true, given: 'thanks' });
    expect(scoreAttempts(a)).toEqual({ correct: 2, mistakes: 1, answered: 3 });
    expect(a[1]).toMatchObject({ correct: true, given: 'thanks', tries: 2 });
    // Changing a right answer to a wrong one counts against her too.
    a = recordAttempt(a, 0, { correct: false, given: 'hi' });
    expect(scoreAttempts(a)).toEqual({ correct: 1, mistakes: 2, answered: 3 });
  });

  it('a wrong answer is recorded once, not added again to be repeated', () => {
    const a = recordAttempt({}, 4, { correct: false });
    expect(Object.keys(a)).toEqual(['4']);
    expect(scoreAttempts(a).answered).toBe(1);
  });
});

describe('session clock', () => {
  it('formats like a stopwatch', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(5_400)).toBe('0:05');
    expect(formatClock(4 * 60_000 + 12_000)).toBe('4:12');
    expect(formatClock(3_729_000)).toBe('1:02:09');
  });

  describe('ticking', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('updates every second', () => {
      let ms = 0;
      const activeMs = () => ms;
      render(<SessionClock activeMs={activeMs} />);
      expect(screen.getByTestId('session-clock')).toHaveTextContent('⏱ 0:00');
      ms = 65_000;
      act(() => jest.advanceTimersByTime(1000));
      expect(screen.getByTestId('session-clock')).toHaveTextContent('⏱ 1:05');
    });
  });
});
