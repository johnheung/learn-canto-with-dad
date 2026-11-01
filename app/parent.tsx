import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { PinPrompt } from '@/components/PinPrompt';
import { RewardEditor } from '@/components/RewardEditor';
import { useProgress } from '@/lib/context/ProgressContext';
import { describeGoal, rewardProgress, rewardStatus } from '@/lib/rewards';
import { Reward } from '@/lib/types';
import { confirm } from '@/lib/ui';
import { theme } from '@/lib/theme';


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
});
