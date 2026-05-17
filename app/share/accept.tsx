import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { acceptShareInvite } from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Standalone "I have an invite code" screen. Reached from Settings.
// Once accepted, the invitee's useData() picks up the shared pet
// (subject to the Firestore rule changes documented in the README).

export default function AcceptInviteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    if (!user) return;
    if (code.trim().length !== 6) {
      Alert.alert('Code too short', 'Invite codes are 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const share = await acceptShareInvite({
        uid: user.uid,
        email: user.email ?? null,
        inviteCode: code.trim(),
      });
      Alert.alert(
        'Access granted',
        `You can now help care for ${share.petName}. It'll show up on your Home screen alongside your own pets.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Could not accept', e?.message ?? 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Accept invite' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="people-circle-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[typography.h1, { textAlign: 'center' }]}>Got an invite code?</Text>
          <Text style={styles.body}>
            Enter the 6-character code from a friend or family member to start helping
            care for their pet.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Invite code</Text>
            <TextInput
              value={code}
              onChangeText={t => setCode(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
              placeholder="e.g. K3X9P2"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={styles.input}
            />
          </View>

          <PrimaryButton
            title="Accept invite"
            onPress={handleAccept}
            loading={busy}
            disabled={code.trim().length !== 6}
            icon="checkmark-outline"
          />

          <View style={styles.helpBox}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.helpText}>
              You need to sign in with the email the invite was sent to. If
              this doesn't work, ask the owner to resend the invite to your
              correct email.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md },
  iconWrap: {
    alignSelf: 'center',
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 360, alignSelf: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: 6,
    marginTop: spacing.md,
  },
  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 22,
    fontFamily: fonts.display.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 6,
  },
  helpBox: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
