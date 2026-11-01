import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { OptionCard } from '@/components/OptionCard';
import { PinPrompt } from '@/components/PinPrompt';
import { useProgress } from '@/lib/context/ProgressContext';
import { describeGoal, goalInfo, REWARD_GOALS, rewardProgress, rewardStatus, RewardDraft } from '@/lib/rewards';
import { Reward } from '@/lib/types';
import { confirm } from '@/lib/ui';
import { theme } from '@/lib/theme';

const IDEAS = ['🍦 Ice cream', '🎮 30 min games', '🎬 Movie night', '💵 Pocket money', '🧸 New toy', '🍕 Pizza dinner'];

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/settings');
}

/** PIN-locked area for setting rewards and resetting progress. */
export default function ParentScreen() {
  const { state, setParentPin } = useProgress();
  const [unlocked, setUnlocked] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  if (!unlocked) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']}>
        <PinPrompt
          visible
          mode={state.parentPin ? 'verify' : 'create'}
          expected={state.parentPin}
          title={state.parentPin ? 'Parent area' : 'Set up the parent area'}
          onCancel={leave}
          onSuccess={(pin) => {
            if (!state.parentPin) setParentPin(pin);
            setUnlocked(true);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <ParentHome onChangePin={() => setChangingPin(true)} />
      <PinPrompt
        visible={changingPin}
        mode="create"
        title="Change parent PIN"
        onCancel={() => setChangingPin(false)}
        onSuccess={(pin) => {
          setParentPin(pin);
          setChangingPin(false);
        }}
      />
    </Screen>
  );
}

function ParentHome({ onChangePin }: { onChangePin: () => void }) {
  const { state, reset } = useProgress();
  const now = Date.now();
  const [editing, setEditing] = useState<Reward | 'new' | null>(null);

  if (editing) {
    return <RewardEditor reward={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable testID="parent-close" onPress={leave} hitSlop={12} accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={theme.colors.textMuted} />
        </Pressable>
        <Text style={styles.title}>Parent area</Text>
      </View>

      <Text style={styles.section}>Rewards</Text>
      <Text style={styles.muted}>
        Set a reward and the goal that unlocks it. Progress counts from when you set it (streaks use the current
        streak). She taps Claim when it's unlocked, and you confirm with your PIN.
      </Text>
      {state.rewards.map((r) => {
        const status = rewardStatus(state, r, now);
        return (
          <Pressable key={r.id} testID={`edit-reward-${r.id}`} onPress={() => setEditing(r)} style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.muted}>
                {describeGoal(r.goal, r.target)}
                {r.repeat ? ' · repeats' : ''}
              </Text>
              <Text style={styles.muted}>
                {status === 'claimed'
                  ? `Claimed ${new Date(r.claims[r.claims.length - 1]).toLocaleDateString()}`
                  : status === 'ready'
                    ? 'Unlocked: ready to claim'
                    : `Progress: ${rewardProgress(state, r, now)}/${r.target}`}
                {r.repeat && r.claims.length ? ` · claimed ${r.claims.length}×` : ''}
              </Text>
            </View>
            <Ionicons name="create-outline" size={22} color={theme.colors.textMuted} />
          </Pressable>
        );
      })}
      <Button testID="add-reward" label="Add reward" onPress={() => setEditing('new')} />

      <Text style={styles.section}>Settings</Text>
      <Button label="Change PIN" variant="secondary" onPress={onChangePin} />
      <Button
        testID="reset"
        label="Reset all progress"
        variant="danger"
        onPress={async () => {
          if (
            await confirm(
              'Reset progress?',
              'This deletes XP, streak, lessons, stickers and the buddy. Rewards and the PIN are kept, and reward progress starts again.',
              'Reset',
            )
          ) {
            await reset();
          }
        }}
      />
    </ScrollView>
  );
}

function RewardEditor({ reward, onClose }: { reward?: Reward; onClose: () => void }) {
  const { state, saveReward, removeReward } = useProgress();
  const [draft, setDraft] = useState<RewardDraft>(
    reward
      ? { title: reward.title, goal: reward.goal, target: reward.target, repeat: reward.repeat }
      : { title: '', goal: 'stars', target: goalInfo('stars').defaultTarget, repeat: false },
  );
  const info = goalInfo(draft.goal);
  const progressSoFar = reward && reward.goal === draft.goal ? rewardProgress(state, reward, Date.now()) : null;

  const setTarget = (t: number) => setDraft((d) => ({ ...d, target: Math.max(1, Math.min(999, t)) }));

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{reward ? 'Edit reward' : 'New reward'}</Text>

      <Text style={styles.label}>Reward</Text>
      <TextInput
        testID="reward-title"
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title: title.slice(0, 40) }))}
        placeholder="e.g. Ice cream outing"
        placeholderTextColor={theme.colors.border}
        style={styles.input}
      />
      <View style={styles.chips}>
        {IDEAS.map((idea) => (
          <Pressable key={idea} style={styles.chip} onPress={() => setDraft((d) => ({ ...d, title: idea }))}>
            <Text style={styles.chipText}>{idea}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Unlocks when she…</Text>
      {REWARD_GOALS.map((g) => (
        <OptionCard
          key={g.id}
          testID={`goal-type-${g.id}`}
          state={draft.goal === g.id ? 'selected' : 'idle'}
          style={styles.goalOption}
          onPress={() => setDraft((d) => (d.goal === g.id ? d : { ...d, goal: g.id, target: g.defaultTarget }))}
        >
          <Text style={styles.goalText}>{g.label}</Text>
        </OptionCard>
      ))}

      <Text style={styles.label}>How many {info.unit}?</Text>
      <View style={styles.stepper}>
        <Pressable testID="target-minus" style={styles.stepButton} onPress={() => setTarget(draft.target - info.step)}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <TextInput
          testID="reward-target"
          value={String(draft.target)}
          onChangeText={(t) => setTarget(Number(t.replace(/\D/g, '')) || 1)}
          keyboardType="number-pad"
          style={[styles.input, styles.targetInput]}
        />
        <Pressable testID="target-plus" style={styles.stepButton} onPress={() => setTarget(draft.target + info.step)}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
      <Text style={styles.summary} testID="reward-summary">
        {describeGoal(draft.goal, draft.target)}
        {draft.goal === 'streak' ? '' : reward && progressSoFar !== null ? ` (${progressSoFar} done so far)` : ' from now'}
      </Text>

      <View style={styles.row}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Repeat</Text>
          <Text style={styles.muted}>Starts again after each claim, e.g. a weekly treat.</Text>
        </View>
        <Switch testID="reward-repeat" value={draft.repeat} onValueChange={(repeat) => setDraft((d) => ({ ...d, repeat }))} />
      </View>

      <Button
        testID="reward-save"
        label="Save reward"
        disabled={!draft.title.trim()}
        onPress={() => {
          saveReward({ ...draft, title: draft.title.trim() }, reward?.id);
          onClose();
        }}
      />
      {reward ? (
        <Button
          testID="reward-delete"
          label="Delete reward"
          variant="danger"
          onPress={async () => {
            if (await confirm('Delete reward?', `"${reward.title}" will be removed.`, 'Delete')) {
              removeReward(reward.id);
              onClose();
            }
          }}
        />
      ) : null}
      <Button label="Cancel" variant="secondary" onPress={onClose} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(5),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing(3),
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  chip: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 999,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  goalOption: {
    alignItems: 'flex-start',
  },
  goalText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  stepButton: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  targetInput: {
    flex: 1,
    // Text inputs have an intrinsic width; let the row shrink on narrow phones.
    minWidth: 0,
    width: 0,
    textAlign: 'center',
    fontWeight: '800',
  },
  summary: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
});
