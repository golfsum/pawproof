import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { subDays } from 'date-fns';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import {
  useData,
  useEntriesForPet,
  useVaccinesForPet,
  useMedicationsForPet,
} from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { buildSymptomReport, isAppetiteSymptom } from '@/utils/insights';
import { shareVetReportPdf } from '@/lib/pdf';
import { fmtDate } from '@/utils/dates';
import type { SymptomSeverity } from '@/types/models';
import { colors, radius, spacing, typography } from '@/theme';

// Vet health report. Summarizes the pet's logged symptoms (how often,
// when last, severity) over a chosen window and exports a vet-ready PDF.
// All data comes from the owner's own quick-logs (type: 'symptom').

const RANGES: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: 'All time', days: null },
];

const SEVERITY_LABEL: Record<SymptomSeverity, string> = {
  mild: 'Mild',
  medium: 'Medium',
  serious: 'Serious',
};

function relDays(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function VetReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { pets } = useData();
  const { check } = useGate();
  const pet = pets.find(p => p.id === id);
  const entries = useEntriesForPet(id);
  const vaccines = useVaccinesForPet(id);
  const medications = useMedicationsForPet(id);

  const [rangeIdx, setRangeIdx] = useState(1); // default 90 days
  const [sharing, setSharing] = useState(false);

  const range = RANGES[rangeIdx];
  const fromIso = useMemo(
    () => (range.days == null ? new Date(0).toISOString() : subDays(new Date(), range.days).toISOString()),
    [range.days],
  );

  const report = useMemo(
    () => buildSymptomReport(entries, fromIso),
    [entries, fromIso],
  );

  const appetite = report.groups.find(g => isAppetiteSymptom(g.name));

  if (!pet) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Vet report' }} />
        <Text style={typography.body}>Pet not found.</Text>
      </View>
    );
  }

  const onShare = async () => {
    if (!check('pdf_export')) return;
    setSharing(true);
    try {
      await shareVetReportPdf({
        pet,
        profile,
        entries,
        medications,
        vaccines,
        fromIso,
      });
    } catch (e: any) {
      Alert.alert('Could not generate PDF', e?.message ?? 'Try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: `${pet.name}'s vet report` }} />

      <Text style={styles.intro}>
        A summary of {pet.name}'s reported symptoms to share with your vet. Log
        symptoms from the pet's timeline so they appear here.
      </Text>

      {/* Range picker */}
      <View style={styles.rangeRow}>
        {RANGES.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={() => setRangeIdx(i)}
            style={[styles.rangeChip, i === rangeIdx && styles.rangeChipOn]}
          >
            <Text style={[styles.rangeText, i === rangeIdx && styles.rangeTextOn]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Appetite callout */}
      <View style={[styles.callout, appetite ? styles.calloutWarn : styles.calloutOk]}>
        <Text style={[styles.calloutTitle, { color: appetite ? '#92400e' : '#065F46' }]}>
          {appetite ? `⚠ Appetite — ${appetite.name}` : 'Appetite: no issues logged'}
        </Text>
        {appetite ? (
          <Text style={styles.calloutBody}>
            Reported {appetite.count}× this period. Last on {fmtDate(appetite.lastSeen)} ({relDays(appetite.lastSeen)}).
          </Text>
        ) : (
          <Text style={styles.calloutBody}>
            No "Not eating" entries in this window.
          </Text>
        )}
      </View>

      {/* Symptom summary */}
      <Text style={styles.sectionTitle}>
        Symptoms · {report.totalSymptomEntries} {report.totalSymptomEntries === 1 ? 'entry' : 'entries'}
      </Text>
      <View style={styles.card}>
        {report.groups.length === 0 ? (
          <Text style={styles.muted}>No symptoms logged in this period.</Text>
        ) : (
          report.groups.map((g, idx) => (
            <View key={g.name} style={[styles.symRow, idx > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symName}>{g.name}</Text>
                <Text style={styles.symMeta}>
                  Last {fmtDate(g.lastSeen)} · {relDays(g.lastSeen)}
                  {g.severityBreakdown.serious > 0 ? ` · ${g.severityBreakdown.serious} serious` : ''}
                </Text>
              </View>
              <Text style={styles.symCount}>{g.count}×</Text>
            </View>
          ))
        )}
      </View>

      {/* Chronological log */}
      {report.timeline.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Symptom log</Text>
          <View style={styles.card}>
            {report.timeline.slice(0, 30).map((o, idx) => (
              <View key={`${o.timestamp}-${idx}`} style={[styles.logRow, idx > 0 && styles.divider]}>
                <Text style={styles.logName}>
                  {o.name}
                  {o.severity ? ` · ${SEVERITY_LABEL[o.severity]}` : ''}
                </Text>
                <Text style={styles.logDate}>{fmtDate(o.timestamp)}</Text>
                {o.note ? <Text style={styles.logNote}>{o.note}</Text> : null}
              </View>
            ))}
            {report.timeline.length > 30 ? (
              <Text style={styles.muted}>+ {report.timeline.length - 30} more in the PDF.</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <PrimaryButton
        title={sharing ? 'Generating…' : 'Share PDF report'}
        icon="share-outline"
        onPress={onShare}
        loading={sharing}
        style={{ marginTop: spacing.md }}
      />

      <Text style={styles.footer}>
        Covers {range.days == null ? 'all time' : fmtDate(fromIso) + ' – today'}. Built from your
        logs — informational, not a diagnosis.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  intro: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: spacing.sm },

  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  rangeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider,
  },
  rangeChipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeText: { fontSize: 13, fontWeight: '600', color: colors.text },
  rangeTextOn: { color: '#fff' },

  callout: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1 },
  calloutWarn: { backgroundColor: colors.warningSoft, borderColor: '#FCD96B' },
  calloutOk: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' },
  calloutTitle: { fontSize: 15, fontWeight: '700' },
  calloutBody: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted,
    textTransform: 'uppercase', paddingLeft: 4, marginTop: spacing.sm,
  },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },

  symRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  symName: { fontSize: 15, fontWeight: '600', color: colors.text },
  symMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  symCount: { fontSize: 16, fontWeight: '700', color: colors.text },

  logRow: { paddingVertical: 10 },
  logName: { fontSize: 14, fontWeight: '600', color: colors.text },
  logDate: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  logNote: { fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 },

  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  footer: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
});
