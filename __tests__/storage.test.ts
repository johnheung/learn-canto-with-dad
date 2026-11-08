import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllMockStorages } from '@react-native-async-storage/async-storage/jest';
import { loadState } from '@/lib/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest'),
);

describe('loading saved progress from an older version', () => {
  beforeEach(() => clearAllMockStorages());

  it('fills in the new fields and keeps the old ones', async () => {
    const old = {
      onboarded: true,
      settings: { level: 'beginner', script: 'auto', sound: true, hearts: false, dailyGoal: 20 },
      xp: 120,
      totals: { stars: 40, lessons: 12, checkpoints: 1 },
      rewards: [],
      parentPin: '4321',
    };
    await AsyncStorage.setItem('learncantowithdad.state.v1', JSON.stringify(old));
    const s = await loadState();
    expect(s.xp).toBe(120);
    expect(s.parentPin).toBe('4321');
    expect(s.starsSpent).toBe(0);
    expect(s.sessions).toEqual([]);
    expect(s.gameBest).toEqual({});
    expect(s.settings.learnMode).toBe('qa');
    expect(s.settings.voiceTipDismissed).toBe(false);
  });
});
