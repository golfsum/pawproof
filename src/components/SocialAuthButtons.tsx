import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/hooks/AuthProvider';
import { SocialAuthCancelled, isAppleAuthAvailable } from '@/lib/socialAuth';
import { colors, radius, spacing } from '@/theme';

interface Props {
  /** Where the user is in the flow — only used to vary the disclosure copy. */
  mode?: 'sign-in' | 'sign-up';
}

export function SocialAuthButtons({ mode = 'sign-in' }: Props) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  useEffect(() => {
    // Wrap in catch — if the native module isn't in the current dev client
    // build, isAvailableAsync throws synchronously inside the Promise.
    isAppleAuthAvailable()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const handle = async (provider: 'apple' | 'google', fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(provider);
    try {
      await fn();
    } catch (e: any) {
      if (e instanceof SocialAuthCancelled) return;
      Alert.alert(
        provider === 'apple' ? 'Apple sign-in failed' : 'Google sign-in failed',
        humanize(e),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>or {mode === 'sign-in' ? 'sign in' : 'continue'} with</Text>
        <View style={styles.line} />
      </View>

      {Platform.OS === 'ios' && appleAvailable && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            mode === 'sign-up'
              ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
              : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.lg}
          style={styles.appleBtn}
          onPress={() => handle('apple', signInWithApple)}
        />
      )}

      <Pressable
        onPress={() => handle('google', signInWithGoogle)}
        disabled={!!busy}
        style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.7 }]}
      >
        <View style={styles.googleGlyph}>
          <Ionicons name="logo-google" size={18} color="#1F2933" />
        </View>
        <Text style={styles.googleText}>
          {mode === 'sign-up' ? 'Sign up with Google' : 'Sign in with Google'}
        </Text>
      </Pressable>
    </View>
  );
}

function humanize(e: any): string {
  const code: string = e?.code ?? '';
  if (code.includes('auth/account-exists-with-different-credential')) {
    return 'An account with this email already exists with a different sign-in method.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'This sign-in method isn\'t enabled in Firebase. Open Authentication → Sign-in method to turn it on.';
  }
  if (code.includes('auth/network')) return 'Network issue — check your connection and try again.';
  return e?.message ?? 'Something went wrong.';
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  appleBtn: { width: '100%', height: 50 },
  googleBtn: {
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleGlyph: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text },
});
