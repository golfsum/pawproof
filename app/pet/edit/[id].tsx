import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { PhotoPicker } from '@/components/PhotoPicker';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/hooks/AuthProvider';
import { usePet } from '@/hooks/useData';
import { updatePet } from '@/lib/firestore';
import { uploadCompressedPhoto } from '@/lib/storage';
import { SPECIES_LABEL } from '@/utils/petIcon';
import { kgToLb, lbToKg, type WeightUnit } from '@/utils/units';
import { colors, radius, spacing } from '@/theme';
import type { Species } from '@/types/models';
import { toDate } from '@/utils/dates';

const SPECIES_OPTIONS: Species[] = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'fish', 'small_mammal', 'other'];

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const pet = usePet(id);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (!pet) return;
    setPhotoUri(pet.photoUrl ?? null);
    setOriginalPhotoUrl(pet.photoUrl ?? null);
    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed ?? '');
    setBirthday(toDate(pet.birthday));
    if (pet.approxAgeMonths != null) {
      setAgeYears(String(Math.floor(pet.approxAgeMonths / 12)));
      setAgeMonths(String(pet.approxAgeMonths % 12));
    } else {
      setAgeYears('');
      setAgeMonths('');
    }
    if (pet.weightKg != null) {
      // Show in lb by default; if value looks suspiciously kg-like (e.g.
      // user toggled to kg earlier), they can flip the toggle and re-edit.
      const lb = kgToLb(pet.weightKg);
      setWeightUnit('lb');
      setWeightValue(lb >= 100 ? lb.toFixed(0) : lb.toFixed(1).replace(/\.0$/, ''));
    } else {
      setWeightValue('');
    }
    setMicrochip(pet.microchip ?? '');
    setVetName(pet.vetName ?? '');
    setVetPhone(pet.vetPhone ?? '');
    setVetWebsite(pet.vetWebsite ?? '');
    setEmergencyContactName(pet.emergencyContactName ?? '');
    setEmergencyContactPhone(pet.emergencyContactPhone ?? '');
    setAllergies(pet.allergies ?? '');
    setNotes(pet.notes ?? '');
    setEmergencyNotes(pet.emergencyNotes ?? '');
  }, [pet?.id]);

  if (!pet) return null;

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your pet a name to continue.');
      return;
    }

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
    let photoUrl = originalPhotoUrl;
    let photoUploadFailure: string | null = null;
    if (photoUri !== originalPhotoUrl) {
      if (photoUri && !photoUri.startsWith('http')) {
        try {
          photoUrl = await uploadCompressedPhoto(user.uid, photoUri, 'pets');
        } catch (e: any) {
          // Keep the existing photo (if any) so the user doesn't
          // lose what they had before a failed upload. The pet save
          // itself still proceeds; we just warn afterwards.
          photoUploadFailure = e?.message ?? 'Upload failed.';
          console.warn('[pet/edit] photo upload failed, keeping previous', e);
          photoUrl = originalPhotoUrl;
        }
      } else {
        photoUrl = photoUri;
      }
    }
    try {
      await updatePet(user.uid, pet.id, {
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        birthday: birthday ? birthday.toISOString() : null,
        approxAgeMonths: totalMonths,
        weightKg,
        photoUrl: photoUrl ?? null,
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
        Alert.alert(
          'Saved without new photo',
          `Profile updates were saved, but the new photo couldn't be uploaded: ${photoUploadFailure} Try again from this screen.`,
        );
      }
      router.back();
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
      <Stack.Screen options={{ title: `Edit ${pet.name}` }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.photoWrap}>
          <PhotoPicker value={photoUri} onChange={setPhotoUri} shape="circle" size={120} />
        </View>

        <FormField label="Name" required value={name} onChangeText={setName} />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Species</Text>
          <View style={styles.chipRow}>
            {SPECIES_OPTIONS.map(s => (
              <Chip key={s} label={SPECIES_LABEL[s]} selected={species === s} onPress={() => setSpecies(s)} />
            ))}
          </View>
        </View>

        <FormField label="Breed" value={breed} onChangeText={setBreed} />
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

        <FormField label="Microchip" value={microchip} onChangeText={setMicrochip} />
        <FormField label="Vet name" value={vetName} onChangeText={setVetName} />
        <FormField label="Vet phone" value={vetPhone} onChangeText={setVetPhone} keyboardType="phone-pad" />
        <FormField
          label="Vet website"
          value={vetWebsite}
          onChangeText={setVetWebsite}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="example.com"
        />
        <FormField label="Emergency contact" value={emergencyContactName} onChangeText={setEmergencyContactName} />
        <FormField label="Emergency phone" value={emergencyContactPhone} onChangeText={setEmergencyContactPhone} keyboardType="phone-pad" />
        <FormField label="Allergies" value={allergies} onChangeText={setAllergies} multiline />
        <FormField label="Notes" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
        <FormField label="Emergency notes" value={emergencyNotes} onChangeText={setEmergencyNotes} multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />

        <PrimaryButton title="Save changes" onPress={handleSave} loading={saving} />
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
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  photoWrap: { alignItems: 'center', marginBottom: spacing.sm },
  fieldGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
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
