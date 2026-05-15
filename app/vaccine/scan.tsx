import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { extractVaccineInfo, OcrExtractedFields } from '@/lib/gemini';
import { uploadCompressedPhoto } from '@/lib/storage';
import { createDocument, createVaccine, createReminder } from '@/lib/firestore';
import { scheduleReminder } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';
import { toDate } from '@/utils/dates';

type Stage = 'capture' | 'scanning' | 'confirm';

export default function ScanVaccineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();

  const [stage, setStage] = useState<Stage>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [fields, setFields] = useState<OcrExtractedFields>({
    petName: null,
    vaccineName: null,
    dateGiven: null,
    expirationDate: null,
    clinicName: null,
    lotNumber: null,
  });

  // Bound state for the confirm form
  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [vaccineName, setVaccineName] = useState('');
  const [dateGiven, setDateGiven] = useState<Date | null>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const pickImage = async (mode: 'camera' | 'library') => {
    const perm = mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', `Enable ${mode} access in Settings.`);
      return;
    }
    const res = mode === 'camera'
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.9 });
    if (!res.canceled && res.assets[0]) {
      const uri = res.assets[0].uri;
      setImageUri(uri);
      runOcr(uri);
    }
  };

  const runOcr = async (uri: string) => {
    setStage('scanning');
    try {
      const out = await extractVaccineInfo(uri);
      setRawText(out.rawText);
      setFields(out.fields);
      setVaccineName(out.fields.vaccineName ?? '');
      setDateGiven(toDate(out.fields.dateGiven) ?? new Date());
      setExpirationDate(toDate(out.fields.expirationDate));
      setClinicName(out.fields.clinicName ?? '');
      setLotNumber(out.fields.lotNumber ?? '');
      // Auto-match petName to one of the user's pets, case-insensitive.
      if (out.fields.petName) {
        const guess = pets.find(p => p.name.trim().toLowerCase() === out.fields.petName!.trim().toLowerCase());
        if (guess) setPetId(guess.id);
      }
      setStage('confirm');
    } catch (e: any) {
      Alert.alert('OCR failed', e?.message ?? 'Try a clearer photo.');
      setStage('capture');
    }
  };

  const handleConfirmSave = async () => {
    if (!user || !imageUri) return;
    if (!petId || !vaccineName.trim() || !dateGiven) {
      Alert.alert('Required', 'Pet, vaccine name, and date given are required.');
      return;
    }
    setSaving(true);
    try {
      // 1) Upload doc
      const fileUrl = await uploadCompressedPhoto(user.uid, imageUri, 'documents');
      const documentId = await createDocument(user.uid, {
        petId,
        fileUrl,
        fileType: 'image/jpeg',
        kind: 'vaccine',
        title: `${vaccineName.trim()} record`,
        ocrText: rawText,
        extractedFields: {
          petName: fields.petName,
          vaccineName: fields.vaccineName,
          dateGiven: fields.dateGiven,
          expirationDate: fields.expirationDate,
          clinicName: fields.clinicName,
          lotNumber: fields.lotNumber,
        },
      });

      // 2) Maybe schedule expiration reminder
      let reminderId: string | null = null;
      if (expirationDate) {
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
          notes: 'Auto-created from a scanned vaccine record.',
          dueDate: fireAt.toISOString(),
          repeatType: 'none',
          repeatInterval: null,
          isCompleted: false,
          nextDueDate: fireAt.toISOString(),
          notificationId: notifId,
        });
      }

      // 3) Save vaccine record
      await createVaccine(user.uid, {
        petId,
        vaccineName: vaccineName.trim(),
        dateGiven: dateGiven.toISOString(),
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
        clinicName: clinicName.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        documentId,
        reminderId,
      });

      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'capture') {
    return (
      <View style={styles.captureWrap}>
        <Stack.Screen options={{ title: 'Scan vaccine' }} />
        <View style={styles.captureIcon}>
          <Ionicons name="scan-outline" size={36} color={colors.primary} />
        </View>
        <Text style={typography.h2}>Scan a vaccine record</Text>
        <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg, maxWidth: 320 }]}>
          Capture or upload a photo of a rabies tag, vaccine certificate, or vet record. We use Gemini to extract the details — you'll confirm before anything is saved.
        </Text>
        <PrimaryButton title="Take photo" icon="camera-outline" onPress={() => pickImage('camera')} />
        <PrimaryButton title="Choose from library" icon="image-outline" variant="secondary" onPress={() => pickImage('library')} style={{ marginTop: spacing.sm }} />
      </View>
    );
  }

  if (stage === 'scanning') {
    return (
      <View style={styles.captureWrap}>
        <Stack.Screen options={{ title: 'Scanning' }} />
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" /> : null}
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        <Text style={[typography.bodyStrong, { marginTop: spacing.md }]}>Reading the document…</Text>
        <Text style={[typography.caption, { textAlign: 'center', maxWidth: 280, marginTop: 6 }]}>
          Gemini is extracting vaccine name, dates, clinic, and lot number.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Confirm details' }} />
      <ScrollView contentContainerStyle={styles.confirmScroll} keyboardShouldPersistTaps="handled">
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewSmall} contentFit="cover" /> : null}

        <View style={styles.confirmBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.confirmBannerText}>Review the extracted details below. Nothing is saved until you tap Save.</Text>
        </View>

        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />

        <FormField label="Vaccine name" required value={vaccineName} onChangeText={setVaccineName} />
        <DateField label="Date given" value={dateGiven} onChange={setDateGiven} maximumDate={new Date()} />
        <DateField label="Expiration date" value={expirationDate} onChange={setExpirationDate} optional />
        <FormField label="Clinic" value={clinicName} onChangeText={setClinicName} />
        <FormField label="Lot number" value={lotNumber} onChangeText={setLotNumber} />

        {rawText ? (
          <Pressable
            onPress={() => Alert.alert('Detected text', rawText)}
            style={({ pressed }) => [styles.rawBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>View detected text</Text>
          </Pressable>
        ) : null}

        <PrimaryButton title="Save vaccine" onPress={handleConfirmSave} loading={saving} />
        <PrimaryButton title="Try a different photo" variant="ghost" onPress={() => setStage('capture')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  captureWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg, gap: 6 },
  captureIcon: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  preview: { width: '90%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },
  confirmScroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  previewSmall: { width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  confirmBannerText: { flex: 1, fontSize: 13, color: colors.primaryDark, lineHeight: 18 },
  rawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', padding: spacing.sm },
});
