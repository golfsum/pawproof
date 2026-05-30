import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import {
  createEntry,
  deleteMedication,
  updateMedication,
  deleteReminder,
} from '@/lib/firestore';
import { cancelReminder } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';
import { fmtDate, fmtRelative } from '@/utils/dates';
import type { MedicationFrequency } from '@/types/models';

const FREQUENCY_LABEL: Record<MedicationFrequency, string> = {
  once_daily: 'Once a day',
  twice_daily: '2x a day',
  three_times_daily: '3x a day',
  every_other_day: 'Every 2 days',
  weekly: 'Weekly',
  monthly: 'Monthly',
  as_needed: 'As needed',
};

export default function MedicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { medications, entries, pets, reminders } = useData();

  const med = medications.find(m => m.id === id);
  const pet = med ? pets.find(p => p.id === med.petId) : null;

  // Doses already logged for this medication.
  const doses = useMemo(
    () => entries
      .filter(e => e.type === 'medication' && e.subtype === med?.id)
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 30),
    [entries, med?.id],
  );

  if (!med) {
    return (
      <View style={styles.empty}>
        <Stack.Screen options={{ title: 'Medication' }} />
        <Text style={typography.body}>This medication isn't on file.</Text>
      </View>
    );
  }

  const markGiven = async () => {
    if (!user) return;
    try {
      await createEntry(user.uid, {
        petId: med.petId,
        type: 'medication',
        title: `${med.name} given`,
        amount: med.dosage ?? null,
        subtype: med.id,            // link the dose back to its medication
        timestamp: new Date().toISOString(),
        photoUrl: null,
        durationMin: null,
        severity: null,
      });
    } catch (e: any) {
      Alert.alert('Could not log', e?.message ?? 'Try again.');
    }
  };

  const toggleActive = async () => {
    if (!user) return;
    await updateMedication(user.uid, med.id, { isActive: !med.isActive });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete medication?',
      `Remove ${med.name} from ${pet?.name ?? 'this pet'}. Linked reminder will be cancelled. Past dose logs stay in the timeline.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              if (med.reminderId) {
                const linked = reminders.find((r) => r.id === med.reminderId);
                await cancelReminder(linked?.notificationId);
                await deleteReminder(user.uid, med.reminderId);
              }
              await deleteMedication(user.uid, med.id);
              router.back();
            } catch (e: any) {
              Alert.alert('Could not delete', e?.message ?? 'Try again.');
            }
          },
        },
      ],
    );
  };

  const lastDose = doses[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: med.name }} />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="medkit-outline" size={28} color={colors.danger} />
        </View>
        <Text style={typography.h1}>{med.name}</Text>
        <Text style={typography.body}>
          {pet?.name ? `${pet.name} · ` : ''}{FREQUENCY_LABEL[med.frequency]}
          {med.dosage ? ` · ${med.dosage}` : ''}
        </Text>
        {!med.isActive ? (
          <Chip label="Stopped" tone="danger" small style={{ marginTop: 6 }} />
        ) : null}
      </View>

      {med.isActive ? (
        <View style={styles.actionsRow}>
          <PrimaryButton
            title="Mark dose given"
            icon="checkmark-circle"
            onPress={markGiven}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.card}>
          <InfoRow label="Frequency" value={FREQUENCY_LABEL[med.frequency]} />
          <InfoRow label="Dose" value={med.dosage || 'Not specified'} />
          <InfoRow label="Start" value={fmtDate(med.startDate)} />
          <InfoRow label="End" value={med.endDate ? fmtDate(med.endDate) : 'Ongoing'} />
          {med.instructions ? <InfoRow label="Instructions" value={med.instructions} multiline /> : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent doses ({doses.length})</Text>
        {lastDose ? (
          <Text style={styles.lastDose}>Last dose: {fmtRelative(lastDose.timestamp)}</Text>
        ) : (
          <Text style={styles.lastDose}>No doses logged yet.</Text>
        )}
        <View style={styles.card}>
          {doses.length === 0 ? (
            <Text style={styles.muted}>Tap "Mark dose given" to start the log.</Text>
          ) : (
            doses.map((d, idx) => (
              <View key={d.id} style={[styles.doseRow, idx > 0 && styles.divider]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.doseText}>
                  {fmtRelative(d.timestamp)}
                  {d.amount ? ` · ${d.amount}` : ''}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      <PrimaryButton
        title={med.isActive ? 'Stop medication' : 'Resume medication'}
        variant={med.isActive ? 'secondary' : 'primary'}
        icon={med.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
        onPress={toggleActive}
      />
      <PrimaryButton title="Delete medication" variant="danger" icon="trash-outline" onPress={handleDelete} />
    </ScrollView>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={[styles.infoRow, multiline && { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && { textAlign: 'left' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: 4 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  actionsRow: { flexDirection: 'row', gap: spacing.sm },

  section: { gap: 6 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
    color: colors.textMuted, textTransform: 'uppercase',
    marginLeft: 4,
  },
  lastDose: { fontSize: 13, color: colors.textMuted, marginLeft: 4 },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' },

  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  doseText: { fontSize: 13, color: colors.text },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  muted: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
});
