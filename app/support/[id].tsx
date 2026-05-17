import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/hooks/AuthProvider';
import { watchSupportIssue, type SupportIssueDoc } from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { fmtDate } from '@/utils/dates';

// Single ticket thread. Live-syncs from Firestore so an admin reply
// fired from the web dashboard shows up here within a second or two.
//
// Reply submission posts to the web API (pawproof.app/api/support/issues/[id]/reply)
// rather than writing Firestore directly. This reuses the server-side
// validation (length cap, status reopen on user reply, thread length
// guard) and keeps Firestore rules locked to "no client updates".

const STATUS_LABELS: Record<SupportIssueDoc['status'], string> = {
  open: 'Open',
  in_review: 'In review',
  completed: 'Completed',
};

const STATUS_COLORS: Record<SupportIssueDoc['status'], { bg: string; fg: string }> = {
  open: { bg: colors.warningSoft, fg: '#92400e' },
  in_review: { bg: colors.primarySoft, fg: colors.primaryDark },
  completed: { bg: colors.successSoft, fg: '#1E6C80' },
};

// Production endpoint. For local dev, override via __DEV__ if you ever
// run the Next.js site against an Expo simulator.
const WEB_ORIGIN = 'https://pawproof.app';

export default function SupportThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = String(params.id ?? '');
  const { user } = useAuth();
  const [issue, setIssue] = useState<SupportIssueDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = watchSupportIssue(id, next => {
      setIssue(next);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  const sendReply = async () => {
    if (!user || !issue) return;
    const text = reply.trim();
    if (text.length < 1) return;
    setSending(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${WEB_ORIGIN}/api/support/issues/${id}/reply`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Server returned ${res.status}`);
      }
      setReply('');
    } catch (e: any) {
      Alert.alert('Could not send reply', e?.message ?? 'Try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const tone = issue ? STATUS_COLORS[issue.status] : null;
  const completed = issue?.status === 'completed';

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Ticket' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.md }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : !issue ? (
            <Text style={styles.loadingText}>Ticket not found.</Text>
          ) : (
            <>
              <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                  {tone ? (
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusText, { color: tone.fg }]}>
                        {STATUS_LABELS[issue.status]}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.headerDate}>Opened {fmtDate(issue.createdAt)}</Text>
                </View>
                <Text style={styles.headerCategory}>{prettyCategory(issue.category)}</Text>
                <Text style={styles.headerMessage}>{issue.message}</Text>
              </View>

              {issue.thread.length === 0 ? (
                <View style={styles.placeholder}>
                  <Ionicons name="mail-outline" size={20} color={colors.textFaint} />
                  <Text style={styles.placeholderText}>
                    No replies yet. We'll be in touch soon.
                  </Text>
                </View>
              ) : (
                issue.thread.map((m, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bubble,
                      m.from === 'admin' ? styles.bubbleAdmin : styles.bubbleUser,
                    ]}
                  >
                    <View style={styles.bubbleHeader}>
                      <Text style={[styles.bubbleFrom, m.from === 'admin' && { color: colors.primaryDark }]}>
                        {m.from === 'admin' ? 'PawProof support' : 'You'}
                      </Text>
                      <Text style={styles.bubbleDate}>{fmtDate(m.createdAt)}</Text>
                    </View>
                    <Text style={styles.bubbleMessage}>{m.message}</Text>
                  </View>
                ))
              )}

              {completed ? (
                <View style={styles.completedNote}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.completedText}>
                    This ticket is marked complete. Replying will reopen it.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        {issue ? (
          <View style={styles.composer}>
            <TextInput
              placeholder="Reply to PawProof support…"
              placeholderTextColor={colors.textFaint}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={4000}
              style={styles.composerInput}
            />
            <Pressable
              onPress={sendReply}
              disabled={sending || reply.trim().length === 0}
              style={({ pressed }) => [
                styles.sendBtn,
                (sending || reply.trim().length === 0) && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function prettyCategory(c: string): string {
  return c
    .split('_')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  loadingText: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.lg, fontSize: 13 },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: 10, fontFamily: fonts.body.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  headerDate: { fontSize: 12, color: colors.textMuted },
  headerCategory: { fontSize: 16, fontFamily: fonts.display.bold, color: colors.text, letterSpacing: -0.2 },
  headerMessage: { fontSize: 14, color: colors.text, lineHeight: 20 },

  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: spacing.lg,
  },
  placeholderText: { fontSize: 13, color: colors.textMuted },

  bubble: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  bubbleUser: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleAdmin: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bubbleFrom: { fontSize: 11, fontFamily: fonts.body.semibold, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  bubbleDate: { fontSize: 11, color: colors.textFaint },
  bubbleMessage: { fontSize: 14, color: colors.text, lineHeight: 20 },

  completedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
  },
  completedText: { flex: 1, fontSize: 12, color: colors.text, lineHeight: 17 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.sm,
    paddingHorizontal: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
