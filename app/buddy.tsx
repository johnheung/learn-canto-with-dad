import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { useProgress } from '@/lib/context/ProgressContext';
import { SPECIES } from '@/lib/mascot';
import { speak } from '@/lib/speech';
import { MascotSpecies } from '@/lib/types';
import { theme } from '@/lib/theme';

const MAX_NAME = 16;

/** Choose and name a buddy. Also reachable later to rename or swap animal. */
export default function BuddyScreen() {
  const { state, adoptMascot } = useProgress();
  const [species, setSpecies] = useState<MascotSpecies>(state.mascot?.species ?? 'panda');
  const [name, setName] = useState(state.mascot?.name ?? '');

  const done = () => {
    adoptMascot(species, name);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{state.mascot ? 'Your buddy' : 'Choose your buddy'}</Text>
        <Text style={styles.detail}>Your buddy hatches after your first lesson and grows as you earn XP.</Text>

        <View style={styles.grid}>
          {SPECIES.map((s) => (
            <OptionCard
              key={s.id}
              testID={`species-${s.id}`}
              style={styles.cell}
              state={species === s.id ? 'selected' : 'idle'}
              onPress={() => {
                setSpecies(s.id);
                if (state.settings.sound) speak(s.hanzi);
              }}
            >
              <Text style={styles.emoji}>{s.emoji}</Text>
              <Text style={styles.hanzi}>{s.hanzi}</Text>
              <Text style={styles.sub}>{s.jyutping}</Text>
              <Text style={styles.sub}>{s.english}</Text>
            </OptionCard>
          ))}
        </View>

        <Text style={styles.label}>Give it a name</Text>
        <TextInput
          testID="buddy-name"
          value={name}
          onChangeText={(t) => setName(t.slice(0, MAX_NAME))}
          placeholder="e.g. Dim Sum"
          placeholderTextColor={theme.colors.border}
          style={styles.input}
          returnKeyType="done"
        />
        <Button testID="buddy-save" label={state.mascot ? 'Save' : 'Adopt!'} disabled={!name.trim()} onPress={done} />
        {state.mascot ? (
          <Pressable onPress={() => router.back()} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(5),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
  },
  cell: {
    flexGrow: 1,
    flexBasis: '30%',
    gap: 2,
  },
  emoji: {
    fontSize: 40,
  },
  hanzi: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sub: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginTop: theme.spacing(2),
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing(4),
    color: theme.colors.text,
    fontSize: 18,
  },
  cancel: {
    alignItems: 'center',
    padding: theme.spacing(3),
  },
  cancelText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
});
