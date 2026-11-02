import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { HeaderStats } from '@/components/HeaderStats';
import { VoiceTip } from '@/components/VoiceTip';
import { BuddyCard } from '@/components/BuddyCard';
import { TodayCard } from '@/components/TodayCard';
import { useProgress } from '@/lib/context/ProgressContext';
import { checkpointId, units } from '@/lib/content';
import { useLayout } from '@/lib/layout';
import {
  crownsFor,
  currentHearts,
  isCheckpointUnlocked,
  isLessonUnlocked,
  isUnitUnlocked,
  MAX_CROWNS,
  nextHeartIn,
  XP,
} from '@/lib/progress';
import { Unit } from '@/lib/types';
import { theme } from '@/lib/theme';

// Horizontal offsets that make the path zig-zag.
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

export default function LearnScreen() {
  const { state } = useProgress();
  const layout = useLayout();
  const [selected, setSelected] = useState<string | null>(null);
  // Bigger lesson circles on tablets.
  const nodeSize = Math.round(72 * layout.scale);
  const now = Date.now();
  const outOfHearts = state.settings.hearts && currentHearts(state, now) === 0;
  const heartWait = nextHeartIn(state, now);

  const start = (id: string) => {
    setSelected(null);
    router.push(`/lesson/${id}`);
  };

  const renderUnit = (unit: Unit) => {
    const unlocked = isUnitUnlocked(state, unit.index);
    const nodes = [
      ...unit.lessons.map((l, i) => ({ id: l.id, title: l.title, lessonIndex: i as number | null })),
      { id: checkpointId(unit), title: `${unit.title} checkpoint`, lessonIndex: null },
    ];

    return (
      <View key={unit.id} style={styles.unit}>
        <View style={[styles.banner, { backgroundColor: unlocked ? unit.color : theme.colors.locked }]}>
          <View style={styles.bannerText}>
            <Text style={styles.unitLabel}>Unit {unit.index + 1}</Text>
            <Text style={styles.unitTitle}>
              {unit.title} <Text style={styles.unitHanzi}>{unit.hanziTitle}</Text>
            </Text>
            <Text style={styles.unitDesc}>{unit.description}</Text>
          </View>
          {!unlocked && unit.index > 0 ? (
            <Pressable
              testID={`jump-${unit.id}`}
              style={styles.jump}
              onPress={() => start(checkpointId(units[unit.index - 1]))}
            >
              <Text style={styles.jumpText}>Jump here?</Text>
            </Pressable>
          ) : null}
        </View>

        {nodes.map((node, i) => {
          const isCheckpoint = node.lessonIndex === null;
          const open = isCheckpoint ? isCheckpointUnlocked(state, unit) : isLessonUnlocked(state, unit, node.lessonIndex!);
          const crowns = isCheckpoint ? 0 : crownsFor(state, node.id);
          const passed = isCheckpoint && state.passedCheckpoints.includes(node.id);
          const done = isCheckpoint ? passed : crowns >= MAX_CROWNS;
          const color = !open ? theme.colors.locked : done ? theme.colors.accent : unit.color;
          const isSelected = selected === node.id;

          return (
            <View key={node.id} style={styles.nodeRow}>
              <View style={{ transform: [{ translateX: OFFSETS[i % OFFSETS.length] * layout.scale }], alignItems: 'center' }}>
                <Pressable
                  testID={`node-${node.id}`}
                  accessibilityLabel={node.title}
                  onPress={() => setSelected(isSelected ? null : node.id)}
                  style={({ pressed }) => [
                    styles.node,
                    {
                      width: nodeSize,
                      height: nodeSize - 6,
                      borderRadius: nodeSize / 2,
                      backgroundColor: color,
                      borderBottomColor: 'rgba(0,0,0,0.3)',
                    },
                    pressed && styles.nodePressed,
                  ]}
                >
                  <Ionicons
                    name={!open ? 'lock-closed' : isCheckpoint ? 'trophy' : done ? 'checkmark' : 'star'}
                    size={Math.round(30 * layout.scale)}
                    color="#FFFFFF"
                  />
                </Pressable>
                {!isCheckpoint && crowns > 0 ? (
                  <View style={styles.crowns}>
                    <Ionicons name="ribbon" size={12} color={theme.colors.accent} />
                    <Text style={styles.crownText}>{crowns}</Text>
                  </View>
                ) : null}
              </View>

              {isSelected ? (
                <View style={[styles.popover, { borderColor: open ? unit.color : theme.colors.border }]}>
                  <Text style={styles.popTitle}>{node.title}</Text>
                  {!open ? (
                    <Text style={styles.popDetail}>
                      {isCheckpoint ? 'Finish every lesson in this unit first.' : 'Finish the lesson before this one first.'}
                    </Text>
                  ) : outOfHearts ? (
                    <>
                      <Text style={styles.popDetail}>
                        You're out of hearts. Practise to earn one
                        {heartWait ? `, or wait ${Math.ceil(heartWait / 60000)} min` : ''}.
                      </Text>
                      <Button label="Practice" onPress={() => router.navigate('/practice')} />
                    </>
                  ) : (
                    <>
                      <Text style={styles.popDetail}>
                        {isCheckpoint
                          ? passed
                            ? 'Passed! Retake it any time.'
                            : 'Score 80% to unlock the next unit.'
                          : `Level ${Math.min(crowns + 1, MAX_CROWNS)} of ${MAX_CROWNS}${crowns >= MAX_CROWNS ? ' · mastered' : ''}`}
                      </Text>
                      <Button
                        testID="start-lesson"
                        label={`Start +${isCheckpoint ? XP.checkpoint : XP.lesson} XP`}
                        onPress={() => start(node.id)}
                      />
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  };

  // Wide screens: buddy and today's progress in a sidebar beside the path.
  if (layout.isWide) {
    return (
      <Screen wide>
        <HeaderStats />
        <View style={styles.columns}>
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
            <VoiceTip />
            <BuddyCard />
            <TodayCard />
          </ScrollView>
          <ScrollView style={styles.main} contentContainerStyle={styles.path}>
            {units.map(renderUnit)}
          </ScrollView>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeaderStats />
      <ScrollView contentContainerStyle={styles.path}>
        <VoiceTip />
        <BuddyCard />
        {units.map(renderUnit)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 360,
    flexGrow: 0,
    borderRightWidth: 2,
    borderRightColor: theme.colors.surfaceAlt,
  },
  sidebarContent: {
    padding: theme.spacing(4),
    gap: theme.spacing(4),
  },
  main: {
    flex: 1,
  },
  path: {
    padding: theme.spacing(4),
    paddingBottom: theme.spacing(20),
    gap: theme.spacing(6),
  },
  unit: {
    gap: theme.spacing(4),
  },
  banner: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  unitLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  unitTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  unitHanzi: {
    fontWeight: '600',
    fontSize: 16,
  },
  unitDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  jump: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(3),
  },
  jumpText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  nodeRow: {
    alignItems: 'center',
    gap: theme.spacing(3),
  },
  node: {
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodePressed: {
    borderBottomWidth: 2,
    transform: [{ translateY: 4 }],
  },
  crowns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  crownText: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 12,
  },
  popover: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderRadius: theme.radius.lg,
    padding: theme.spacing(4),
    gap: theme.spacing(3),
  },
  popTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  popDetail: {
    color: theme.colors.textMuted,
    fontSize: 15,
  },
});
