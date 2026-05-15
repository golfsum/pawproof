import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { Chip } from '@/components/Chip';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { createMedication, createReminder } from '@/lib/firestore';
import { scheduleReminder } from '@/lib/notifications';
import { colors, spacing } from '@/theme';
import type { MedicationFrequency, RepeatType } from '@/types/models';

const FREQUENCIES: { key: MedicationFrequency; label: string; repeat: RepeatType; intervalDays?: number }[] = [
  { key: 'once_daily',        label: 'Once a day',     repeat: 'daily' },
  { key: 'twice_daily',       label: '2x a day',       repeat: 'daily' },
  { key: 'three_times_daily', label: '3x a day',       repeat: 'daily' },
  { key: 'every_other_day',   label: 'Every 2 days',   repeat: 'custom_days', intervalDays: 2 },
  { key: 'weekly',            label: 'Weekly',         repeat: 'weekly' },
  { key: 'monthly',           label: 'Monthly',        repeat: 'monthly' },
  { key: 'as_needed',         label: 'As needed',      repeat: 'none' },
];

export default function AddMedicationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();

  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('once_daily');
  const [firstDoseAt, setFirstDoseAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!petId && pets[0]) setPetId(pets[0].id);
  }, [pets, petId]);

  const handleSave = async () => {
    if (!user) return;
    if (!petId) {
      Alert.alert('Pick a pet', 'Choose which pet this medication is for.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Required', 'Medication name is required.');
      return;
    }

    setSaving(true);
    try {
      const freqConfig = FREQUENCIES.find(f => f.key === frequency)!;

      // Create the parent reminder (if recurring) so we get push
      // notifications. As-needed meds skip the reminder.
      let reminderId: string | null = null;
      if (freqConfig.repeat !== 'none') {
        const notifId = await scheduleReminder(
          `${name.trim()} for ${pets.find(p => p.id === petId)?.name ?? 'your pet'}`,
          `Dose: ${dosage.trim() || 'see medication'}${instructions.trim() ? ` · ${instructions.trim()}` : ''}`,
          firstDoseAt,
        );
        reminderId = await createReminder(user.uid, {
          petId,
          type: 'medication',
          title: name.trim(),
          notes: instructions.trim() || undefined,
          dueDate: firstDoseAt.toISOString(),
          repeatType: freqConfig.repeat,
          repeatInterval: freqConfig.intervalDays ?? null,
          isCompleted: false,
          nextDueDate: firstDoseAt.toISOString(),
          notificationId: notifId,
        });
      }

      await createMedication(user.uid, {
        petId,
        name: name.trim(),
        dosage: dosage.trim() || undefined,
        frequency,
        instructions: instructions.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : null,
        reminderId,
        isActive: true,
      });

      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const isRecurring = FREQUENCIES.find(f => f.key === frequency)?.repeat !== 'none';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Add medication' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />

        <FormField label="Medication" required value={name} onChangeText={setName} placeholder="Apoquel, Heartgard, Trazodone…" />
        <FormField label="Dosage" value={dosage} onChangeText={setDosage} placeholder="5 mg, 1 tablet, etc." />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                selected={frequency === f.key}
                onPress={() => setFrequency(f.key)}
              />
            ))}
          </View>
        </View>

        {isRecurring ? (
          <DateField label="First dose" value={firstDoseAt} onChange={d => d && setFirstDoseAt(d)} mode="datetime" />
        ) : null}

        <DateField label="Start date" value={startDate} onChange={d => d && setStartDate(d)} />
        <DateField label="End date" value={endDate} onChange={setEndDate} optional />

        <FormField
          label="Instructions"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="e.g. Give with food"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <PrimaryButton title="Save medication" onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
