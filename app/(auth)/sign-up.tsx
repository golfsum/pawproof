import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SocialAuthButtons } from '@/components/SocialAuthButtons';
import { GuestContinueLink } from '@/components/GuestContinueLink';
import { useAuth } from '@/hooks/AuthProvider';
import { colors, spacing, typography } from '@/theme';
import { humanizeAuthError } from './sign-in';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || password.length < 6) {
      Alert.alert('Almost there', 'Use a valid email and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Could not create account', humanizeAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded avoidKeyboard edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <Text style={typography.h1}>Create your account</Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
            We'll sync your pets, reminders, and records across your devices.
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
          <PrimaryButton title="Create account" onPress={handleSignUp} loading={loading} />
        </View>

        <SocialAuthButtons mode="sign-up" />

        <View style={styles.footer}>
          <Text style={[typography.body, { color: colors.textMuted }]}>Already have an account?</Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>

        <GuestContinueLink />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing['2xl'], gap: spacing.xl },
  brandWrap: { alignItems: 'center', gap: spacing.sm },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  link: { color: colors.primary, fontWeight: '600' },
});
