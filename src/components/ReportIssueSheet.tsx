import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/AuthProvider';
import { createSupportIssue } from '@/lib/firestore';
import { colors, fonts, radius, spacing } from '@/theme';
import { PrimaryButton } from './PrimaryButton';
import { Chip } from './Chip';

// Bottom sheet for filing a support ticket from inside the mobile app.
// Writes to the same `support_issues` Firestore collection the web
// admin dashboard reads, so anything submitted here lands in the
// queue at pawproof.app/admin/tickets.

interface Props {
  visible: boolean;
  onClose: () => void;
  // Optional context blob. The caller can include pet/record IDs or
  // other state so the admin can reproduce the issue.
  context?: Record<string, any> | null;
}

type Category =
  | 'app_bug'
  | 'wrong_data'
  | 'ocr_issue'
  | 'reminder_issue'
  | 'vaccine_issue'
  | 'sync_issue'
  | 'account_issue'
  | 'billing_issue'
  | 'feature_request'
  | 'other';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'app_bug', label: 'Bug or crash' },
  { key: 'wrong_data', label: 'Wrong data' },
  { key: 'ocr_issue', label: 'Smart Scan' },
  { key: 'reminder_issue', label: 'Reminder' },
  { key: 'vaccine_issue', label: 'Vaccine' },
  { key: 'sync_issue', label: 'Sync' },
  { key: 'account_issue', label: 'Account' },
  { key: 'billing_issue', label: 'Billing' },
  { key: 'feature_request', label: 'Feature idea' },
  { key: 'other', label: 'Other' },
];

export function ReportIssueSheet({ visible, onClose, context }: Props) {
  const { user, profile } = useAuth();
  const [category, setCategory] = useState<Category>('app_bug');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = message.trim();
  const messageValid = trimmed.length >= 10;
  const canSubmit = !saving && !!user && messageValid;

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to be signed in to submit a ticket.');
      return;
    }
    if (!messageValid) {
      Alert.alert(
        'A little more detail, please',
        'Give us at least a sentence so we can actually help.',
      );
      return;
    }
    setSaving(true);
    try {
      await createSupportIssue({
        uid: user.uid,
        email: user.email ?? null,
        displayName: profile?.displayName ?? user.displayName ?? null,
        category,
        message: trimmed,
        source: 'mobile-settings',
        platform: Platform.OS,
        appVersion: (Constants.expoConfig?.version as string | undefined) ?? null,
        buildNumber:
          Platform.OS === 'ios'
            ? (Constants.expoConfig?.ios?.buildNumber as string | undefined) ?? null
            : (Constants.expoConfig?.android?.versionCode as number | undefined) ?? null,
        deviceModel:
          `${Device.modelName ?? Device.deviceName ?? Platform.OS} · ${Device.osName ?? ''} ${Device.osVersion ?? ''}`.trim(),
        context: context ?? null,
      });
      Alert.alert(
        'Thanks, we got it.',
        "We'll reply by email and you can also see your tickets on the web at pawproof.app.",
        [{ text: 'OK', onPress: () => { setMessage(''); onClose(); } }],
      );
    } catch (e: any) {
      Alert.alert('Could not send', e?.message ?? 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Report an issue</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: spacing.base, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.intro}>
              Send bug reports, feature ideas, or anything that feels off. We
              read every ticket and usually reply within a day or two.
            </Text>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>What's the problem?</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(c => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    selected={category === c.key}
                    onPress={() => setCategory(c.key)}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Tell us what happened</Text>
              <TextInput
                placeholder="Steps to reproduce, what you expected, what happened instead…"
                placeholderTextColor={colors.textFaint}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={4000}
                style={styles.input}
              />
              <Text style={styles.charHint}>
                {trimmed.length < 10
                  ? `${Math.max(0, 10 - trimmed.length)} more character${
                      10 - trimmed.length === 1 ? '' : 's'
                    } before you can submit`
                  : `${trimmed.length} characters`}
              </Text>
            </View>

            <Text style={styles.disclaimer}>
              We attach your platform, app version, and device model so we can
              reproduce. Pet records are never sent with the ticket.
            </Text>

            <PrimaryButton
              title={saving ? 'Submitting ticket…' : 'Submit ticket'}
              onPress={handleSubmit}
              loading={saving}
              disabled={!canSubmit}
              icon="paper-plane-outline"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  title: { flex: 1, fontSize: 18, fontFamily: fonts.display.bold, color: colors.text },
  close: { padding: 4 },
  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  charHint: {
    fontSize: 11,
    color: colors.textFaint,
    marginLeft: 4,
    marginTop: 2,
  },
});
