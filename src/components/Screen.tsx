import React from 'react';
import { StyleSheet, View, ViewStyle, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  avoidKeyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function Screen({ children, padded, style, avoidKeyboard, edges = ['top'] }: Props) {
  const inner = (
    <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.flex} edges={edges}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: spacing.base },
});
