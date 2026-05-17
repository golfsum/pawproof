import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { Chip } from '@/components/Chip';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { createVaccine, createReminder } from '@/lib/firestore';
import { scheduleVaccineExpirationReminder } from '@/lib/notifications';
import { colors, fonts, radius, spacing } from '@/theme';
import { fmtDate, toDate } from '@/utils/dates';
import { vaccineKey } from '@/utils/vaccineNames';
import type { Species } from '@/types/models';

// Renewal cadence picks. The "months" value is added to dateGiven to
// produce the real expiration date stored on the record. "No
// expiration" leaves expiration null and skips reminder creation;
// "Custom date" hands picking to the user.
type CadenceKey = 'none' | 'six_months' | 'one_year' | 'three_years' | 'custom';

const CADENCE_OPTIONS: { key: CadenceKey; label: string; months: number | null }[] = [
  { key: 'none', label: 'No expiration', months: null },
  { key: 'six_months', label: '6 months', months: 6 },
  { key: 'one_year', label: '1 year', months: 12 },
  { key: 'three_years', label: '3 years', months: 36 },
  { key: 'custom', label: 'Custom date', months: null },
];

// Vet-typical default renewal cadences keyed by canonical vaccine
// name. We use this to bump the cadence chip to a sensible starting
// point — the UI still shows the "verify with your vet" disclaimer.
const DEFAULT_CADENCE_BY_VACCINE: Record<string, CadenceKey> = {
  rabies: 'three_years',
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

// Species-aware quick-select chips beneath the vaccine name field.
// Shown when the input is empty or focused so they don't clutter the
// form once the user knows what they're entering.
const VACCINE_SUGGESTIONS_BY_SPECIES: Record<string, string[]> = {
  dog: ['Rabies', 'DHPP', 'Bordetella', 'Lepto', 'Lyme', 'Canine influenza', 'Corona'],
  cat: ['Rabies', 'FVRCP', 'FeLV', 'FIV', 'Bordetella'],
  rabbit: ['RHDV2', 'Myxomatosis'],
  ferret: ['Rabies', 'Distemper'],
  bird: ['Polyomavirus', "Pacheco's disease"],
  reptile: ['Other'],
  fish: ['Other'],
  small_mammal: ['Rabies', 'Other'],
  other: ['Rabies', 'Core vaccine', 'Other'],
};

function suggestionsForSpecies(species?: Species): string[] {
  if (!species) return VACCINE_SUGGESTIONS_BY_SPECIES.other;
  return VACCINE_SUGGESTIONS_BY_SPECIES[species] ?? VACCINE_SUGGESTIONS_BY_SPECIES.other;
}

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
  const { user, profile } = useAuth();
  const { pets } = useData();
  const warnDays = profile?.notificationPrefs?.vaccineWarnDays ?? 14;

  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [vaccineName, setVaccineName] = useState(params.vaccineName ?? '');
  const [vaccineFocused, setVaccineFocused] = useState(false);
  const [dateGiven, setDateGiven] = useState<Date | null>(
    params.dateGiven ? toDate(params.dateGiven) : new Date(),
  );
  const [cadence, setCadence] = useState<CadenceKey>(
    params.expirationDate ? 'custom' : 'one_year',
  );
  const [expirationDate, setExpirationDate] = useState<Date | null>(
    params.expirationDate ? toDate(params.expirationDate) : null,
  );
  const [clinicName, setClinicName] = useState(params.clinicName ?? '');
  const [lotNumber, setLotNumber] = useState(params.lotNumber ?? '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currentPet = useMemo(
    () => pets.find(p => p.id === petId) ?? null,
    [pets, petId],
  );

  useEffect(() => {
    if (!petId && pets[0]) setPetId(pets[0].id);
  }, [pets, petId]);

  // Fixed cadences derive expiration from dateGiven. Custom + None
  // leave the value alone so the user's pick survives a re-render.
  useEffect(() => {
    const opt = CADENCE_OPTIONS.find(c => c.key === cadence);
    if (!opt) return;
    if (cadence === 'none') {
      setExpirationDate(null);
      return;
    }
    if (cadence === 'custom') return;
    if (dateGiven && opt.months != null) {
      setExpirationDate(addMonths(dateGiven, opt.months));
    }
  }, [cadence, dateGiven]);

  // Smart cadence default based on vaccine name. Only nudges once,
  // from the initial 'one_year' state, so the user's manual choice
  // always wins after that.
  const suggestedCadence = useMemo<CadenceKey | null>(() => {
    const k = vaccineKey(vaccineName);
    return DEFAULT_CADENCE_BY_VACCINE[k] ?? null;
  }, [vaccineName]);

  const [autoCadenceApplied, setAutoCadenceApplied] = useState(false);
  useEffect(() => {
    if (!suggestedCadence || autoCadenceApplied) return;
    if (cadence === 'one_year') {
      setCadence(suggestedCadence);
      setAutoCadenceApplied(true);
    }
  }, [suggestedCadence, cadence, autoCadenceApplied]);

  const showSuggestionChips = !vaccineName.trim() || vaccineFocused;
  const speciesSuggestions = suggestionsForSpecies(currentPet?.species);

  // Helper text under the cadence chips — spells out the actual
  // expiration date and reminder timing so the user isn't left
  // guessing what their pick translated to.
  const helperText = useMemo(() => {
    if (cadence === 'none') {
      return 'No expiration reminder will be created.';
    }
    if (cadence === 'custom' && !expirationDate) {
      return 'Pick the vaccine expiration date.';
    }
    if (expirationDate) {
      return `Expires ${fmtDate(expirationDate)}. Reminder will fire ${warnDays} days before.`;
    }
    return null;
  }, [cadence, expirationDate, warnDays]);

  const handleSave = async () => {
    if (!user) return;
    if (!petId) {
      Alert.alert('Choose a pet', 'Pick which pet this vaccine record is for.');
      return;
    }
    if (!vaccineName.trim()) {
      Alert.alert('Enter a vaccine name', 'Give this record a vaccine name to save it.');
      return;
    }
    if (!dateGiven) {
      Alert.alert('Choose the date given', 'Pick when this vaccine was administered.');
      return;
    }
    if (expirationDate && expirationDate.getTime() < dateGiven.getTime()) {
      Alert.alert(
        'Date conflict',
        'Expiration date must be after the date given.',
      );
      return;
    }
    setSaving(true);
    try {
      let reminderId: string | null = null;
      if (expirationDate) {
        // Reminder fires `warnDays` before the actual expiration so
        // the user has time to book a renewal. The real expiration
        // stays on the vaccine record itself — the reminder.dueDate
        // is just the notification trigger.
        const notifId = await scheduleVaccineExpirationReminder({
          pet: currentPet,
          vaccineName: vaccineName.trim(),
          expiresAt: expirationDate,
          daysBefore: warnDays,
        });
        const remindAt = new Date(
          expirationDate.getTime() - warnDays * 24 * 60 * 60 * 1000,
        );
        const fireAt = remindAt.getTime() > Date.now() ? remindAt : expirationDate;
        reminderId = await createReminder(user.uid, {
          petId,
          type: 'vaccination',
          title: `${vaccineName.trim()} vaccine`,
          notes: 'Auto-created from a vaccine record.',
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
        isCompleted: true,
        expirationDerived: false,
        source: 'manual',
      });

      // Confirmation message. We vary the body so the user knows
      // whether a reminder was actually scheduled.
      const reminderAt = expirationDate
        ? new Date(expirationDate.getTime() - warnDays * 24 * 60 * 60 * 1000)
        : null;
      Alert.alert(
        'Vaccine record saved',
        reminderAt
          ? `Reminder set for ${fmtDate(reminderAt)}.`
          : 'No expiration reminder created.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Add vaccine record' }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />

        <View style={styles.fieldGroup}>
          <FormField
            label="Vaccine name"
            required
            value={vaccineName}
            onChangeText={setVaccineName}
            placeholder="Rabies, DHPP, FVRCP…"
            onFocus={() => setVaccineFocused(true)}
            onBlur={() => setVaccineFocused(false)}
          />
          {showSuggestionChips && speciesSuggestions.length > 0 ? (
            <View style={{ gap: 6, marginTop: 4 }}>
              <Text style={styles.sublabel}>Common vaccines</Text>
              <View style={styles.chipRow}>
                {speciesSuggestions.map(name => (
                  <Chip
                    key={name}
                    label={name}
                    selected={vaccineKey(vaccineName) === vaccineKey(name)}
                    onPress={() => setVaccineName(name)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <DateField
          label="Date given"
          value={dateGiven}
          onChange={setDateGiven}
          maximumDate={new Date()}
        />

        <View style={styles.fieldGroup}>
          <View style={styles.cadenceLabelRow}>
            <Text style={styles.label}>Expiration / renewal</Text>
            {suggestedCadence && autoCadenceApplied ? (
              <Text style={styles.hint}>
                Suggested for {vaccineName.trim()} · verify with your vet
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
          {helperText ? (
            <Text style={styles.cadencePreview}>{helperText}</Text>
          ) : null}
          <View style={styles.disclaimerRow}>
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={colors.textFaint}
            />
            <Text style={styles.disclaimerText}>
              Vaccine schedules can vary. Verify renewal dates with your vet.
            </Text>
          </View>
        </View>

        {cadence === 'custom' || cadence === 'none' ? (
          <DateField
            label={cadence === 'custom' ? 'Expiration date' : 'Expiration date (optional)'}
            value={expirationDate}
            onChange={setExpirationDate}
            optional={cadence !== 'custom'}
            minimumDate={dateGiven ?? undefined}
          />
        ) : null}

        <FormField
          label="Clinic"
          value={clinicName}
          onChangeText={setClinicName}
          placeholder="e.g. ABC Pet Care Clinic"
        />
        <FormField
          label="Lot number"
          value={lotNumber}
          onChangeText={setLotNumber}
          placeholder="e.g. A12345"
        />

        {/* Attachment row. When params already carry a documentId
            (e.g. came from Smart Scan completion), show the linkage
            here. The full multi-option attach sheet (scan / pick /
            take photo / upload) is a follow-up; the data model
            already supports the link via params.documentId. */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Attach document</Text>
          {params.documentId ? (
            <View style={styles.attachedRow}>
              <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              <Text style={styles.attachedText}>Document attached from scan</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Attach a document',
                  'Smart Scan a vaccine record from the Records tab. It will auto-link here when you save.',
                  [{ text: 'OK', style: 'cancel' }],
                );
              }}
              style={({ pressed }) => [
                styles.attachBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.attachBtnText}>Attach document or photo</Text>
            </Pressable>
          )}
        </View>

        <FormField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Reaction, booster notes, vet instructions…"
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <PrimaryButton
          title="Save vaccine record"
          onPress={handleSave}
          loading={saving}
          icon="checkmark-outline"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  fieldGroup: { gap: 8 },
  cadenceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
  },
  sublabel: {
    fontSize: 11,
    color: colors.textFaint,
    fontFamily: fonts.body.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  hint: { fontSize: 11, color: colors.textFaint, fontStyle: 'italic' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cadencePreview: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
    marginTop: 2,
    lineHeight: 18,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginLeft: 4,
    marginTop: 4,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textFaint,
    lineHeight: 15,
  },

  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  attachBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fonts.body.semibold,
  },
  attachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  attachedText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontFamily: fonts.body.semibold,
    flex: 1,
  },
});
