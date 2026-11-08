import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Button } from '@/components/Button';
import { NumberStepper } from '@/components/NumberStepper';
import { OptionCard } from '@/components/OptionCard';
import { useProgress } from '@/lib/context/ProgressContext';
import { describeGoal, goalInfo, goalValue, REWARD_GOALS, RewardDraft, rewardProgress } from '@/lib/rewards';
import { Reward } from '@/lib/types';
import { confirm } from '@/lib/ui';
import { theme } from '@/lib/theme';

const IDEAS = ['🍦 Ice cream', '🎮 30 min games', '🎬 Movie night', '💵 Pocket money', '🧸 New toy', '🍕 Pizza dinner'];
export const MAX_TARGET = 999;
const MAX_TITLE = 40;

/** Add or edit a reward: what it is, what unlocks it, and how many. */
export function RewardEditor({ reward, onClose }: { reward?: Reward; onClose: () => void }) {
  const { state, saveReward, removeReward } = useProgress();
  const [draft, setDraft] = useState<RewardDraft>(
    reward
      ? { title: reward.title, goal: reward.goal, target: reward.target, repeat: reward.repeat }
      : { title: '', goal: 'stars', target: goalInfo('stars').defaultTarget, repeat: false },
  );
  const info = goalInfo(draft.goal);
  // Stars: her balance. Others: everything she's done (or since the last claim, for an edited repeating reward).
  const soFar =
    reward && reward.goal === draft.goal ? rewardProgress(state, reward, Date.now()) : goalValue(state, draft.goal, Date.now());
  const soFarText =
    draft.goal === 'stars'
      ? ` (she has ${soFar} ⭐ to spend)`
      : draft.goal === 'streak'
        ? ` (current streak: ${soFar})`
        : ` (${soFar} done so far)`;

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
      <Text style={styles.title}>{reward ? 'Edit reward' : 'New reward'}</Text>

      <Text style={styles.label}>Reward</Text>
      <TextInput
        testID="reward-title"
        value={draft.title}
        onChangeText={(title) => setDraft((d) => ({ ...d, title: title.slice(0, MAX_TITLE) }))}
        maxLength={MAX_TITLE}
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
      <NumberStepper
        testID="target"
        value={draft.target}
        step={info.step}
        min={1}
        max={MAX_TARGET}
        onChange={(target) => setDraft((d) => ({ ...d, target }))}
      />
      <Text style={styles.summary} testID="reward-summary">
        {describeGoal(draft.goal, draft.target)}
        {soFarText}
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Repeat</Text>
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
      <Button testID="reward-cancel" label="Cancel" variant="secondary" onPress={onClose} />
    </KeyboardAwareScrollView>
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
    fontSize: 24,
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
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
});
