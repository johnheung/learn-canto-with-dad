import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { layoutFor } from '@/lib/layout';
import { applyOrientationPolicy } from '@/lib/orientation';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(async () => {}),
  unlockAsync: jest.fn(async () => {}),
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
}));

describe('layoutFor', () => {
  it('phones: one column, normal size, full width', () => {
    for (const [w, h] of [[320, 568], [360, 800], [412, 915]]) {
      const l = layoutFor(w, h);
      expect(l).toMatchObject({ isTablet: false, isWide: false, scale: 1, readableWidth: w });
    }
  });

  it('tablet portrait: larger text, readable width, still one column', () => {
    expect(layoutFor(800, 1280)).toMatchObject({ isTablet: true, isWide: false, isLandscape: false, scale: 1.2, readableWidth: 760 });
  });

  it('tablet landscape: two columns', () => {
    expect(layoutFor(1280, 800)).toMatchObject({ isTablet: true, isWide: true, isLandscape: true });
    expect(layoutFor(1024, 768)).toMatchObject({ isTablet: true, isWide: true });
  });

  it('a phone held sideways is not a tablet', () => {
    expect(layoutFor(800, 360)).toMatchObject({ isTablet: false, isLandscape: true, scale: 1 });
    expect(layoutFor(915, 412)).toMatchObject({ isTablet: false, isWide: false });
  });
});

describe('applyOrientationPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const withScreen = (width: number, height: number) =>
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width, height, scale: 2, fontScale: 1 });

  it('locks phones to portrait', async () => {
    withScreen(390, 844);
    await applyOrientationPolicy();
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
    expect(ScreenOrientation.unlockAsync).not.toHaveBeenCalled();
  });

  it('lets tablets rotate', async () => {
    withScreen(800, 1280);
    await applyOrientationPolicy();
    expect(ScreenOrientation.unlockAsync).toHaveBeenCalled();
    expect(ScreenOrientation.lockAsync).not.toHaveBeenCalled();
  });

  it('ignores devices that cannot lock orientation', async () => {
    withScreen(390, 844);
    jest.mocked(ScreenOrientation.lockAsync).mockRejectedValueOnce(new Error('unsupported'));
    await expect(applyOrientationPolicy()).resolves.toBeUndefined();
  });
});
