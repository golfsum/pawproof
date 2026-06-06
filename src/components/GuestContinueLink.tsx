import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/hooks/AuthProvider';
import { colors, fonts, spacing } from '@/theme';

// Small "continue without an account" link. Starts a guest (anonymous)
// session; the root nav then routes into onboarding/the app. Shown on the
// welcome, sign-in, and sign-up screens so users can always try the app
// without committing — and convert later with their data intact.
export function GuestContinueLink({
  label = 'Just looking? Try it without an account',
}: {
  label?: string;
}) {
  const { continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await continueAsGuest();
    } catch (e: any) {
      setBusy(false);
      Alert.alert('Could not continue', e?.message ?? 'Please try again.');
    }
  };

  return (
    <Pressable onPress={onPress} hitSlop={8} disabled={busy} style={styles.row}>
      <Text style={styles.text}>{busy ? 'Setting up…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: spacing.sm },
  text: { fontSize: 13, color: colors.textMuted, fontFamily: fonts.body.semibold },
});
