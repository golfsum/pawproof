import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ReportIssueSheet } from '@/components/ReportIssueSheet';
import { useAuth } from '@/hooks/AuthProvider';
import { watchSupportIssuesForUser, type SupportIssueDoc } from '@/lib/firestore';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import { fmtDate } from '@/utils/dates';

// User's own tickets, live-synced from Firestore. The same query the
// web dashboard uses, so anything that shows up here matches what the
// user sees at pawproof.app/dashboard/support.

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

export default function SupportIndexScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [issues, setIssues] = useState<SupportIssueDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIssues([]);
      setLoading(false);
      return;
    }
    const unsub = watchSupportIssuesForUser(user.uid, list => {
      setIssues(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid]);

  // A ticket has a fresh admin update if the last admin reply is newer
  // than the most recent user-side message. Used to badge "New reply".
  const hasFreshAdminUpdate = (issue: SupportIssueDoc): boolean => {
    if (!issue.lastAdminUpdateAt) return false;
    const lastAdmin = +new Date(issue.lastAdminUpdateAt);
    const lastUserMessage = issue.thread
      .filter(m => m.from === 'user')
      .map(m => +new Date(m.createdAt))
      .reduce((a, b) => Math.max(a, b), 0);
    return lastAdmin > lastUserMessage;
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Support' }} />
      <View style={styles.header}>
        <Text style={typography.h1}>My tickets</Text>
        <Text style={styles.sub}>
          Conversations with PawProof support. Tap a ticket to read replies or
          send a follow-up.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.sm, paddingBottom: 140 }}>
        <Pressable
          onPress={() => setReportOpen(true)}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.newIcon}>
            <Ionicons name="add" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.newTitle}>Report a new issue</Text>
            <Text style={styles.newSub}>Bugs, feature ideas, billing, or anything else</Text>
          </View>
        </Pressable>

        {loading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : issues.length === 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <EmptyState
              icon="chatbubbles-outline"
              title="No tickets yet"
              body="Send your first one from the button above. We usually reply within a day or two, and every conversation lands here so you can pick it back up later."
            />
          </View>
        ) : (
          issues.map(issue => {
            const tone = STATUS_COLORS[issue.status];
            const fresh = hasFreshAdminUpdate(issue);
            return (
              <Pressable
                key={issue.id}
                onPress={() => router.push({ pathname: '/support/[id]', params: { id: issue.id } })}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusText, { color: tone.fg }]}>
                        {STATUS_LABELS[issue.status]}
                      </Text>
                    </View>
                    {fresh ? (
                      <View style={styles.newReplyPill}>
                        <Ionicons name="ellipse" size={6} color={colors.primary} />
                        <Text style={styles.newReplyText}>New reply</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rowMessage} numberOfLines={2}>{issue.message}</Text>
                  <Text style={styles.rowMeta}>
                    {issue.thread.length > 0
                      ? `${issue.thread.length} repl${issue.thread.length === 1 ? 'y' : 'ies'} · `
                      : ''}
                    Updated {fmtDate(issue.updatedAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <ReportIssueSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  loadingText: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.lg, fontSize: 13 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  newIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  newTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  newSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.base,
    borderRadius: radius.lg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontSize: 10, fontFamily: fonts.body.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },
  newReplyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  newReplyText: { fontSize: 10, fontFamily: fonts.body.semibold, color: colors.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  rowMessage: { fontSize: 14, color: colors.text, fontFamily: fonts.body.semibold },
  rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
});
