import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLayout } from '@/lib/layout';
import { theme } from '@/lib/theme';

const WIDE_MAX_WIDTH = 1280;

export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
  wide = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Screens with side-by-side columns use more of a tablet's width. */
  wide?: boolean;
}) {
  const layout = useLayout();
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.container, { maxWidth: wide ? WIDE_MAX_WIDTH : layout.readableWidth }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: theme.colors.background,
  },
});
