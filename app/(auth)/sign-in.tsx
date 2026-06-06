import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { GuestContinueLink } from '@/components/GuestContinueLink';
import { useAuth } from '@/hooks/AuthProvider';
import { colors, spacing, typography } from '@/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Could not sign in', humanizeAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded avoidKeyboard edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.brandIcon}
            resizeMode="contain"
            accessibilityLabel="PawProof logo"
          />
          <Text style={typography.display}>PawProof</Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            One place to keep every reminder, record, and photo for the pets in your life.
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
            placeholder="••••••••"
          />
          <PrimaryButton title="Sign in" onPress={handleSignIn} loading={loading} />
        </View>

        <SocialAuthButtons mode="sign-in" />

        <View style={styles.footer}>
          <Text style={[typography.body, { color: colors.textMuted }]}>New to PawProof?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </Link>
        </View>

        <GuestContinueLink />
      </ScrollView>
    </Screen>
  );
}

export function humanizeAuthError(e: any): string {
  const code = e?.code || '';
  if (code.includes('invalid-email')) return 'That email address doesn\'t look right.';
  if (code.includes('user-not-found')) return 'No account found for that email.';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Email or password didn\'t match.';
  if (code.includes('email-already-in-use')) return 'An account with that email already exists.';
  if (code.includes('weak-password')) return 'Use at least 6 characters.';
  if (code.includes('network')) return 'Network issue. Check your connection.';
  return e?.message ?? 'Something went wrong.';
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing['2xl'], gap: spacing.xl },
  brandWrap: { alignItems: 'center', gap: spacing.sm },
  brandIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: spacing.sm,
  },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  link: { color: colors.primary, fontWeight: '600' },
});
