import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/AuthProvider';
import { createEntry } from '@/lib/firestore';
import { Chip } from './Chip';
import { PrimaryButton } from './PrimaryButton';
import { Toast } from './Toast';
import { JOURNAL_META } from '@/utils/petIcon';
import {
  resolveDistanceUnit,
  milesToMeters,
  kmToMeters,
  metersToMiles,
  metersToKm,
  type DistanceUnit,
} from '@/utils/units';
import type { JournalEntryType, Pet, SymptomSeverity } from '@/types/models';

export type QuickLogKind =
  | 'fed'
  | 'walk'
  | 'medication'
  | 'training'
  | 'symptom'
  | 'grooming';

interface Props {
  visible: boolean;
  kind: QuickLogKind | null;
  initialPetId?: string;
  onClose: () => void;
}

const MEAL_OPTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const WALK_DURATIONS = [10, 20, 30, 45];
const WALK_TYPES = ['Walk', 'Run', 'Play', 'Hike', 'Fetch', 'Other'];
// Quick-add distance presets per unit. Keep these short — five chips
// is plenty so the row doesn't wrap on narrow phones.
const WALK_DISTANCE_PRESETS_MI = [0.5, 1, 2, 3, 5];
const WALK_DISTANCE_PRESETS_KM = [1, 2, 3, 5, 8];
const SYMPTOM_TYPES = ['Not eating', 'Vomiting', 'Diarrhea', 'Coughing', 'Limping', 'Itching', 'Low Energy', 'Other'];
const SEVERITIES: { label: string; value: SymptomSeverity; tone: 'success' | 'warning' | 'danger' }[] = [
  { label: 'Mild', value: 'mild', tone: 'success' },
  { label: 'Medium', value: 'medium', tone: 'warning' },
  { label: 'Serious', value: 'serious', tone: 'danger' },
];
const GROOM_TYPES = ['Bath', 'Brushing', 'Nail trim', 'Ear cleaning', 'Other'];
const TRAINING_TYPES = ['Sit / Stay', 'Recall', 'Leash', 'Crate', 'Tricks', 'Other'];

const ENTRY_TYPE_BY_KIND: Record<QuickLogKind, JournalEntryType> = {
  fed: 'fed',
  walk: 'walk',
  medication: 'medication',
  training: 'training',
  symptom: 'symptom',
  grooming: 'grooming',
};

const TITLES: Record<QuickLogKind, string> = {
  fed: 'Log a meal',
  walk: 'Log a walk',
  medication: 'Log medication',
  training: 'Log training',
  symptom: 'Log a symptom',
  grooming: 'Log grooming',
};

export function QuickLogSheet({ visible, kind, initialPetId, onClose }: Props) {
  const { user, profile } = useAuth();
  const { pets } = useData();

  const defaultUnit = resolveDistanceUnit(profile?.distanceUnit);

  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() => {
    if (initialPetId) return [initialPetId];
    if (pets.length > 0) return [pets[0].id];
    return [];
  });
  const [subtype, setSubtype] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [walkMin, setWalkMin] = useState<number | null>(20);
  const [walkCustom, setWalkCustom] = useState('');
  const [walkType, setWalkType] = useState<string>('Walk');
  const [walkDistance, setWalkDistance] = useState<string>('');
  const [walkDistanceUnit, setWalkDistanceUnit] = useState<DistanceUnit>(defaultUnit);
  const [severity, setSeverity] = useState<SymptomSeverity | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setSelectedPetIds(() => {
      if (initialPetId) return [initialPetId];
      if (pets.length > 0) return [pets[0].id];
      return [];
    });
    setSubtype(null);
    setNote('');
    setMedName('');
    setMedDose('');
    setWalkMin(20);
    setWalkCustom('');
    setWalkType('Walk');
    setWalkDistance('');
    setWalkDistanceUnit(defaultUnit);
    setSeverity(null);
  }, [visible, kind, initialPetId, pets, defaultUnit]);

  const title = kind ? TITLES[kind] : '';
  const meta = kind ? JOURNAL_META[ENTRY_TYPE_BY_KIND[kind]] : null;

  const allSelected = selectedPetIds.length === pets.length && pets.length > 0;

  const togglePet = (id: string) => {
    setSelectedPetIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    );
  };
  const toggleAll = () => {
    setSelectedPetIds(prev => (prev.length === pets.length ? [] : pets.map(p => p.id)));
  };

  // Convert the unit when the user toggles mi/km so they don't lose the
  // value they typed. Round to 1 decimal so the field doesn't fill with
  // long floats.
  const switchDistanceUnit = (next: DistanceUnit) => {
    if (next === walkDistanceUnit) return;
    const num = parseFloat(walkDistance);
    if (Number.isFinite(num) && num > 0) {
      const meters = walkDistanceUnit === 'mi' ? milesToMeters(num) : kmToMeters(num);
      const converted = next === 'mi' ? metersToMiles(meters) : metersToKm(meters);
      setWalkDistance(converted.toFixed(2).replace(/\.?0+$/, ''));
    }
    setWalkDistanceUnit(next);
  };

  const setDistancePreset = (value: number) => {
    setWalkDistance(value.toString());
  };

  const canSave = useMemo(() => {
    if (!kind) return false;
    if (selectedPetIds.length === 0) return false;
    if (kind === 'medication' && !medName.trim()) return false;
    if (kind === 'symptom' && !subtype) return false;
    if (kind === 'fed' && !subtype) return false;
    return true;
  }, [selectedPetIds, kind, medName, subtype]);

  const petNamesForToast = (ids: string[]): string => {
    const names = ids
      .map(id => pets.find(p => p.id === id)?.name)
      .filter((n): n is string => !!n);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  };

  const handleSave = async () => {
    if (!user || !kind || selectedPetIds.length === 0) return;
    setSaving(true);
    try {
      const type = ENTRY_TYPE_BY_KIND[kind];
      let entryTitle = JOURNAL_META[type].label;
      let amount: string | null = null;
      let durationMin: number | null = null;
      let entrySubtype: string | null = subtype;
      let distanceMeters: number | null = null;

      if (kind === 'fed') {
        entryTitle = `${subtype} fed`;
        amount = subtype;
      } else if (kind === 'walk') {
        const minutes = walkMin ?? (walkCustom ? parseInt(walkCustom, 10) : null);
        entrySubtype = walkType;
        if (minutes && !Number.isNaN(minutes)) {
          durationMin = minutes;
        }
        const distanceNum = parseFloat(walkDistance);
        if (Number.isFinite(distanceNum) && distanceNum > 0) {
          distanceMeters =
            walkDistanceUnit === 'mi' ? milesToMeters(distanceNum) : kmToMeters(distanceNum);
        }
        // Title pattern reads naturally in the timeline:
        // "Walked 2 mi · 32 min", "Hike · 45 min", "Ran 30 min"
        const distanceLabel = Number.isFinite(distanceNum) && distanceNum > 0
          ? `${distanceNum} ${walkDistanceUnit}`
          : '';
        const durationLabel = durationMin ? `${durationMin} min` : '';
        const verb =
          walkType === 'Walk' ? 'Walked'
          : walkType === 'Run' ? 'Ran'
          : walkType === 'Play' ? 'Played'
          : walkType === 'Fetch' ? 'Fetch'
          : walkType === 'Hike' ? 'Hike'
          : 'Exercise';
        const parts = [verb, distanceLabel, durationLabel].filter(Boolean);
        entryTitle = parts.length > 1 ? parts.join(' · ') : verb;
      } else if (kind === 'medication') {
        entryTitle = medName.trim();
        amount = medDose.trim() || null;
      } else if (kind === 'symptom') {
        entryTitle = subtype ? `Symptom: ${subtype}` : 'Symptom';
      } else if (kind === 'training') {
        entryTitle = subtype ? `Training: ${subtype}` : 'Training';
      } else if (kind === 'grooming') {
        entryTitle = subtype ? `Grooming: ${subtype}` : 'Grooming';
      }

      // Multi-pet entries write a single doc with the full petIds array.
      // The primary `petId` is the first selected pet so legacy readers
      // (and queries that still hit `where('petId','==', ...)`) still
      // surface the entry for at least one pet.
      const primaryPetId = selectedPetIds[0];
      const petIds = selectedPetIds.length > 1 ? selectedPetIds : undefined;

      await createEntry(user.uid, {
        petId: primaryPetId,
        ...(petIds ? { petIds } : {}),
        type,
        title: entryTitle,
        note: note.trim() || undefined,
        timestamp: new Date().toISOString(),
        durationMin,
        amount,
        subtype: entrySubtype,
        severity: kind === 'symptom' ? severity : null,
        photoUrl: null,
        ...(kind === 'walk' && distanceMeters != null
          ? { distanceMeters, walkSource: 'manual' as const }
          : {}),
        // Actor stamp: who's logging this. Owner-logged entries don't
        // need to render attribution, but caregiver-logged ones do
        // ("Fed by Noel at 7:42 AM"), and we can't tell which is which
        // without the stamp.
        actorUid: user.uid,
        actorName: user.displayName ?? null,
      });

      // Toast lives on the host screen for half a second so the sheet
      // can finish dismissing before the toast pops. Walks get a richer
      // headline because that's the daily-feeling event we want users
      // to come back to.
      const namesLabel = petNamesForToast(selectedPetIds);
      if (kind === 'walk') {
        const bits = [
          walkDistance && Number.isFinite(parseFloat(walkDistance))
            ? `${walkDistance} ${walkDistanceUnit}`
            : '',
          durationMin ? `${durationMin} min` : '',
        ].filter(Boolean);
        setToast(
          bits.length > 0
            ? `Walk saved for ${namesLabel}. ${bits.join(' · ')}`
            : `Walk saved for ${namesLabel}.`,
        );
      } else {
        const verb = JOURNAL_META[type].label.toLowerCase();
        setToast(`${verb} logged for ${namesLabel}.`);
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const distancePresets =
    walkDistanceUnit === 'mi' ? WALK_DISTANCE_PRESETS_MI : WALK_DISTANCE_PRESETS_KM;

  return (
    <>
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.header}>
              {meta ? (
                <View style={[styles.iconWrap, { backgroundColor: meta.tint + '22' }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.tint} />
                </View>
              ) : null}
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {pets.length === 0 ? (
              <Text style={styles.empty}>Add a pet first to start logging.</Text>
            ) : (
              <ScrollView
                style={styles.body}
                contentContainerStyle={{ gap: spacing.base, paddingBottom: spacing.lg }}
                keyboardShouldPersistTaps="handled"
              >
                {pets.length > 1 ? (
                  <PetMultiPicker
                    pets={pets}
                    selectedIds={selectedPetIds}
                    allSelected={allSelected}
                    onTogglePet={togglePet}
                    onToggleAll={toggleAll}
                  />
                ) : null}

                {kind === 'fed' && (
                  <ChipRow label="Meal" options={MEAL_OPTIONS} value={subtype} onChange={setSubtype} />
                )}

                {kind === 'walk' && (
                  <View style={{ gap: 12 }}>
                    <View style={{ gap: 8 }}>
                      <Text style={styles.label}>Type</Text>
                      <View style={styles.chipRow}>
                        {WALK_TYPES.map(t => (
                          <Chip
                            key={t}
                            label={t}
                            selected={walkType === t}
                            onPress={() => setWalkType(t)}
                          />
                        ))}
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
                      <View style={styles.labelRow}>
                        <Text style={styles.label}>Distance</Text>
                        <View style={styles.unitToggle}>
                          {(['mi', 'km'] as DistanceUnit[]).map(u => (
                            <Pressable
                              key={u}
                              onPress={() => switchDistanceUnit(u)}
                              style={({ pressed }) => [
                                styles.unitOption,
                                walkDistanceUnit === u && styles.unitOptionActive,
                                pressed && { opacity: 0.85 },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.unitOptionText,
                                  walkDistanceUnit === u && styles.unitOptionTextActive,
                                ]}
                              >
                                {u}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      <View style={styles.chipRow}>
                        {distancePresets.map(d => (
                          <Chip
                            key={d}
                            label={`${d} ${walkDistanceUnit}`}
                            selected={parseFloat(walkDistance) === d}
                            onPress={() => setDistancePreset(d)}
                          />
                        ))}
                        <TextInput
                          placeholder={`Custom ${walkDistanceUnit}`}
                          placeholderTextColor={colors.textFaint}
                          value={walkDistance}
                          keyboardType="decimal-pad"
                          onChangeText={setWalkDistance}
                          style={[styles.customInput, { minWidth: 110 }]}
                        />
                      </View>
                      <Text style={styles.helperText}>
                        Distance is based on your phone or watch during the walk.
                      </Text>
                    </View>

                    <View style={{ gap: 8 }}>
                      <Text style={styles.label}>Duration</Text>
                      <View style={styles.chipRow}>
                        {WALK_DURATIONS.map(d => (
                          <Chip
                            key={d}
                            label={`${d} min`}
                            selected={walkMin === d}
                            onPress={() => { setWalkMin(d); setWalkCustom(''); }}
                          />
                        ))}
                        <TextInput
                          placeholder="Custom"
                          placeholderTextColor={colors.textFaint}
                          value={walkCustom}
                          keyboardType="number-pad"
                          onChangeText={t => { setWalkCustom(t); setWalkMin(null); }}
                          style={styles.customInput}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {kind === 'medication' && (
                  <View style={{ gap: 12 }}>
                    <View style={{ gap: 6 }}>
                      <Text style={styles.label}>Medication name</Text>
                      <TextInput
                        placeholder="e.g. Apoquel"
                        placeholderTextColor={colors.textFaint}
                        value={medName}
                        onChangeText={setMedName}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ gap: 6 }}>
                      <Text style={styles.label}>Dose (optional)</Text>
                      <TextInput
                        placeholder="e.g. 5 mg"
                        placeholderTextColor={colors.textFaint}
                        value={medDose}
                        onChangeText={setMedDose}
                        style={styles.input}
                      />
                    </View>
                  </View>
                )}

                {kind === 'training' && (
                  <ChipRow label="Type" options={TRAINING_TYPES} value={subtype} onChange={setSubtype} />
                )}

                {kind === 'grooming' && (
                  <ChipRow label="Type" options={GROOM_TYPES} value={subtype} onChange={setSubtype} />
                )}

                {kind === 'symptom' && (
                  <View style={{ gap: 12 }}>
                    <ChipRow label="Symptom" options={SYMPTOM_TYPES} value={subtype} onChange={setSubtype} />
                    <View style={{ gap: 8 }}>
                      <Text style={styles.label}>Severity</Text>
                      <View style={styles.chipRow}>
                        {SEVERITIES.map(s => (
                          <Chip
                            key={s.value}
                            label={s.label}
                            tone={s.tone}
                            selected={severity === s.value}
                            onPress={() => setSeverity(s.value)}
                          />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.disclaimer}>
                      This is a journal entry, not medical advice. Contact your vet for urgent concerns.
                    </Text>
                  </View>
                )}

                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Note (optional)</Text>
                  <TextInput
                    placeholder="Add a note…"
                    placeholderTextColor={colors.textFaint}
                    value={note}
                    onChangeText={setNote}
                    style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                    multiline
                  />
                </View>

                <PrimaryButton
                  title={saveLabel(kind, selectedPetIds.length)}
                  onPress={handleSave}
                  loading={saving}
                  disabled={!canSave}
                  icon="checkmark-outline"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Toast message={toast} onHidden={() => setToast(null)} bottomOffset={32} />
    </>
  );
}

function saveLabel(kind: QuickLogKind | null, count: number): string {
  if (!kind || count === 0) return 'Save';
  if (count === 1) return 'Save';
  return `Save for ${count} pets`;
}

function getSelectedPetCountLabel(selectedCount: number, totalCount: number): string {
  if (selectedCount === 0) return 'Pick at least one pet.';
  if (selectedCount === totalCount) return `All ${totalCount} pets selected`;
  if (selectedCount === 1) return '1 pet selected';
  return `${selectedCount} pets selected`;
}

// Multi-pet picker. Renders one chip per pet plus an "All pets" chip
// that toggles every pet at once. Free-form selection: you can pick
// any combination, and "All pets" reflects the current state so the
// label is honest. Helper line below reads "1 pet selected" / "All 3
// pets selected" instead of "1 of 3" so the wording is consistent
// across the app.
function PetMultiPicker({
  pets,
  selectedIds,
  allSelected,
  onTogglePet,
  onToggleAll,
}: {
  pets: Pet[];
  selectedIds: string[];
  allSelected: boolean;
  onTogglePet: (id: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>Pets</Text>
      <View style={styles.chipRow}>
        {pets.map(pet => (
          <Chip
            key={pet.id}
            label={pet.name}
            selected={selectedIds.includes(pet.id)}
            onPress={() => onTogglePet(pet.id)}
          />
        ))}
        <Chip
          label="All pets"
          selected={allSelected}
          onPress={onToggleAll}
        />
      </View>
      <Text style={styles.helperText}>
        {getSelectedPetCountLabel(selectedIds.length, pets.length)}
      </Text>
    </View>
  );
}

function ChipRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string | null; onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(o => (
          <Chip key={o} label={o} selected={value === o} onPress={() => onChange(o)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
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
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text },
  close: { padding: 4 },
  body: { paddingHorizontal: spacing.base, paddingTop: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 },
  helperText: { fontSize: 11, color: colors.textFaint, marginLeft: 4, marginTop: 4, lineHeight: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  unitOptionActive: {
    backgroundColor: colors.primary,
  },
  unitOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  unitOptionTextActive: {
    color: '#fff',
  },
  customInput: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    color: colors.text,
    minWidth: 80,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
  disclaimer: {
    backgroundColor: colors.warningSoft,
    color: '#92400e',
    padding: spacing.md,
    borderRadius: radius.md,
    fontSize: 12,
    lineHeight: 18,
  },
});
