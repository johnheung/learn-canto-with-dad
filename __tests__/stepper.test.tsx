import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { clearAllMockStorages } from '@react-native-async-storage/async-storage/jest';
import { NumberStepper, stepValue } from '@/components/NumberStepper';
import { RewardEditor } from '@/components/RewardEditor';
import { ProgressProvider, useProgress } from '@/lib/context/ProgressContext';
import { ProgressState } from '@/lib/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest'),
);
jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

/** A stepper wired to real state, like a screen would use it. */
function Harness({ initial, step = 5, min = 1, max = 999 }: { initial: number; step?: number; min?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberStepper testID="t" value={value} onChange={setValue} step={step} min={min} max={max} />
      <TextProbe value={value} />
    </>
  );
}

function TextProbe({ value }: { value: number }) {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return <Text testID="committed">{String(value)}</Text>;
}

const input = () => screen.getByTestId('t-input');
const committed = () => Number(screen.getByTestId('committed').props.children);

describe('stepValue', () => {
  it('snaps to multiples of the step', () => {
    expect(stepValue(30, 1, 5, 1, 999)).toBe(35);
    expect(stepValue(32, 1, 5, 1, 999)).toBe(35);
    expect(stepValue(32, -1, 5, 1, 999)).toBe(30);
    expect(stepValue(30, -1, 5, 1, 999)).toBe(25);
    expect(stepValue(7, 1, 1, 1, 999)).toBe(8);
  });

  it('stays within min and max', () => {
    expect(stepValue(5, -1, 5, 1, 999)).toBe(1);
    expect(stepValue(1, -1, 5, 1, 999)).toBe(1);
    expect(stepValue(997, 1, 5, 1, 999)).toBe(999);
  });
});

describe('NumberStepper', () => {
  it('lets you clear the box and type a new number (the reported bug)', () => {
    render(<Harness initial={30} />);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '');
    expect(input().props.value).toBe('');
    expect(committed()).toBe(30); // last valid value kept while blank
    fireEvent.changeText(input(), '4');
    fireEvent.changeText(input(), '40');
    expect(input().props.value).toBe('40');
    expect(committed()).toBe(40);
    fireEvent(input(), 'blur');
    expect(input().props.value).toBe('40');
  });

  it('typing over a selected number replaces it', () => {
    render(<Harness initial={30} />);
    expect(input().props.selectTextOnFocus).toBe(true);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '12');
    expect(committed()).toBe(12);
  });

  it('restores the last value if left blank', () => {
    render(<Harness initial={25} />);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '');
    fireEvent(input(), 'blur');
    expect(input().props.value).toBe('25');
    expect(committed()).toBe(25);
  });

  it('corrects 0 up to the minimum when editing ends', () => {
    render(<Harness initial={10} />);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '0');
    expect(committed()).toBe(1);
    fireEvent(input(), 'blur');
    expect(input().props.value).toBe('1');
  });

  it('ignores non-digits and limits length to the maximum', () => {
    render(<Harness initial={10} />);
    expect(input().props.maxLength).toBe(3);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '4a5');
    expect(input().props.value).toBe('45');
    fireEvent.changeText(input(), '1234');
    expect(input().props.value).toBe('123');
    expect(committed()).toBe(123);
  });

  it('+ and − step and snap to the step size', () => {
    render(<Harness initial={32} />);
    fireEvent.press(screen.getByTestId('t-plus'));
    expect(committed()).toBe(35);
    expect(input().props.value).toBe('35');
    fireEvent.press(screen.getByTestId('t-minus'));
    fireEvent.press(screen.getByTestId('t-minus'));
    expect(committed()).toBe(25);
  });

  it('counts every tap when tapping quickly', () => {
    render(<Harness initial={30} />);
    for (let i = 0; i < 4; i++) fireEvent.press(screen.getByTestId('t-plus'));
    expect(committed()).toBe(50);
    for (let i = 0; i < 6; i++) fireEvent.press(screen.getByTestId('t-minus'));
    expect(committed()).toBe(20);
  });

  it('steps from a just-typed number', () => {
    render(<Harness initial={30} />);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '12');
    fireEvent.press(screen.getByTestId('t-plus'));
    expect(committed()).toBe(15);
  });

  it('disables − at the minimum and + at the maximum', () => {
    render(<Harness initial={1} max={3} step={1} />);
    expect(screen.getByTestId('t-minus')).toBeDisabled();
    fireEvent.press(screen.getByTestId('t-plus'));
    fireEvent.press(screen.getByTestId('t-plus'));
    expect(committed()).toBe(3);
    expect(screen.getByTestId('t-plus')).toBeDisabled();
  });

  describe('holding a button', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps stepping until released', () => {
      render(<Harness initial={10} step={1} />);
      fireEvent(screen.getByTestId('t-plus'), 'longPress');
      expect(committed()).toBe(11);
      act(() => jest.advanceTimersByTime(90 * 3));
      expect(committed()).toBe(14);
      fireEvent(screen.getByTestId('t-plus'), 'pressOut');
      act(() => jest.advanceTimersByTime(1000));
      expect(committed()).toBe(14);
    });

    it('stops at the limit', () => {
      render(<Harness initial={995} step={1} />);
      fireEvent(screen.getByTestId('t-plus'), 'longPress');
      act(() => jest.advanceTimersByTime(90 * 20));
      expect(committed()).toBe(999);
    });
  });
});

describe('RewardEditor', () => {
  beforeEach(() => clearAllMockStorages());

  let latest: ProgressState | undefined;
  function StateProbe() {
    latest = useProgress().state;
    return null;
  }

  async function renderEditor(reward?: ProgressState['rewards'][number]) {
    const onClose = jest.fn();
    render(
      <ProgressProvider>
        <StateProbe />
        <RewardEditor reward={reward} onClose={onClose} />
      </ProgressProvider>,
    );
    await waitFor(() => expect(latest).toBeDefined());
    await act(async () => {});
    return onClose;
  }

  it('saves a reward with a typed star target', async () => {
    const onClose = await renderEditor();
    fireEvent.changeText(screen.getByTestId('reward-title'), 'Ice cream');
    fireEvent(screen.getByTestId('target-input'), 'focus');
    fireEvent.changeText(screen.getByTestId('target-input'), '');
    fireEvent.changeText(screen.getByTestId('target-input'), '42');
    expect(screen.getByTestId('reward-summary')).toHaveTextContent('Earn 42 stars from now');
    fireEvent.press(screen.getByTestId('reward-save'));
    expect(onClose).toHaveBeenCalled();
    expect(latest!.rewards.at(-1)).toMatchObject({ title: 'Ice cream', goal: 'stars', target: 42, repeat: false });
  });

  it('uses + and − with the goal’s step, and resets the target when the goal changes', async () => {
    await renderEditor();
    fireEvent.changeText(screen.getByTestId('reward-title'), 'Movie');
    fireEvent.press(screen.getByTestId('target-plus')); // stars: 30 → 35
    fireEvent.press(screen.getByTestId('target-plus')); // → 40
    expect(screen.getByTestId('target-input').props.value).toBe('40');
    fireEvent.press(screen.getByTestId('goal-type-streak')); // default 7, step 1
    expect(screen.getByTestId('target-input').props.value).toBe('7');
    fireEvent.press(screen.getByTestId('target-minus'));
    expect(screen.getByTestId('reward-summary')).toHaveTextContent('Reach a 6-day streak');
    fireEvent(screen.getByTestId('reward-repeat'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('reward-save'));
    expect(latest!.rewards.at(-1)).toMatchObject({ title: 'Movie', goal: 'streak', target: 6, repeat: true });
  });

  it('edits an existing reward', async () => {
    const existing = {
      id: 'r1',
      title: 'Toy',
      goal: 'lessons' as const,
      target: 10,
      baseline: 0,
      repeat: false,
      claims: [],
    };
    await renderEditor(existing);
    expect(screen.getByTestId('target-input').props.value).toBe('10');
    fireEvent.press(screen.getByTestId('target-plus'));
    expect(screen.getByTestId('target-input').props.value).toBe('11');
    expect(screen.getByTestId('reward-summary')).toHaveTextContent('Finish 11 lessons (0 done so far)');
  });

  it('cannot save without a title', async () => {
    await renderEditor();
    expect(screen.getByTestId('reward-save')).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('reward-title'), '   ');
    expect(screen.getByTestId('reward-save')).toBeDisabled();
  });
});

describe('NumberStepper on Android ordering', () => {
  it('a + tap while typing is not undone when editing ends afterwards', () => {
    render(<Harness initial={30} />);
    fireEvent(input(), 'focus');
    fireEvent.changeText(input(), '12');
    fireEvent.press(screen.getByTestId('t-plus')); // keyboard closes...
    fireEvent(input(), 'blur'); // ...and the blur arrives after the tap
    expect(committed()).toBe(15);
    expect(input().props.value).toBe('15');
  });

  it('shows a new value from outside immediately when not typing', () => {
    const { rerender } = render(<NumberStepper testID="t" value={30} onChange={() => {}} />);
    rerender(<NumberStepper testID="t" value={10} onChange={() => {}} />);
    expect(input().props.value).toBe('10');
  });
});
