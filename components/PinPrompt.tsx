import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { feedbackHaptic, tapHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

export const PIN_LENGTH = 4;

interface PinPromptProps {
  visible: boolean;
  /** `create` asks for a new PIN twice; `verify` checks it against `expected`. */
  mode: 'create' | 'verify';
  expected?: string | null;
  title: string;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'cancel', '0', 'back'];

export function PinPrompt({ visible, mode, expected, title, onSuccess, onCancel }: PinPromptProps) {
  const [digits, setDigitsState] = useState('');
  // Latest digits, so fast taps each add to the previous one.
  const digitsRef = useRef('');
  const setDigits = (d: string) => {
    digitsRef.current = d;
    setDigitsState(d);
  };
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setDigits('');
      setFirst(null);
      setError(null);
    }
  }, [visible]);

  const entered = (pin: string) => {
    if (mode === 'verify') {
      if (pin === expected) return onSuccess(pin);
      feedbackHaptic(false);
      setError('Wrong PIN. Try again.');
    } else if (first === null) {
      setFirst(pin);
      setError(null);
    } else if (pin === first) {
      return onSuccess(pin);
    } else {
      feedbackHaptic(false);
      setFirst(null);
      setError("PINs didn't match. Start again.");
    }
    setDigits('');
  };

  const press = (key: string) => {
    tapHaptic();
    if (key === 'cancel') return onCancel();
    if (key === 'back') return setDigits(digitsRef.current.slice(0, -1));
    const next = digitsRef.current + key;
    if (next.length === PIN_LENGTH) entered(next);
    else setDigits(next);
  };

  const prompt =
    mode === 'verify' ? 'Enter the parent PIN' : first === null ? 'Choose a 4-digit parent PIN' : 'Enter it again to confirm';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.sheet} testID="pin-prompt">
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.prompt}>{prompt}</Text>
            <View style={styles.dots}>
              {Array.from({ length: PIN_LENGTH }, (_, i) => (
                <View key={i} style={[styles.dot, i < digits.length && styles.dotFilled]} />
              ))}
            </View>
            <Text style={styles.error}>{error ?? ' '}</Text>
            <View style={styles.keys}>
              {KEYS.map((k) => (
                <Pressable
                  key={k}
                  testID={`pin-key-${k}`}
                  accessibilityLabel={k === 'back' ? 'Delete' : k === 'cancel' ? 'Cancel' : k}
                  onPress={() => press(k)}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={k.length > 1 ? styles.keyLabel : styles.keyDigit}>
                    {k === 'back' ? '⌫' : k === 'cancel' ? 'Cancel' : k}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(5),
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  prompt: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing(3),
    marginTop: theme.spacing(2),
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
  },
  dotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  error: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing(2),
    width: 3 * 72 + 2 * theme.spacing(2),
  },
  key: {
    width: 72,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: {
    backgroundColor: theme.colors.border,
  },
  keyDigit: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  keyLabel: {
    color: theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
});
