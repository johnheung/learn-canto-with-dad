import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { HeaderStats } from '@/components/HeaderStats';
import { PinPrompt } from '@/components/PinPrompt';
import { ProgressBar } from '@/components/ProgressBar';
import { useProgress } from '@/lib/context/ProgressContext';
import { units } from '@/lib/content';
import { describeGoal, rewardProgress, rewardStatus } from '@/lib/rewards';
import { speak } from '@/lib/speech';
import {
  collectedCount,
  isPageComplete,
  PAGE_BONUS_STARS,
  STICKER_PAGES,
  stickerWord,
  TOTAL_STICKERS,
} from '@/lib/stickers';
import { Reward } from '@/lib/types';
import { feedbackHaptic } from '@/lib/ui';
import { theme } from '@/lib/theme';

export default function RewardsScreen() {
  const { state, claim } = useProgress();
  const now = Date.now();
  const [claiming, setClaiming] = useState<Reward | null>(null);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);

  const active = state.rewards.filter((r) => rewardStatus(state, r, now) !== 'claimed');
  const done = state.rewards.filter((r) => rewardStatus(state, r, now) === 'claimed');

  return (
    <Screen>
      <HeaderStats />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rewards</Text>

        {justClaimed ? (
          <View style={styles.celebrate} testID="claimed-banner">
            <Text style={styles.celebrateEmoji}>🎉</Text>
            <Text style={styles.celebrateText}>Enjoy your reward: {justClaimed}!</Text>
          </View>
        ) : null}

        {active.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No rewards yet 🎁</Text>
            <Text style={styles.muted}>Ask Dad to set one up in Settings → Parent area.</Text>
          </View>
        ) : (
          active.map((r) => {
            const progress = Math.min(rewardProgress(state, r, now), r.target);
            const ready = rewardStatus(state, r, now) === 'ready';
            return (
              <View key={r.id} style={[styles.card, ready && styles.cardReady]} testID={`reward-${r.id}`}>
                <Text style={styles.cardTitle}>{r.title}</Text>
                <Text style={styles.muted}>
                  {describeGoal(r.goal, r.target)}
                  {r.repeat ? ' · repeats' : ''}
                  {r.claims.length ? ` · claimed ${r.claims.length}×` : ''}
                </Text>
                <View style={styles.row}>
                  <View style={styles.bar}>
                    <ProgressBar value={progress / r.target} color={ready ? theme.colors.success : theme.colors.accent} />
                  </View>
                  <Text style={styles.count}>
                    {progress}/{r.target}
                  </Text>
                </View>
                {ready ? (
                  <Button testID="claim" label="Claim 🎁" variant="success" onPress={() => setClaiming(r)} />
                ) : null}
              </View>
            );
          })
        )}

        {done.length > 0 ? (
          <>
            <Text style={styles.section}>Claimed</Text>
            {done.map((r) => (
              <View key={r.id} style={[styles.card, styles.cardDone]}>
                <Text style={styles.cardTitle}>✅ {r.title}</Text>
                <Text style={styles.muted}>{new Date(r.claims[r.claims.length - 1]).toLocaleDateString()}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>
          Sticker book · {collectedCount(state)}/{TOTAL_STICKERS}
        </Text>
        <Text style={styles.muted}>
          Every lesson earns a sticker. Fill a page for {PAGE_BONUS_STARS} bonus stars. Tap a sticker to hear it.
        </Text>
        {STICKER_PAGES.map((page) => {
          const unit = units.find((u) => u.id === page.unitId)!;
          const complete = isPageComplete(state, page);
          return (
            <View key={page.unitId} style={[styles.page, complete && styles.pageComplete]}>
              <Text style={styles.pageTitle}>
                {unit.title} {unit.hanziTitle}
                {complete ? '  ⭐ Complete!' : ''}
              </Text>
              <View style={styles.stickers}>
                {page.stickers.map((st) => {
                  const have = (state.stickers[st.wordId] ?? 0) > 0;
                  const word = stickerWord(st);
                  return (
                    <Pressable
                      key={st.wordId}
                      testID={`sticker-${st.wordId}`}
                      disabled={!have}
                      onPress={() => state.settings.sound && speak(word.hanzi)}
                      style={[styles.sticker, !have && styles.stickerMissing]}
                    >
                      <Text style={styles.stickerEmoji}>{have ? st.emoji : '❔'}</Text>
                      <Text style={styles.stickerHanzi}>{have ? word.hanzi : ' '}</Text>
                      <Text style={styles.stickerSub} numberOfLines={1}>
                        {have ? word.jyutping : ' '}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <PinPrompt
        visible={!!claiming}
        mode="verify"
        expected={state.parentPin}
        title={claiming ? `Dad, confirm "${claiming.title}"` : ''}
        onCancel={() => setClaiming(null)}
        onSuccess={() => {
          if (!claiming) return;
          claim(claiming.id);
          feedbackHaptic(true);
          setJustClaimed(claiming.title);
          setClaiming(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing(4),
    gap: theme.spacing(3),
    paddingBottom: theme.spacing(10),
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  celebrate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
  },
  celebrateEmoji: {
    fontSize: 32,
  },
  celebrateText: {
    flex: 1,
    color: theme.colors.success,
    fontWeight: '800',
    fontSize: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  cardReady: {
    borderColor: theme.colors.success,
  },
  cardDone: {
    opacity: 0.7,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
  },
  count: {
    color: theme.colors.text,
    fontWeight: '800',
    minWidth: 48,
    textAlign: 'right',
  },
  section: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: theme.spacing(3),
  },
  page: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(3),
    gap: theme.spacing(2),
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  pageComplete: {
    borderColor: theme.colors.accent,
  },
  pageTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  stickers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
  },
  sticker: {
    flexBasis: '22%',
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: 2,
  },
  stickerMissing: {
    opacity: 0.4,
  },
  stickerEmoji: {
    fontSize: 30,
  },
  stickerHanzi: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  stickerSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
});
