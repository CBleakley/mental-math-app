import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, maxContentWidth } from './theme';

/** Dark full-screen background with a phone-width column, padded as in the designs. */
export function ScreenFrame({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={styles.page}>
      <View style={[styles.column, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    paddingHorizontal: 24,
  },
});
