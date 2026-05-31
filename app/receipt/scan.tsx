import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { extractReceiptInfo, ReceiptOcrResult } from '@/lib/gemini';
import { uploadCompressedPhoto } from '@/lib/storage';
import { createReceipt } from '@/lib/firestore';
import {
  RECEIPT_CATEGORIES,
  RECEIPT_CATEGORY_META,
  normalizeReceiptCategory,
  parseAmount,
} from '@/utils/receiptCategory';
import { colors, radius, spacing, typography } from '@/theme';
import { toDate } from '@/utils/dates';
import type { ReceiptCategory } from '@/types/models';

type Stage = 'capture' | 'scanning' | 'confirm';

export default function ScanReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();
  const { check } = useGate();

  const [stage, setStage] = useState<Stage>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptOcrResult | null>(null);

  // Confirm form. petId null = "Household" (not tied to one pet).
  const [petId, setPetId] = useState<string | null>(params.petId ?? null);
  const [category, setCategory] = useState<ReceiptCategory>('food');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const pickImage = async (mode: 'camera' | 'library') => {
    // Receipt scanning uses Smart Scan / OCR, which is gated like the other
    // scanners. Free users get their trial; past that we route to paywall.
    if (!check('ocr_scan')) return;
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
      const out = await extractReceiptInfo(uri);
      setResult(out);
      setVendor(out.vendor ?? '');
      setAmount(out.total ?? '');
      setCategory(normalizeReceiptCategory(out.category));
      const d = out.date ? toDate(out.date) : null;
      setDate(d ?? new Date());
      setStage('confirm');
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Try a clearer photo.');
      setStage('capture');
    }
  };

  // Manual entry path — skip OCR, just fill the form in.
  const enterManually = () => {
    setResult(null);
    setImageUri(null);
    setStage('confirm');
  };

  const handleSave = async () => {
    if (!user) return;
    if (!vendor.trim() && !amount.trim()) {
      Alert.alert('Add details', 'Enter at least a store name or amount.');
      return;
    }
    setSaving(true);
    try {
      let fileUrl: string | null = null;
      if (imageUri) {
        fileUrl = await uploadCompressedPhoto(user.uid, imageUri, 'documents');
      }
      const parsedAmount = parseAmount(amount);
      const items = (result?.items ?? [])
        .slice(0, 20)
        .map(i => ({ name: i.name, price: parseAmount(i.price) }));
      await createReceipt(user.uid, {
        petId,
        category,
        vendor: vendor.trim() || 'Receipt',
        amount: parsedAmount,
        amountText: amount.trim(),
        date: (date ?? new Date()).toISOString(),
        notes: notes.trim() || undefined,
        fileUrl,
        items: items.length ? items : undefined,
        ocrText: result?.rawText || undefined,
        source: result ? 'scan' : 'manual',
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Capture ──
  if (stage === 'capture') {
    return (
      <View style={styles.captureWrap}>
        <Stack.Screen options={{ title: 'Scan receipt' }} />
        <View style={styles.captureIcon}>
          <Ionicons name="receipt-outline" size={36} color={colors.primary} />
        </View>
        <Text style={typography.h2}>Scan a receipt</Text>
        <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg, maxWidth: 320 }]}>
          Food, grooming, toys, supplies, and more. We&apos;ll read the store, total,
          and date so you can track spending. Review before it&apos;s saved.
        </Text>
        <PrimaryButton title="Take photo" icon="camera-outline" onPress={() => pickImage('camera')} />
        <PrimaryButton title="Choose from library" icon="image-outline" variant="secondary" onPress={() => pickImage('library')} style={{ marginTop: spacing.sm }} />
        <Pressable onPress={enterManually} style={styles.manualBtn}>
          <Text style={styles.manualText}>Enter manually instead</Text>
        </Pressable>
      </View>
    );
  }

  // ── Scanning ──
  if (stage === 'scanning') {
    return (
      <View style={styles.captureWrap}>
        <Stack.Screen options={{ title: 'Scanning…' }} />
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" /> : null}
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        <Text style={[typography.bodyStrong, { marginTop: spacing.md }]}>Reading the receipt…</Text>
        <Text style={[typography.caption, { textAlign: 'center', maxWidth: 280, marginTop: 6 }]}>
          Pulling the store, total, date, and category. This takes a few seconds.
        </Text>
      </View>
    );
  }

  // ── Confirm ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Review' }} />
      <ScrollView contentContainerStyle={styles.confirmScroll} keyboardShouldPersistTaps="handled">
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewSmall} contentFit="cover" /> : null}

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {RECEIPT_CATEGORIES.map(c => (
            <Chip
              key={c}
              label={RECEIPT_CATEGORY_META[c].label}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <FormField label="Store / vendor" value={vendor} onChangeText={setVendor} placeholder="e.g. Chewy" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Total" value={amount} onChangeText={setAmount} placeholder="$0.00" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.label}>Date</Text>
            <DateField value={date} onChange={setDate} placeholder="Tap to pick" />
          </View>
        </View>

        {/* Pet (optional) */}
        <Text style={styles.label}>For (optional)</Text>
        <View style={styles.chipRow}>
          <Chip label="Household" selected={petId === null} onPress={() => setPetId(null)} />
          {pets.map(p => (
            <Chip key={p.id} label={p.name} selected={petId === p.id} onPress={() => setPetId(p.id)} />
          ))}
        </View>

        <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything to remember" multiline />

        {/* Extracted line items preview */}
        {result?.items && result.items.length > 0 ? (
          <View style={styles.itemsCard}>
            <Text style={styles.itemsTitle}>Detected items ({result.items.length})</Text>
            {result.items.slice(0, 12).map((it, idx) => (
              <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemDivider]}>
                <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                <Text style={styles.itemPrice}>{it.price ?? ''}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <PrimaryButton
          title="Save receipt"
          onPress={handleSave}
          loading={saving}
          icon="checkmark-outline"
        />
        <PrimaryButton title="Use a different photo" variant="ghost" onPress={() => setStage('capture')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  captureWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.lg, backgroundColor: colors.bg, gap: 6,
  },
  captureIcon: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  manualBtn: { padding: spacing.md, marginTop: spacing.xs },
  manualText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  preview: { width: '90%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },

  confirmScroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  previewSmall: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: spacing.md },

  itemsCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  itemsTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 4 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  itemName: { fontSize: 14, color: colors.text, flex: 1 },
  itemPrice: { fontSize: 14, color: colors.textMuted },
});
