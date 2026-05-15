import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useData, useEntriesForPet, useVaccinesForPet, useRemindersForPet } from '@/hooks/useData';
import { colors, radius, spacing, typography } from '@/theme';
import { summarizeActivity } from '@/utils/insights';
import { fmtDate, daysUntil } from '@/utils/dates';

/**
 * Per-pet monthly care summary. Default range is the current month; the
 * caller can pass an `?offset=1` to view last month, etc. Aggregates journal
 * entries, vaccine status, and overdue reminders into a single recap card.
 */
export default function MonthlySummaryScreen() {
  const { id, offset: offsetParam } = useLocalSearchParams<{ id: string; offset?: string }>();
  const offset = Number(offsetParam) || 0;

  const { pets } = useData();
  const pet = pets.find(p => p.id === id);
  const entries = useEntriesForPet(id);
  const vaccines = useVaccinesForPet(id);
  const reminders = useRemindersForPet(id);

  const now = new Date();
  const targetMonth = subMonths(now, offset);
  const from = startOfMonth(targetMonth);
  const to = endOfMonth(targetMonth);

  const summary = useMemo(
    () => summarizeActivity(entries, from.toISOString(), to.toISOString()),
    [entries, from, to],
  );

  const overdueOrSoon = useMemo(() => {
    return reminders.filter(r => {
      if (r.isCompleted) return false;
      const d = daysUntil(r.dueDate);
      return d != null && d <= 30;
    }).length;
  }, [reminders]);

  const totalVaccines = vaccines.length;
  const monthLabel = format(targetMonth, 'MMMM yyyy');

  if (!pet) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Summary' }} />
        <Text>Pet not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: `${pet.name}'s ${monthLabel}` }} />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{monthLabel} · {pet.name}</Text>
        <Text style={typography.display}>{summary.totalEntries}</Text>
        <Text style={styles.heroSub}>entries logged this month</Text>
      </View>

      <View style={styles.statGrid}>
        <Stat icon="restaurant-outline" tint={colors.warning} count={summary.meals} label="Meals" />
        <Stat icon="walk-outline" tint={colors.primary} count={summary.walks} label="Walks" />
        <Stat icon="medkit-outline" tint={colors.danger} count={summary.medications} label="Doses" />
        <Stat icon="alert-circle-outline" tint={colors.warning} count={summary.symptoms} label="Symptoms" />
        <Stat icon="pulse-outline" tint={colors.danger} count={summary.vetVisits} label="Vet visits" />
        <Stat icon="cut-outline" tint={colors.info} count={summary.groomings} label="Grooming" />
      </View>

      {summary.symptoms > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptom breakdown</Text>
          <View style={styles.card}>
            {Object.entries(summary.symptomBreakdown).length === 0 ? (
              <Text style={styles.muted}>{summary.symptoms} logged with no subtype.</Text>
            ) : (
              Object.entries(summary.symptomBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([sub, count], idx) => (
                  <View key={sub} style={[styles.kvRow, idx > 0 && styles.divider]}>
                    <Text style={styles.kvKey}>{sub}</Text>
                    <Text style={styles.kvVal}>{count}×</Text>
                  </View>
                ))
            )}
            {(summary.severityBreakdown.mild + summary.severityBreakdown.medium + summary.severityBreakdown.serious) > 0 ? (
              <View style={[styles.severityRow]}>
                {summary.severityBreakdown.mild > 0 ? <SeverityChip count={summary.severityBreakdown.mild} label="Mild" tone="success" /> : null}
                {summary.severityBreakdown.medium > 0 ? <SeverityChip count={summary.severityBreakdown.medium} label="Medium" tone="warning" /> : null}
                {summary.severityBreakdown.serious > 0 ? <SeverityChip count={summary.severityBreakdown.serious} label="Serious" tone="danger" /> : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Records on file</Text>
        <View style={styles.card}>
          <View style={[styles.kvRow]}>
            <Text style={styles.kvKey}>Vaccines tracked</Text>
            <Text style={styles.kvVal}>{totalVaccines}</Text>
          </View>
          <View style={[styles.kvRow, styles.divider]}>
            <Text style={styles.kvKey}>Reminders due in 30 days</Text>
            <Text style={styles.kvVal}>{overdueOrSoon}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.footer}>
        Covers {fmtDate(from)} – {fmtDate(to)}
      </Text>
    </ScrollView>
  );
}

function Stat({ icon, tint, count, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  count: number;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SeverityChip({ count, label, tone }: { count: number; label: string; tone: 'success' | 'warning' | 'danger' }) {
  const bg = tone === 'success' ? colors.successSoft : tone === 'warning' ? colors.warningSoft : colors.dangerSoft;
  const fg = tone === 'success' ? '#1E6C80' : tone === 'warning' ? '#92400e' : '#991b1b';
  return (
    <View style={[styles.sevChip, { backgroundColor: bg }]}>
      <Text style={[styles.sevText, { color: fg }]}>{count} {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  heroLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, textTransform: 'uppercase' },
  heroSub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: 4,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statCount: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3, textTransform: 'uppercase' },

  section: { gap: 6, marginTop: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase', paddingLeft: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  kvKey: { fontSize: 14, color: colors.text },
  kvVal: { fontSize: 16, fontWeight: '700', color: colors.text },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },

  severityRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  sevChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sevText: { fontSize: 11, fontWeight: '700' },

  muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  footer: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
});
