import React, { useMemo, useState } from 'react';
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
import { PetPicker } from '@/components/PetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { extractVetInvoiceInfo, InvoiceOcrResult } from '@/lib/gemini';
import { showSettingsPermissionAlert } from '@/lib/permissions';
import { uploadCompressedPhoto } from '@/lib/storage';
import { createDocument, createVaccine, createReminder, incrementFreeOcrScanCount } from '@/lib/firestore';
import { scheduleVaccineExpirationReminder } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';
import { fmtDate, toDate } from '@/utils/dates';

type Stage = 'capture' | 'scanning' | 'confirm';

interface GivenSel {
  name: string;
  dateGiven: string;     // ISO
  lotNumber: string | null;
  selected: boolean;
}

interface DueSel {
  name: string;
  dueDate: string;       // ISO
  selected: boolean;
}

export default function ScanInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user, profile } = useAuth();
  const { pets } = useData();
  const { isPremium } = useGate();
  const warnDays = profile?.notificationPrefs?.vaccineWarnDays ?? 14;

  const [stage, setStage] = useState<Stage>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<InvoiceOcrResult | null>(null);

  // Confirm form state
  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [given, setGiven] = useState<GivenSel[]>([]);
  const [dues, setDues] = useState<DueSel[]>([]);
  const [saving, setSaving] = useState(false);

  const pickImage = async (mode: 'camera' | 'library') => {
    const perm = mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showSettingsPermissionAlert(mode === 'camera' ? 'camera' : 'photo library');
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
      const out = await extractVetInvoiceInfo(uri);
      if (user && !isPremium) {
        incrementFreeOcrScanCount(user.uid).catch(() => {});
      }
      setResult(out);

      // Hydrate confirm form state from extraction
      setClinicName(out.clinicName ?? '');
      setInvoiceTotal(out.invoiceTotal ?? '');
      setTitle(buildInvoiceTitle(out));

      const guessedPet = out.petName
        ? pets.find(p => p.name.trim().toLowerCase() === out.petName!.trim().toLowerCase())
        : undefined;
      if (guessedPet) setPetId(guessedPet.id);

      const fallbackDate = out.documentDate ?? new Date().toISOString().slice(0, 10);
      setGiven(
        out.vaccinesAdministered.map(v => ({
          name: v.name,
          dateGiven: (v.dateGiven ?? fallbackDate) + (v.dateGiven?.length === 10 ? 'T12:00:00.000Z' : ''),
          lotNumber: v.lotNumber,
          selected: true,
        })),
      );
      setDues(
        out.vaccinesDue.map(v => ({
          name: v.name,
          dueDate: v.dueDate + 'T09:00:00.000Z',
          selected: true,
        })),
      );

      setStage('confirm');
    } catch (e: any) {
      Alert.alert('OCR failed', e?.message ?? 'Try a clearer photo.');
      setStage('capture');
    }
  };

  const selectedGiven = given.filter(g => g.selected);
  const selectedDues = dues.filter(d => d.selected);

  const canSave = !!petId && !!imageUri;

  const handleSave = async () => {
    if (!user || !imageUri || !petId) return;
    setSaving(true);
    try {
      // 1. Upload the invoice photo and create a Document with kind=invoice.
      const fileUrl = await uploadCompressedPhoto(user.uid, imageUri, 'documents');
      const documentId = await createDocument(user.uid, {
        petId,
        fileUrl,
        fileType: 'image/jpeg',
        kind: 'invoice',
        title: title.trim() || buildInvoiceTitle(result),
        ocrText: result?.rawText ?? '',
        extractedFields: {
          documentDate: result?.documentDate ?? null,
          clinicName: clinicName.trim() || null,
          invoiceTotal: invoiceTotal.trim() || null,
          invoiceNumber: result?.invoiceNumber ?? null,
          petName: result?.petName ?? null,
        },
      });

      // 2. Create vaccine records for everything the user kept checked.
      for (const v of selectedGiven) {
        await createVaccine(user.uid, {
          petId,
          vaccineName: v.name,
          dateGiven: v.dateGiven,
          expirationDate: null,
          clinicName: clinicName.trim() || undefined,
          lotNumber: v.lotNumber || undefined,
          documentId,
          reminderId: null,
        });
      }

      // 3. Schedule reminders for each future vaccine due, 14 days before.
      const petForNotif = pets.find(p => p.id === petId) ?? null;
      for (const d of selectedDues) {
        const dueAt = toDate(d.dueDate);
        if (!dueAt) continue;
        const notifId = await scheduleVaccineExpirationReminder({
          pet: petForNotif,
          vaccineName: d.name,
          expiresAt: dueAt,
          daysBefore: warnDays,
        });
        await createReminder(user.uid, {
          petId,
          type: 'vaccination',
          title: `${d.name} vaccine`,
          notes: 'Auto-created from a scanned vet invoice.',
          dueDate: dueAt.toISOString(),
          repeatType: 'none',
          repeatInterval: null,
          isCompleted: false,
          nextDueDate: dueAt.toISOString(),
          notificationId: notifId,
        });
      }

      router.back();
      Alert.alert(
        'Saved',
        `Invoice saved · ${selectedGiven.length} vaccine${selectedGiven.length === 1 ? '' : 's'} recorded · ${selectedDues.length} reminder${selectedDues.length === 1 ? '' : 's'} scheduled.`,
      );
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
        <Stack.Screen options={{ title: 'Scan vet invoice' }} />
        <View style={styles.captureIcon}>
          <Ionicons name="receipt-outline" size={36} color={colors.primary} />
        </View>
        <Text style={typography.h2}>Scan a vet invoice</Text>
        <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg, maxWidth: 320 }]}>
          We'll extract what was given today, future due dates, and the invoice itself. Review before anything's saved.
        </Text>
        <PrimaryButton title="Take photo" icon="camera-outline" onPress={() => pickImage('camera')} />
        <PrimaryButton title="Choose from library" icon="image-outline" variant="secondary" onPress={() => pickImage('library')} style={{ marginTop: spacing.sm }} />
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
        <Text style={[typography.bodyStrong, { marginTop: spacing.md }]}>Reading the invoice…</Text>
        <Text style={[typography.caption, { textAlign: 'center', maxWidth: 280, marginTop: 6 }]}>
          Pulling vaccines, due dates, clinic, and totals. This usually takes a few seconds.
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

        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.bannerText}>
            Review the extracted items below. Uncheck anything you don't want saved. Nothing is created until you tap Save.
          </Text>
        </View>

        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />
        <FormField label="Title" value={title} onChangeText={setTitle} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField label="Clinic" value={clinicName} onChangeText={setClinicName} />
          </View>
          <View style={{ flex: 1 }}>
            <FormField label="Total" value={invoiceTotal} onChangeText={setInvoiceTotal} placeholder="$0.00" />
          </View>
        </View>

        {/* Vaccines administered */}
        <Section
          icon="shield-checkmark-outline"
          title="Vaccines administered"
          count={given.length}
          emptyText="No vaccines detected on this invoice."
          tint={colors.success}
        >
          {given.map((v, idx) => (
            <ToggleRow
              key={`given-${idx}`}
              title={v.name}
              subtitle={`Given ${fmtDate(v.dateGiven)}${v.lotNumber ? ` · Lot ${v.lotNumber}` : ''}`}
              selected={v.selected}
              onToggle={() =>
                setGiven(prev => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))
              }
              tint={colors.success}
            />
          ))}
        </Section>

        {/* Vaccines due */}
        <Section
          icon="alarm-outline"
          title="Reminders to schedule"
          count={dues.length}
          emptyText="No future due dates found."
          tint={colors.primary}
        >
          {dues.map((d, idx) => (
            <ToggleRow
              key={`due-${idx}`}
              title={d.name}
              subtitle={`Due ${fmtDate(d.dueDate)} · alert 14 days before`}
              selected={d.selected}
              onToggle={() =>
                setDues(prev => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))
              }
              tint={colors.primary}
            />
          ))}
        </Section>

        {/* Summary */}
        <View style={styles.summary}>
          <SummaryStat label="Invoice" value="1" />
          <SummaryStat label="Vaccines" value={String(selectedGiven.length)} />
          <SummaryStat label="Reminders" value={String(selectedDues.length)} />
        </View>

        <PrimaryButton
          title="Save invoice & records"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          icon="checkmark-outline"
        />
        <PrimaryButton title="Try a different photo" variant="ghost" onPress={() => setStage('capture')} />

        {result?.rawText ? (
          <Pressable
            onPress={() => Alert.alert('Detected text', result.rawText.slice(0, 4000))}
            style={({ pressed }) => [styles.rawBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>View detected text</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function buildInvoiceTitle(r: InvoiceOcrResult | null): string {
  if (!r) return 'Vet invoice';
  const parts: string[] = [];
  if (r.clinicName) parts.push(r.clinicName);
  if (r.documentDate) parts.push(new Date(r.documentDate).toLocaleDateString());
  if (parts.length === 0) return 'Vet invoice';
  return parts.join(' · ');
}

function Section({
  icon, title, count, emptyText, tint, children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count: number;
  emptyText: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: tint + '22' }]}>
          <Ionicons name={icon} size={16} color={tint} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>
      {count === 0 ? (
        <Text style={styles.sectionEmpty}>{emptyText}</Text>
      ) : (
        <View style={{ gap: spacing.sm }}>{children}</View>
      )}
    </View>
  );
}

function ToggleRow({
  title, subtitle, selected, onToggle, tint,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onToggle: () => void;
  tint: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggleRow,
        selected && { borderColor: tint, backgroundColor: tint + '0F' },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.checkbox, selected && { backgroundColor: tint, borderColor: tint }]}>
        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
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
  preview: { width: '90%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },

  confirmScroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  previewSmall: { width: '100%', height: 200, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: 13, color: colors.primaryDark, lineHeight: 18 },
  row: { flexDirection: 'row', gap: spacing.md },

  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  sectionEmpty: { fontSize: 13, color: colors.textFaint, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, fontStyle: 'italic' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  summary: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  summaryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase', marginTop: 2 },

  rawBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', padding: spacing.sm },
});
