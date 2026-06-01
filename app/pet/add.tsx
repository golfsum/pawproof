import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { PhotoPicker } from '@/components/PhotoPicker';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/hooks/AuthProvider';
import { useGate } from '@/hooks/useGate';
import { useData } from '@/hooks/useData';
import { createPet } from '@/lib/firestore';
import { uploadCompressedPhoto } from '@/lib/storage';
import { SPECIES_LABEL } from '@/utils/petIcon';
import { lbToKg, type WeightUnit } from '@/utils/units';
import { colors, radius, spacing, typography } from '@/theme';
import type { Species } from '@/types/models';

const SPECIES_OPTIONS: Species[] = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'fish', 'small_mammal', 'other'];

export default function AddPetScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { check } = useGate();
  const { pets } = useData();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('dog');
  const [breed, setBreed] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [ageYears, setAgeYears] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('lb');
  const [microchip, setMicrochip] = useState('');
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [vetWebsite, setVetWebsite] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your pet a name to continue.');
      return;
    }
    if (pets.length > 0 && !check('add_pet')) return;

    const totalMonths =
      ageYears || ageMonths
        ? Math.max(0, (Number(ageYears) || 0) * 12 + (Number(ageMonths) || 0))
        : null;

    const rawWeight = weightValue ? Number(weightValue) : null;
    const weightKg =
      rawWeight != null && !Number.isNaN(rawWeight)
        ? weightUnit === 'lb'
          ? lbToKg(rawWeight)
          : rawWeight
        : null;

    setSaving(true);
    let photoUrl: string | null = null;
    let photoUploadFailure: string | null = null;
    // Upload the photo BEFORE creating the pet doc so we can persist
    // the URL in the same write. If the upload throws (denied storage
    // rules, network), we still save the pet without a photo and
    // surface a separate non-blocking warning — the user shouldn't
    // lose every field they filled in just because the picture
    // couldn't be uploaded.
    if (photoUri) {
      try {
        setSaveStatus('Uploading photo…');
        photoUrl = await uploadCompressedPhoto(user.uid, photoUri, 'pets');
      } catch (e: any) {
        photoUploadFailure = e?.message ?? 'Upload failed.';
        console.warn('[pet/add] photo upload failed, saving without photo', e);
      }
    }
    try {
      setSaveStatus('Saving…');
      const id = await createPet(user.uid, {
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        birthday: birthday ? birthday.toISOString() : null,
        approxAgeMonths: totalMonths,
        weightKg,
        photoUrl,
        microchip: microchip.trim() || undefined,
        vetName: vetName.trim() || undefined,
        vetPhone: vetPhone.trim() || undefined,
        vetWebsite: vetWebsite.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        allergies: allergies.trim() || undefined,
        notes: notes.trim() || undefined,
        emergencyNotes: emergencyNotes.trim() || undefined,
      });
      if (photoUploadFailure) {
        // Pet saved, photo didn't. Surface separately so the user
        // knows where to look — usually a Firebase Storage rules
        // issue. They can re-upload from the Edit screen.
        Alert.alert(
          'Pet saved without photo',
          `${name.trim()} was saved, but the photo couldn't be uploaded: ${photoUploadFailure} You can try again from Edit.`,
        );
      }
      router.replace({ pathname: '/pet/[id]', params: { id } });
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Add a pet' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.photoWrap}>
          <PhotoPicker value={photoUri} onChange={setPhotoUri} shape="circle" size={120} />
        </View>

        <FormField label="Name" required value={name} onChangeText={setName} placeholder="Buddy" />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Species</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map(s => (
              <Chip key={s} label={SPECIES_LABEL[s]} selected={species === s} onPress={() => setSpecies(s)} />
            ))}
          </View>
        </View>

        <FormField label="Breed" value={breed} onChangeText={setBreed} placeholder="Golden retriever" />

        <DateField label="Birthday" value={birthday} onChange={setBirthday} optional maximumDate={new Date()} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Estimated age</Text>
          <View style={styles.row}>
            <View style={styles.colHalf}>
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={ageYears}
                onChangeText={setAgeYears}
                style={styles.input}
              />
              <Text style={styles.unitInline}>years</Text>
            </View>
            <View style={styles.colHalf}>
              <TextInput
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                value={ageMonths}
                onChangeText={setAgeMonths}
                style={styles.input}
              />
              <Text style={styles.unitInline}>months</Text>
            </View>
          </View>
          <Text style={styles.hint}>Use this if you don't know the exact birthday.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Weight</Text>
          <View style={styles.row}>
            <TextInput
              placeholder={weightUnit === 'lb' ? '25' : '12.5'}
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              value={weightValue}
              onChangeText={setWeightValue}
              style={[styles.input, { flex: 1 }]}
            />
            <View style={styles.unitToggle}>
              <UnitOption label="lb" selected={weightUnit === 'lb'} onPress={() => setWeightUnit('lb')} />
              <UnitOption label="kg" selected={weightUnit === 'kg'} onPress={() => setWeightUnit('kg')} />
            </View>
          </View>
        </View>

        <FormField label="Microchip" value={microchip} onChangeText={setMicrochip} placeholder="Optional" />

        <FormField label="Vet name" value={vetName} onChangeText={setVetName} placeholder="Dr. Smith" />
        <FormField
          label="Vet phone"
          value={vetPhone}
          onChangeText={setVetPhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
        />
        <FormField
          label="Vet website"
          value={vetWebsite}
          onChangeText={setVetWebsite}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="example.com"
        />

        <FormField
          label="Emergency contact"
          value={emergencyContactName}
          onChangeText={setEmergencyContactName}
          placeholder="Friend, family, sitter…"
        />
        <FormField
          label="Emergency phone"
          value={emergencyContactPhone}
          onChangeText={setEmergencyContactPhone}
          keyboardType="phone-pad"
          placeholder="(555) 123-4567"
        />

        <FormField
          label="Allergies"
          value={allergies}
          onChangeText={setAllergies}
          placeholder="Chicken, certain meds…"
          multiline
          style={{ minHeight: 60 }}
        />
        <FormField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Anything else worth remembering"
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <FormField
          label="Emergency notes"
          value={emergencyNotes}
          onChangeText={setEmergencyNotes}
          multiline
          placeholder="Conditions, instructions for sitters…"
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <PrimaryButton title="Save pet" onPress={handleSave} loading={saving} loadingLabel={saveStatus || 'Saving…'} />
        <Text style={[typography.caption, { textAlign: 'center' }]}>
          You can edit this profile anytime.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function UnitOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.unitOption, selected && styles.unitOptionSelected]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  photoWrap: { alignItems: 'center', marginBottom: spacing.sm },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  hint: { fontSize: 12, color: colors.textFaint, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  colHalf: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitInline: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardSubtle,
    borderRadius: radius.md,
    padding: 3,
    height: 50,
    alignItems: 'center',
  },
  unitOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    overflow: 'hidden',
  },
  unitOptionSelected: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
  },
});
