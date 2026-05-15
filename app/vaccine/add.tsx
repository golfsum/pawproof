import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { Chip } from '@/components/Chip';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { createVaccine, createReminder } from '@/lib/firestore';
import { scheduleReminder } from '@/lib/notifications';
import { colors, spacing } from '@/theme';
import { fmtDate, toDate } from '@/utils/dates';
import { vaccineKey } from '@/utils/vaccineNames';

/** Renewal cadence options shown as chips. The "months" value is added to
 *  `dateGiven` to produce the expiration / next due date. */
type CadenceKey = 'none' | 'six_months' | 'one_year' | 'three_years' | 'custom';

const CADENCE_OPTIONS: { key: CadenceKey; label: string; months: number | null }[] = [
  { key: 'none', label: 'No reminder', months: null },
  { key: 'six_months', label: '6 months', months: 6 },
  { key: 'one_year', label: '1 year', months: 12 },
  { key: 'three_years', label: '3 years', months: 36 },
  { key: 'custom', label: 'Custom date', months: null },
];

/** Vet-typical default renewal cadences keyed by the canonical vaccine name. */
const DEFAULT_CADENCE_BY_VACCINE: Record<string, CadenceKey> = {
  rabies: 'three_years',       // 3-yr is most common modern protocol
  dhpp: 'three_years',
  fvrcp: 'three_years',
  bordetella: 'one_year',
  lepto: 'one_year',
  lyme: 'one_year',
  influenza: 'one_year',
  felv: 'one_year',
  fiv: 'one_year',
  'heartworm test': 'one_year',
  fecal: 'one_year',
  rattlesnake: 'one_year',
};

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export default function AddVaccineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    petId?: string;
    vaccineName?: string;
    dateGiven?: string;
    expirationDate?: string;
    clinicName?: string;
    lotNumber?: string;
    documentId?: string;
  }>();
  const { user } = useAuth();
  const { pets } = useData();

  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [vaccineName, setVaccineName] = useState(params.vaccineName ?? '');
  const [dateGiven, setDateGiven] = useState<Date | null>(params.dateGiven ? toDate(params.dateGiven) : new Date());
  const [cadence, setCadence] = useState<CadenceKey>(params.expirationDate ? 'custom' : 'one_year');
  const [expirationDate, setExpirationDate] = useState<Date | null>(params.expirationDate ? toDate(params.expirationDate) : null);
  const [clinicName, setClinicName] = useState(params.clinicName ?? '');
  const [lotNumber, setLotNumber] = useState(params.lotNumber ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId && pets[0]) setPetId(pets[0].id);
  }, [pets, petId]);

  // When the user picks a fixed-offset cadence, derive the expiration date
  // from dateGiven. Custom + None leave it as-is (user enters or skips).
  useEffect(() => {
    const opt = CADENCE_OPTIONS.find(c => c.key === cadence);
    if (!opt || !dateGiven) return;
    if (cadence === 'none') {
      setExpirationDate(null);
    } else if (cadence !== 'custom' && opt.months != null) {
      setExpirationDate(addMonths(dateGiven, opt.months));
    }
  }, [cadence, dateGiven]);

  // When the vaccine name changes, suggest a smart cadence default.
  // Only nudges when the user is still on the initial default and hasn't
  // diverged manually.
  const suggestedCadence = useMemo<CadenceKey | null>(() => {
    const k = vaccineKey(vaccineName);
    return DEFAULT_CADENCE_BY_VACCINE[k] ?? null;
  }, [vaccineName]);

  const [autoCadenceApplied, setAutoCadenceApplied] = useState(false);
  useEffect(() => {
    if (!suggestedCadence || autoCadenceApplied) return;
    if (cadence === 'one_year') {
      // Initial state — bump to the suggested default.
      setCadence(suggestedCadence);
      setAutoCadenceApplied(true);
    }
  }, [suggestedCadence, cadence, autoCadenceApplied]);

  const handleSave = async () => {
    if (!user) return;
    if (!petId) {
      Alert.alert('Pick a pet', 'Choose which pet this vaccine is for.');
      return;
    }
    if (!vaccineName.trim() || !dateGiven) {
      Alert.alert('Required', 'Vaccine name and date given are required.');
      return;
    }
    setSaving(true);
    try {
      let reminderId: string | null = null;
      if (expirationDate) {
        // Fire two weeks before expiration (clamped to the future).
        const remindAt = new Date(expirationDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        const fireAt = remindAt.getTime() > Date.now() ? remindAt : expirationDate;
        const notifId = await scheduleReminder(
          `${vaccineName.trim()} expires soon`,
          `Renew before ${expirationDate.toDateString()}`,
          fireAt,
        );
        reminderId = await createReminder(user.uid, {
          petId,
          type: 'vaccination',
          title: `${vaccineName.trim()} renewal`,
          notes: `Auto-created from a vaccine record.`,
          dueDate: fireAt.toISOString(),
          repeatType: 'none',
          repeatInterval: null,
          isCompleted: false,
          nextDueDate: fireAt.toISOString(),
          notificationId: notifId,
        });
      }
      await createVaccine(user.uid, {
        petId,
        vaccineName: vaccineName.trim(),
        dateGiven: dateGiven.toISOString(),
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        clinicName: clinicName.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        documentId: params.documentId ?? null,
        reminderId,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Add vaccine' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />
        <FormField label="Vaccine name" required value={vaccineName} onChangeText={setVaccineName} placeholder="Rabies, DHPP, FVRCP…" />
        <DateField label="Date given" value={dateGiven} onChange={setDateGiven} maximumDate={new Date()} />

        <View style={styles.fieldGroup}>
          <View style={styles.cadenceLabelRow}>
            <Text style={styles.label}>Renewal reminder</Text>
            {suggestedCadence ? (
              <Text style={styles.hint}>
                Typical for {vaccineName.trim()}: {CADENCE_OPTIONS.find(c => c.key === suggestedCadence)?.label}
              </Text>
            ) : null}
          </View>
          <View style={styles.chipRow}>
            {CADENCE_OPTIONS.map(o => (
              <Chip
                key={o.key}
                label={o.label}
                selected={cadence === o.key}
                tone="primary"
                onPress={() => setCadence(o.key)}
              />
            ))}
          </View>
          {cadence !== 'none' && expirationDate ? (
            <Text style={styles.cadencePreview}>
              Reminder will fire 14 days before <Text style={styles.cadencePreviewStrong}>{fmtDate(expirationDate)}</Text>.
            </Text>
          ) : null}
        </View>

        {cadence === 'custom' || cadence === 'none' ? (
          <DateField
            label={cadence === 'custom' ? 'Expiration date' : 'Expiration date (optional)'}
            value={expirationDate}
            onChange={setExpirationDate}
            optional={cadence !== 'custom'}
          />
        ) : null}

        <FormField label="Clinic" value={clinicName} onChangeText={setClinicName} placeholder="Optional" />
        <FormField label="Lot number" value={lotNumber} onChangeText={setLotNumber} placeholder="Optional" />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
        <PrimaryButton title="Save vaccine" onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  fieldGroup: { gap: 8 },
  cadenceLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 6, marginLeft: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  hint: { fontSize: 11, color: colors.textFaint, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cadencePreview: { fontSize: 12, color: colors.textMuted, marginLeft: 4, marginTop: 2, lineHeight: 18 },
  cadencePreviewStrong: { color: colors.text, fontWeight: '600' },
});
