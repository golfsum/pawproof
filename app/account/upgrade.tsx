import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { SocialAuthCancelled, CredentialInUseError, isAppleAuthAvailable } from '@/lib/socialAuth';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Converts a guest (anonymous) account into a permanent one by LINKING a
// credential — the uid and all data are preserved. If the chosen credential
// already belongs to another account, we offer to sign in to it instead
// (which abandons the guest's local data, with a clear warning).

export default function UpgradeAccountScreen() {
  const router = useRouter();
  const {
    isGuest,
    linkEmailPassword,
    linkGoogle,
    linkApple,
    signIn,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  // If they're already a full account (or signed out), this screen is moot.
  useEffect(() => {
    if (!isGuest) router.back();
  }, [isGuest]);

  const onSuccess = () => {
    router.back();
    Alert.alert('Account created', 'Your pets and records are now saved to your account.');
  };

  // Shared handler: try to link; if the credential already exists elsewhere,
  // offer to switch to that account (guest data won't carry over).
  const runLink = async (
    link: () => Promise<void>,
    fallbackSignIn?: () => Promise<void>,
  ) => {
    if (busy) return;
    setBusy(true);
    try {
      await link();
      onSuccess();
    } catch (e: any) {
      if (e instanceof SocialAuthCancelled) {
        setBusy(false);
        return;
      }
      if (e instanceof CredentialInUseError && fallbackSignIn) {
        setBusy(false);
        Alert.alert(
          'Account already exists',
          'This login already belongs to another PawProof account. Sign in to it instead?\n\nNote: anything you added as a guest won’t transfer.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign in',
              onPress: async () => {
                setBusy(true);
                try {
                  await fallbackSignIn();
                  router.back();
                } catch (err: any) {
                  if (!(err instanceof SocialAuthCancelled)) {
                    Alert.alert('Could not sign in', err?.message ?? 'Please try again.');
                  }
                } finally {
                  setBusy(false);
                }
              },
            },
          ],
        );
        return;
      }
      setBusy(false);
      Alert.alert('Could not create account', e?.message ?? 'Please try again.');
    }
  };

  const handleEmail = () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Almost there', 'Enter a valid email and a password of at least 6 characters.');
      return;
    }
    void runLink(
      () => linkEmailPassword(email, password),
      () => signIn(email, password),
    );
  };

  return (
    <Screen padded avoidKeyboard edges={['bottom']}>
      <Stack.Screen options={{ title: 'Save your account' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[typography.h1, { textAlign: 'center' }]}>Save your account</Text>
          <Text style={styles.intro}>
            Create a free account to keep your pets and records safe and sync them
            across devices. Everything you’ve added stays exactly as it is.
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="At least 6 characters"
            placeholder="••••••••"
          />
          <PrimaryButton title="Create account" onPress={handleEmail} loading={busy} />
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.line} />
        </View>

        {Platform.OS === 'ios' && appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.lg}
            style={styles.appleBtn}
            onPress={() => runLink(linkApple, signInWithApple)}
          />
        ) : null}

        <Pressable
          onPress={() => runLink(linkGoogle, signInWithGoogle)}
          disabled={busy}
          style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.7 }]}
        >
          <Ionicons name="logo-google" size={18} color="#1F2933" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingVertical: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, textAlign: 'center' },
  form: { gap: spacing.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text },
});
