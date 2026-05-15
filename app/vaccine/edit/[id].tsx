import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { updateVaccine, deleteVaccine } from '@/lib/firestore';
import { colors, spacing } from '@/theme';
import { toDate } from '@/utils/dates';

export default function EditVaccineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { vaccines, pets } = useData();

  const record = vaccines.find(v => v.id === id);

  const [petId, setPetId] = useState<string | null>(record?.petId ?? null);
  const [vaccineName, setVaccineName] = useState(record?.vaccineName ?? '');
  const [dateGiven, setDateGiven] = useState<Date | null>(record ? toDate(record.dateGiven) : new Date());
  const [expirationDate, setExpirationDate] = useState<Date | null>(record?.expirationDate ? toDate(record.expirationDate) : null);
  const [clinicName, setClinicName] = useState(record?.clinicName ?? '');
  const [lotNumber, setLotNumber] = useState(record?.lotNumber ?? '');
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!record) return;
    setPetId(record.petId);
    setVaccineName(record.vaccineName);
    setDateGiven(toDate(record.dateGiven));
    setExpirationDate(record.expirationDate ? toDate(record.expirationDate) : null);
    setClinicName(record.clinicName ?? '');
    setLotNumber(record.lotNumber ?? '');
    setNotes(record.notes ?? '');
  }, [record?.id]);

  if (!record) {
    return null;
  }

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
      await updateVaccine(user.uid, record.id, {
        petId,
        vaccineName: vaccineName.trim(),
        dateGiven: dateGiven.toISOString(),
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        clinicName: clinicName.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user) return;
    Alert.alert('Delete vaccine?', `Remove ${record.vaccineName} from records.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteVaccine(user.uid, record.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Edit vaccine' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />
        <FormField label="Vaccine name" required value={vaccineName} onChangeText={setVaccineName} />
        <DateField label="Date given" value={dateGiven} onChange={setDateGiven} maximumDate={new Date()} />
        <DateField label="Expiration date" value={expirationDate} onChange={setExpirationDate} optional />
        <FormField label="Clinic" value={clinicName} onChangeText={setClinicName} />
        <FormField label="Lot number" value={lotNumber} onChangeText={setLotNumber} />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />

        <PrimaryButton title="Save changes" onPress={handleSave} loading={saving} />
        <PrimaryButton title="Delete vaccine" variant="danger" icon="trash-outline" onPress={handleDelete} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
});
