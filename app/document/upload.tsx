import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { PetPicker } from '@/components/PetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { createDocument, createPet } from '@/lib/firestore';
import { uploadFile, uploadCompressedPhoto } from '@/lib/storage';
import { colors, radius, spacing } from '@/theme';
import type { DocumentKind } from '@/types/models';

const KIND_OPTIONS: { label: string; value: DocumentKind }[] = [
  { label: 'Vaccine record', value: 'vaccine' },
  { label: 'Vet record', value: 'vet_record' },
  { label: 'Insurance', value: 'insurance' },
  { label: 'Other', value: 'other' },
];

export default function UploadDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();

  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [kind, setKind] = useState<DocumentKind>('vaccine');
  const [title, setTitle] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [saving, setSaving] = useState(false);
  // Staged status shown on the Save button so the upload doesn't look frozen.
  const [saveStatus, setSaveStatus] = useState('');
  // When the user has no pets yet, let them create one inline from the
  // upload screen instead of getting blocked. The document is then attached
  // to the newly created pet.
  const hasNoPets = pets.length === 0;
  const [newPetName, setNewPetName] = useState('');

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
      setFileUri(res.assets[0].uri);
      setFileMime(res.assets[0].mimeType ?? 'image/jpeg');
    }
  };

  const pickDocument = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!res.canceled && res.assets[0]) {
      setFileUri(res.assets[0].uri);
      setFileMime(res.assets[0].mimeType ?? 'application/octet-stream');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fileUri) {
      Alert.alert('Pick a file', 'Take a photo, choose from your library, or pick a file.');
      return;
    }
    // Resolve the target pet. If the user has no pets, create one on the fly
    // from the name they entered (so an upload is never a dead end). If they
    // do have pets, one must be selected.
    if (!petId && !hasNoPets) {
      Alert.alert('Pick a pet', 'Choose which pet this document is for.');
      return;
    }
    setSaving(true);
    try {
      let targetPetId = petId;
      if (!targetPetId) {
        setSaveStatus('Creating pet…');
        targetPetId = await createPet(user.uid, {
          name: newPetName.trim() || 'My pet',
          species: 'dog',
        });
      }
      setSaveStatus(fileMime.startsWith('image/') ? 'Compressing photo…' : 'Uploading file…');
      const url = fileMime.startsWith('image/')
        ? await uploadCompressedPhoto(user.uid, fileUri, 'documents')
        : await uploadFile(user.uid, fileUri, 'documents', fileMime);
      setSaveStatus('Saving…');
      await createDocument(user.uid, {
        petId: targetPetId,
        fileUrl: url,
        fileType: fileMime,
        kind,
        title: title.trim() || defaultTitle(kind),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not upload', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Add document' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {hasNoPets ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.label}>New pet</Text>
            <Text style={styles.helper}>
              You don&apos;t have any pets yet. We&apos;ll create one for this
              document. You can add the breed, birthday, and photo later from the
              Pets tab.
            </Text>
            <FormField
              label="Pet name"
              value={newPetName}
              onChangeText={setNewPetName}
              placeholder="e.g. Yahzi"
            />
          </View>
        ) : (
          <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />
        )}

        <View style={styles.previewWrap}>
          {fileUri && fileMime.startsWith('image/') ? (
            <Image source={{ uri: fileUri }} style={styles.preview} contentFit="cover" />
          ) : fileUri ? (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <Ionicons name="document-text-outline" size={36} color={colors.primary} />
              <Text style={styles.previewName} numberOfLines={1}>{decodeURIComponent(fileUri.split('/').pop() ?? 'Document')}</Text>
            </View>
          ) : (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.textFaint} />
              <Text style={styles.previewName}>No file selected</Text>
            </View>
          )}
          <View style={styles.previewActions}>
            <Pressable style={styles.previewBtn} onPress={() => pickImage('camera')}>
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.previewBtnText}>Camera</Text>
            </Pressable>
            <Pressable style={styles.previewBtn} onPress={() => pickImage('library')}>
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.previewBtnText}>Library</Text>
            </Pressable>
            <Pressable style={styles.previewBtn} onPress={pickDocument}>
              <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
              <Text style={styles.previewBtnText}>File</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {KIND_OPTIONS.map(k => (
              <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
        </View>

        <FormField label="Title" value={title} onChangeText={setTitle} placeholder={defaultTitle(kind)} />

        <PrimaryButton title="Save document" onPress={handleSave} loading={saving} loadingLabel={saveStatus || 'Saving…'} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function defaultTitle(kind: DocumentKind): string {
  switch (kind) {
    case 'vaccine': return 'Vaccine record';
    case 'vet_record': return 'Vet record';
    case 'insurance': return 'Insurance document';
    default: return 'Document';
  }
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  helper: { fontSize: 12, color: colors.textMuted, marginLeft: 4, lineHeight: 17 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewWrap: { gap: spacing.sm },
  preview: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.cardSubtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewPlaceholder: { gap: 6 },
  previewName: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  previewActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill,
  },
  previewBtnText: { color: colors.primary, fontWeight: '600' },
});
