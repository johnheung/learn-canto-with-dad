import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Shortest side (dp) from which a device counts as a tablet; Android uses the same 600dp line. */
export const TABLET_MIN_SIDE = 600;
/** Width (dp) from which screens show two columns side by side. */
export const WIDE_MIN_WIDTH = 900;

export interface Layout {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  /** Enough width for two columns side by side. */
  isWide: boolean;
  /** Multiplier for text and touch targets: bigger on tablets, read from further away. */
  scale: number;
  /** Max width for forms, lessons and other single-column content. */
  readableWidth: number;
}

export function layoutFor(width: number, height: number): Layout {
  const isTablet = Math.min(width, height) >= TABLET_MIN_SIDE;
  return {
    width,
    height,
    isTablet,
    isLandscape: width > height,
    // Phones held sideways are too short for two columns, however wide.
    isWide: isTablet && width >= WIDE_MIN_WIDTH,
    scale: isTablet ? 1.2 : 1,
    readableWidth: isTablet ? 760 : width,
  };
}

/** The current layout; updates when the device rotates or the window is resized. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => layoutFor(width, height), [width, height]);
}
