import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { useProgress } from '@/lib/context/ProgressContext';
import { LEVELS } from '@/lib/engine/difficulty';
import { DAILY_GOALS } from '@/lib/progress';
import { ANDROID_VOICE_STEPS, speak, useCantoneseVoice } from '@/lib/speech';
import { ScriptPreference } from '@/lib/types';
import { theme } from '@/lib/theme';

const SCRIPTS: { id: ScriptPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'jyutping', label: 'Jyutping' },
  { id: 'both', label: 'Both' },
  { id: 'characters', label: '漢字' },
];

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable
          key={String(o.id)}
          testID={`${testIDPrefix}-${o.id}`}
          onPress={() => onChange(o.id)}
          style={[styles.segment, value === o.id && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, value === o.id && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const { state, updateSettings } = useProgress();
  const { settings } = state;
  const { voice, recheck } = useCantoneseVoice();

  const levelInfo = LEVELS.find((l) => l.id === settings.level);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Section title="Difficulty" detail={levelInfo?.description}>
          <Segmented
            testIDPrefix="level"
            options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
            value={settings.level}
            onChange={(level) => updateSettings({ level })}
          />
          <Text style={styles.note}>
            Lessons also get harder as you move through the course and as you level them up.
          </Text>
        </Section>

        <Section
          title="Script"
          detail="Auto starts with Jyutping, then moves to characters as you improve. In characters mode, tap a word to see its Jyutping."
        >
          <Segmented
            testIDPrefix="script"
            options={SCRIPTS}
            value={settings.script}
            onChange={(script) => updateSettings({ script })}
          />
        </Section>

        <Section
          title="How to learn"
          detail="Questions, or the Lantern Catch game. Stars from both add up. Unit tests are always questions."
        >
          <Segmented
            testIDPrefix="learnmode"
            options={[
              { id: 'qa', label: '📝 Questions' },
              { id: 'game', label: '🏮 Game' },
            ]}
            value={settings.learnMode}
            onChange={(learnMode) => updateSettings({ learnMode })}
          />
        </Section>

        <Section title="Daily goal">
          <Segmented
            testIDPrefix="goal"
            options={DAILY_GOALS.map((g) => ({ id: g.xp, label: `${g.xp} XP` }))}
            value={settings.dailyGoal}
            onChange={(dailyGoal) => updateSettings({ dailyGoal })}
          />
        </Section>

        <Section title="Lesson options">
          <Row label="Sound" detail="Play Cantonese audio">
            <Switch value={settings.sound} onValueChange={(sound) => updateSettings({ sound })} />
          </Row>
          <Row label="Hearts" detail="Lose a heart for each mistake. Off means unlimited mistakes.">
            <Switch value={settings.hearts} onValueChange={(hearts) => updateSettings({ hearts })} />
          </Row>
          <Text style={styles.note} testID="voice-status">
            {voice === undefined
              ? 'Checking for a Cantonese voice…'
              : voice
                ? `Cantonese voice found (${voice}).`
                : `No Cantonese voice found, so audio will sound wrong. To install one: ${ANDROID_VOICE_STEPS}`}
          </Text>
          {voice === null ? (
            <Button testID="voice-recheck" label="Check again" variant="secondary" onPress={recheck} />
          ) : null}
          <Button label="Test voice · 你好" variant="secondary" onPress={() => speak('你好')} />
        </Section>

        <Section title="Buddy" detail={state.mascot ? `Rename ${state.mascot.name} or pick a different animal.` : 'Adopt a buddy that grows as you learn.'}>
          <Button testID="edit-buddy" label={state.mascot ? 'Change buddy' : 'Adopt a buddy'} variant="secondary" onPress={() => router.push('/buddy')} />
        </Section>

        <Section title="Parent area" detail="Set rewards and when they unlock, or reset progress. Protected by a PIN. Everything is stored on this phone only.">
          <Button testID="parent-area" label="Open parent area 🔒" variant="secondary" onPress={() => router.push('/parent')} />
        </Section>

        <Text style={styles.footer}>Romanisation: Jyutping (LSHK). Course content is pending review by a native speaker.</Text>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.note}>{detail}</Text> : null}
      {children}
    </View>
  );
}

function Row({ label, detail, children }: { label: string; detail: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.note}>{detail}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(4),
    gap: theme.spacing(4),
    paddingBottom: theme.spacing(10),
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  note: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing(2.5),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    color: theme.colors.border,
    fontSize: 12,
    textAlign: 'center',
  },
});
