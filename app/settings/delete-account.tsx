import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/hooks/AuthProvider';
import {
  deleteAccount,
  needsPasswordToDelete,
  primaryProvider,
} from '@/lib/accountDeletion';
import { colors, fonts, radius, spacing, typography } from '@/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const requiresPassword = needsPasswordToDelete();
  const provider = primaryProvider();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmText.trim().toUpperCase() === 'DELETE';
  const canDelete = confirmed && (!requiresPassword || password.length > 0) && !deleting;

  const reauthNote =
    provider === 'google'
      ? 'You’ll be asked to confirm with Google.'
      : provider === 'apple'
      ? 'You’ll be asked to confirm with Apple.'
      : 'Enter your password to confirm.';

  const handleDelete = () => {
    Alert.alert(
      'Delete account permanently?',
      'This erases your account and every pet, record, document, reminder, and journal entry. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(requiresPassword ? { password } : undefined);
              // Auth user is gone; clear local session and return to sign-in.
              await signOut().catch(() => {});
              router.replace('/(auth)/sign-in');
              Alert.alert('Account deleted', 'Your account and data have been permanently removed.');
            } catch (e: any) {
              Alert.alert('Could not delete account', e?.message ?? 'Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={28} color={colors.danger} />
        </View>

        <Text style={[typography.h1, { textAlign: 'center' }]}>Delete your account</Text>
        <Text style={styles.intro}>
          This permanently deletes your PawProof account and everything in it.
          There’s no undo. If you only want a copy of your data first, use
          Settings → Your data to export a backup.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What gets deleted</Text>
          <Text style={styles.bullets}>
            • Your account and login{'\n'}
            • All pets and their photos{'\n'}
            • Every vaccine record and uploaded document{'\n'}
            • Every reminder, including future ones{'\n'}
            • Every journal entry (meals, walks, meds, health){'\n'}
            • Every share invite you’ve sent
          </Text>
        </View>

        {requiresPassword ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        ) : null}

        <Text style={styles.reauthNote}>{reauthNote}</Text>

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>
            Type <Text style={{ fontFamily: fonts.display.bold }}>DELETE</Text> to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.confirmInput}
          />
        </View>

        <Pressable
          onPress={handleDelete}
          disabled={!canDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            !canDelete && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteText}>{deleting ? 'Deleting…' : 'Delete account forever'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.cancelBtn} disabled={deleting}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  iconWrap: {
    alignSelf: 'center',
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.sm,
  },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, textAlign: 'center' },
  card: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger + '33',
    padding: spacing.base,
    gap: spacing.xs,
  },
  cardTitle: { fontSize: 14, fontFamily: fonts.body.semibold, color: '#991b1b' },
  bullets: { fontSize: 13, color: '#991b1b', lineHeight: 20, opacity: 0.9 },
  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted, marginLeft: 4 },
  reauthNote: { fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  confirmInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger + '55',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.display.bold,
    color: colors.danger,
    letterSpacing: 4,
    textAlign: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    paddingVertical: 14,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  deleteText: { color: '#fff', fontSize: 15, fontFamily: fonts.body.semibold },
  cancelBtn: { alignSelf: 'center', padding: spacing.md },
  cancelText: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.textMuted },
});
