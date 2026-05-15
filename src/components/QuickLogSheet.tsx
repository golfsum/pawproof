import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/AuthProvider';
import { createEntry } from '@/lib/firestore';
import { PetPicker } from './PetPicker';
import { Chip } from './Chip';
import { PrimaryButton } from './PrimaryButton';
import { JOURNAL_META } from '@/utils/petIcon';
import type { JournalEntryType, SymptomSeverity } from '@/types/models';

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
const SYMPTOM_TYPES = ['Vomiting', 'Limping', 'Itching', 'Low Energy', 'Other'];
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
  const { user } = useAuth();
  const { pets } = useData();

  const [petId, setPetId] = useState<string | null>(initialPetId ?? pets[0]?.id ?? null);
  const [subtype, setSubtype] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [walkMin, setWalkMin] = useState<number | null>(20);
  const [walkCustom, setWalkCustom] = useState('');
  const [severity, setSeverity] = useState<SymptomSeverity | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPetId(initialPetId ?? pets[0]?.id ?? null);
    setSubtype(null);
    setNote('');
    setMedName('');
    setMedDose('');
    setWalkMin(20);
    setWalkCustom('');
    setSeverity(null);
  }, [visible, kind, initialPetId, pets]);

  const title = kind ? TITLES[kind] : '';
  const meta = kind ? JOURNAL_META[ENTRY_TYPE_BY_KIND[kind]] : null;

  const canSave = useMemo(() => {
    if (!petId || !kind) return false;
    if (kind === 'medication' && !medName.trim()) return false;
    if (kind === 'symptom' && !subtype) return false;
    if (kind === 'fed' && !subtype) return false;
    return true;
  }, [petId, kind, medName, subtype]);

  const handleSave = async () => {
    if (!user || !petId || !kind) return;
    setSaving(true);
    try {
      const type = ENTRY_TYPE_BY_KIND[kind];
      let entryTitle = JOURNAL_META[type].label;
      let amount: string | null = null;
      let durationMin: number | null = null;
      let entrySubtype: string | null = subtype;

      if (kind === 'fed') {
        entryTitle = `${subtype} fed`;
        amount = subtype;
      } else if (kind === 'walk') {
        const minutes = walkMin ?? (walkCustom ? parseInt(walkCustom, 10) : null);
        if (minutes && !Number.isNaN(minutes)) {
          durationMin = minutes;
          entryTitle = `Walked ${minutes} min`;
        }
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

      await createEntry(user.uid, {
        petId,
        type,
        title: entryTitle,
        note: note.trim() || undefined,
        timestamp: new Date().toISOString(),
        durationMin,
        amount,
        subtype: entrySubtype,
        severity: kind === 'symptom' ? severity : null,
        photoUrl: null,
      });
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
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
              <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />

              {kind === 'fed' && (
                <ChipRow label="Meal" options={MEAL_OPTIONS} value={subtype} onChange={setSubtype} />
              )}

              {kind === 'walk' && (
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
                title="Save"
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
