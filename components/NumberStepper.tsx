import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  testID?: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Next value up or down, snapping to multiples of `step` (32 → 35 → 40 with step 5). */
export function stepValue(value: number, direction: 1 | -1, step: number, min: number, max: number): number {
  const next = direction > 0 ? Math.floor(value / step) * step + step : Math.ceil(value / step) * step - step;
  return clamp(next, min, max);
}

const LONG_PRESS_MS = 400;
const REPEAT_EVERY_MS = 90;

/**
 * − [ number ] + control. The number can be typed: the box may be empty while typing,
 * and a blank or out-of-range entry is corrected when editing ends. Holding − or +
 * keeps stepping.
 */
export function NumberStepper({ value, onChange, step = 1, min = 1, max = 999, testID = 'stepper' }: NumberStepperProps) {
  // What's typed while editing; otherwise the box shows `value` directly, so changes appear at once.
  const [text, setTextState] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // Latest typed text: on Android, editing can end after a +/− tap, and must not undo it.
  const textRef = useRef(text);
  const setText = (s: string) => {
    textRef.current = s;
    setTextState(s);
  };
  // Latest value, so fast or held taps each build on the previous one.
  const valueRef = useRef(value);
  const timers = useRef<{ repeat?: ReturnType<typeof setInterval> }>({});

  if (!focused) valueRef.current = value;

  useEffect(() => stopRepeat, []);

  const commit = (n: number) => {
    const next = clamp(n, min, max);
    valueRef.current = next;
    setText(String(next));
    onChange(next);
    return next;
  };

  const stepOnce = (direction: 1 | -1) => {
    const next = stepValue(valueRef.current, direction, step, min, max);
    if (next === valueRef.current) stopRepeat(); // at the limit
    else commit(next);
  };

  // A tap steps once (on release, so starting a scroll on a button doesn't step).
  const tap = (direction: 1 | -1) => {
    // Finish any typing first, so the step starts from what's shown.
    Keyboard.dismiss();
    tapHaptic();
    stepOnce(direction);
  };

  // Holding keeps stepping until released or a limit is reached.
  const hold = (direction: 1 | -1) => {
    tap(direction);
    stopRepeat();
    timers.current.repeat = setInterval(() => stepOnce(direction), REPEAT_EVERY_MS);
  };

  function stopRepeat() {
    clearInterval(timers.current.repeat);
    timers.current = {};
  }

  const onChangeText = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, String(max).length);
    setText(digits);
    // Blank while typing is fine: keep the last valid value until editing ends.
    if (digits) {
      const n = Number(digits);
      valueRef.current = clamp(n, min, max);
      onChange(valueRef.current);
    }
  };

  const onBlur = () => {
    setFocused(false);
    commit(textRef.current ? Number(textRef.current) : valueRef.current);
  };

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={styles.row}>
      <Pressable
        testID={`${testID}-minus`}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        disabled={atMin}
        onPress={() => tap(-1)}
        onLongPress={() => hold(-1)}
        delayLongPress={LONG_PRESS_MS}
        onPressOut={stopRepeat}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, atMin && styles.disabled]}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <TextInput
        testID={`${testID}-input`}
        value={focused ? text : String(value)}
        onChangeText={onChangeText}
        onFocus={() => {
          setText(String(value));
          setFocused(true);
        }}
        onBlur={onBlur}
        onSubmitEditing={() => Keyboard.dismiss()}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        maxLength={String(max).length}
        style={styles.input}
      />
      <Pressable
        testID={`${testID}-plus`}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        disabled={atMax}
        onPress={() => tap(1)}
        onLongPress={() => hold(1)}
        delayLongPress={LONG_PRESS_MS}
        onPressOut={stopRepeat}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, atMax && styles.disabled]}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderBottomWidth: 4,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: theme.colors.border,
    borderBottomWidth: 1,
    transform: [{ translateY: 3 }],
  },
  disabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    // Text inputs have an intrinsic width; let the row shrink on narrow phones.
    minWidth: 0,
    width: 0,
    height: 64,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 0,
  },
});
