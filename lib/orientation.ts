import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { TABLET_MIN_SIDE } from '@/lib/layout';

/**
 * Phones stay in portrait, where lessons fit best; tablets can rotate freely and the
 * layout adapts. (Android 16+ may let large screens rotate regardless.)
 */
export async function applyOrientationPolicy(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { width, height } = Dimensions.get('screen');
  try {
    if (Math.min(width, height) >= TABLET_MIN_SIDE) await ScreenOrientation.unlockAsync();
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    // Not supported on this device: keep the system default.
  }
}
