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
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PetPicker } from '@/components/PetPicker';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { extractDocumentInfo, DocumentOcrResult, DetectedDocumentType, ExtractedPetDetails } from '@/lib/gemini';
import { uploadCompressedPhoto, uploadFile } from '@/lib/storage';
import { createDocument, createVaccine, createReminder, updatePet, incrementFreeOcrScanCount } from '@/lib/firestore';
import { useGate } from '@/hooks/useGate';
import { scheduleVaccineExpirationReminder } from '@/lib/notifications';
import { colors, radius, spacing, typography } from '@/theme';
import { fmtDate, toDate, fmtMonths } from '@/utils/dates';
import { fmtWeight } from '@/utils/units';
import { canonicalizeVaccineName, vaccineKey } from '@/utils/vaccineNames';
import { deriveExpiration } from '@/utils/vaccineSchedules';
import type { DocumentKind, Reminder, VaccineRecord } from '@/types/models';

type Stage = 'capture' | 'scanning' | 'confirm';

interface GivenSel {
  name: string;
  dateGiven: string;
  lotNumber: string | null;
  selected: boolean;
}
interface DueSel {
  name: string;
  dueDate: string;
  selected: boolean;
}

// Fields the user can opt to apply from OCR to the Pet record.
type DetailKey = 'breed' | 'birthday' | 'approxAgeMonths' | 'weightKg' | 'microchip';
interface DetectedDetailRow {
  key: DetailKey;
  label: string;
  from: string;
  to: string;
}

const norm = (s: string): string => s.trim().toLowerCase();

// Map Gemini's detected types onto our storage DocumentKind.
const TYPE_TO_KIND: Record<DetectedDocumentType, DocumentKind> = {
  vaccine_certificate: 'vaccine',
  vet_invoice: 'invoice',
  vet_record: 'vet_record',
  insurance: 'insurance',
  other: 'other',
};

const KIND_OPTIONS: { label: string; value: DocumentKind; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { label: 'Vaccine',   value: 'vaccine',   icon: 'shield-checkmark-outline' },
  { label: 'Invoice',   value: 'invoice',   icon: 'receipt-outline' },
  { label: 'Vet record', value: 'vet_record', icon: 'pulse-outline' },
  { label: 'Insurance', value: 'insurance', icon: 'card-outline' },
  { label: 'Other',     value: 'other',     icon: 'document-outline' },
];

// ── Duplicate detection ───────────────────────────────────────────────
// Match against existing records by pet + canonical name + same calendar
// day. Loose enough to catch scans of the same invoice twice, strict enough
// that re-vaccinations on different days are NOT flagged as duplicates.

function sameCalendarDay(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
}

// Dedup matches on the CANONICAL key, not the raw string. So "Parvo"
// scanned today will match an existing "DHPP" record on the same day.
function isDuplicateVaccine(existing: VaccineRecord[], petId: string, name: string, dateGiven: string): boolean {
  const key = vaccineKey(name);
  if (!key) return false;
  return existing.some(v =>
    v.petId === petId
    && vaccineKey(v.vaccineName) === key
    && sameCalendarDay(v.dateGiven, dateGiven),
  );
}

function isDuplicateReminder(existing: Reminder[], petId: string, name: string, dueDate: string): boolean {
  const key = vaccineKey(name);
  if (!key) return false;
  return existing.some(r =>
    r.petId === petId
    && r.type === 'vaccination'
    && !r.isCompleted
    && vaccineKey(r.title) === key
    && sameCalendarDay(r.dueDate, dueDate),
  );
}

export default function ScanDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user, profile } = useAuth();
  const { pets, vaccines: existingVaccines, reminders: existingReminders } = useData();
  const { isPremium, ocrTrialAvailable } = useGate();
  const warnDays = profile?.notificationPrefs?.vaccineWarnDays ?? 14;

  const [stage, setStage] = useState<Stage>('capture');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [result, setResult] = useState<DocumentOcrResult | null>(null);

  // Confirm-screen state
  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DocumentKind>('other');
  const [clinicName, setClinicName] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [given, setGiven] = useState<GivenSel[]>([]);
  const [dues, setDues] = useState<DueSel[]>([]);
  const [saving, setSaving] = useState(false);
  // Pet-detail rows the user has opted OUT of applying. Default = empty set,
  // i.e. apply everything we detected.
  const [excludedDetails, setExcludedDetails] = useState<Set<DetailKey>>(new Set());

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
      setFileMime(res.assets[0].mimeType ?? 'image/jpeg');
      runOcr(uri);
    }
  };

  const pickFile = async () => {
    // PDFs and images both supported (Gemini 2.5 Flash can OCR PDFs directly).
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setImageUri(asset.uri);
      setFileMime(asset.mimeType ?? 'application/octet-stream');
      runOcr(asset.uri);
    }
  };

  const runOcr = async (uri: string) => {
    setStage('scanning');
    try {
      const out = await extractDocumentInfo(uri);
      setResult(out);

      // Burn the free-trial scan as soon as Gemini returns successfully.
      // We charge per Gemini call (which is what actually costs us money),
      // not per save, so even if the user bails on the confirm screen,
      // the trial is consumed.
      if (user && !isPremium) {
        incrementFreeOcrScanCount(user.uid).catch(() => {});
      }

      setTitle(out.suggestedTitle || 'Pet document');
      setKind(TYPE_TO_KIND[out.documentType] ?? 'other');
      setClinicName(out.clinicName ?? '');
      setInvoiceTotal(out.invoiceTotal ?? '');

      const guessedPet = out.petName
        ? pets.find(p => p.name.trim().toLowerCase() === out.petName!.trim().toLowerCase())
        : undefined;
      // Use the guessed pet (or whatever is currently picked) for the
      // initial duplicate check so existing rows are pre-unchecked.
      const effectivePetId = guessedPet?.id ?? petId ?? pets[0]?.id ?? null;
      if (guessedPet) setPetId(guessedPet.id);

      const fallbackDate = out.documentDate ?? new Date().toISOString().slice(0, 10);
      setGiven(
        out.vaccinesAdministered.map(v => {
          // Canonicalize alias-y names ("Parvo Annual" → "DHPP") so display
          // and dedup match what's already in the user's records.
          const canonName = canonicalizeVaccineName(v.name);
          const dateGiven = normalizeIso(v.dateGiven ?? fallbackDate, 'T12:00:00.000Z');
          const dup = effectivePetId
            ? isDuplicateVaccine(existingVaccines, effectivePetId, canonName, dateGiven)
            : false;
          return {
            name: canonName,
            dateGiven,
            lotNumber: v.lotNumber,
            selected: !dup,
          };
        }),
      );
      setDues(
        out.vaccinesDue.map(v => {
          const canonName = canonicalizeVaccineName(v.name);
          const dueDate = normalizeIso(v.dueDate, 'T09:00:00.000Z');
          const dup = effectivePetId
            ? isDuplicateReminder(existingReminders, effectivePetId, canonName, dueDate)
            : false;
          return {
            name: canonName,
            dueDate,
            selected: !dup,
          };
        }),
      );

      setStage('confirm');
    } catch (e: any) {
      Alert.alert('OCR failed', e?.message ?? 'Try a clearer photo.');
      setStage('capture');
    }
  };

  const selectedGiven = given.filter(g => g.selected);
  const selectedDues = dues.filter(d => d.selected);

  // Detected pet-detail updates. Compare the OCR-extracted petDetails
  // against the selected pet's current values, and list each field that
  // would change. Pre-checked by default; user can opt out per-row.
  const detectedDetailRows = useMemo<DetectedDetailRow[]>(() => {
    if (!petId || !result) return [];
    const pet = pets.find(p => p.id === petId);
    if (!pet) return [];
    const d = result.petDetails;
    const rows: DetectedDetailRow[] = [];

    if (d.breed && norm(d.breed) !== norm(pet.breed ?? '')) {
      rows.push({ key: 'breed', label: 'Breed', from: pet.breed || 'Not set', to: d.breed });
    }
    if (d.birthday && d.birthday.slice(0, 10) !== (pet.birthday ?? '').slice(0, 10)) {
      rows.push({
        key: 'birthday', label: 'Birthday',
        from: pet.birthday ? fmtDate(pet.birthday) : 'Not set',
        to: fmtDate(d.birthday),
      });
    }
    if (d.approxAgeMonths != null && d.approxAgeMonths !== pet.approxAgeMonths) {
      rows.push({
        key: 'approxAgeMonths', label: 'Age',
        from: pet.approxAgeMonths != null ? (fmtMonths(pet.approxAgeMonths) || 'Not set') : 'Not set',
        to: fmtMonths(d.approxAgeMonths) || 'Not set',
      });
    }
    if (d.weightKg != null && Math.abs(d.weightKg - (pet.weightKg ?? -1)) > 0.05) {
      rows.push({
        key: 'weightKg', label: 'Weight',
        from: pet.weightKg != null ? fmtWeight(pet.weightKg) : 'Not set',
        to: fmtWeight(d.weightKg),
      });
    }
    if (d.microchip && d.microchip !== (pet.microchip ?? '')) {
      rows.push({
        key: 'microchip', label: 'Microchip',
        from: pet.microchip || 'Not set',
        to: d.microchip,
      });
    }
    return rows;
  }, [petId, result, pets]);

  // Live duplicate sets, re-derived whenever the pet selection or existing
  // records change. Powers the "Already on file" badge in the UI.
  const duplicates = useMemo(() => {
    const givenDup = new Set<number>();
    const dueDup = new Set<number>();
    if (!petId) return { givenDup, dueDup };
    given.forEach((g, i) => {
      if (isDuplicateVaccine(existingVaccines, petId, g.name, g.dateGiven)) givenDup.add(i);
    });
    dues.forEach((d, i) => {
      if (isDuplicateReminder(existingReminders, petId, d.name, d.dueDate)) dueDup.add(i);
    });
    return { givenDup, dueDup };
  }, [given, dues, petId, existingVaccines, existingReminders]);

  const hasActionable = selectedGiven.length > 0 || selectedDues.length > 0;
  const showInvoiceFields = kind === 'invoice' || !!invoiceTotal;

  const canSave = !!petId && !!imageUri && title.trim().length > 0;

  const handleSave = async () => {
    if (!user || !imageUri || !petId) return;
    setSaving(true);
    try {
      // PDFs upload as-is (compression would destroy them). Images get
      // resized + recompressed to keep storage cheap.
      const isPdf = fileMime === 'application/pdf';
      const fileUrl = isPdf
        ? await uploadFile(user.uid, imageUri, 'documents', 'application/pdf')
        : await uploadCompressedPhoto(user.uid, imageUri, 'documents');

      const documentId = await createDocument(user.uid, {
        petId,
        fileUrl,
        fileType: isPdf ? 'application/pdf' : 'image/jpeg',
        kind,
        title: title.trim(),
        ocrText: result?.rawText ?? '',
        extractedFields: {
          documentType: result?.documentType ?? null,
          documentDate: result?.documentDate ?? null,
          clinicName: clinicName.trim() || null,
          invoiceTotal: invoiceTotal.trim() || null,
          invoiceNumber: result?.invoiceNumber ?? null,
          petName: result?.petName ?? null,
          notes: result?.notes ?? null,
        },
      });

      // Apply selected pet detail updates extracted from the document.
      const petUpdates: Record<string, any> = {};
      let appliedDetailCount = 0;
      if (result) {
        const d = result.petDetails;
        detectedDetailRows.forEach(row => {
          if (excludedDetails.has(row.key)) return;
          switch (row.key) {
            case 'breed':
              if (d.breed) { petUpdates.breed = d.breed; appliedDetailCount++; }
              break;
            case 'birthday':
              if (d.birthday) { petUpdates.birthday = d.birthday; appliedDetailCount++; }
              break;
            case 'approxAgeMonths':
              if (d.approxAgeMonths != null) { petUpdates.approxAgeMonths = d.approxAgeMonths; appliedDetailCount++; }
              break;
            case 'weightKg':
              if (d.weightKg != null) { petUpdates.weightKg = d.weightKg; appliedDetailCount++; }
              break;
            case 'microchip':
              if (d.microchip) { petUpdates.microchip = d.microchip; appliedDetailCount++; }
              break;
          }
        });
      }
      if (Object.keys(petUpdates).length > 0) {
        await updatePet(user.uid, petId, petUpdates);
      }

      // Bulk-create vaccine records. For each administered vaccine
      // we try to derive an expiration date from a schedule lookup
      // (Rabies 1yr default, DHPP 1yr, etc.) when the document didn't
      // give one. If derivation succeeds we also seed a renewal
      // reminder so the user gets a heads-up before the next due date.
      const petForSchedule = pets.find(p => p.id === petId);
      let autoRenewalCount = 0;
      for (const v of selectedGiven) {
        // Check if Gemini already extracted an explicit due date that
        // matches this vaccine name. If yes, use it as the expiration.
        const matchingDue = result?.vaccinesDue.find(
          d => canonicalizeVaccineName(d.name) === v.name,
        );
        let expirationDate: string | null = null;
        let expirationDerived = false;
        if (matchingDue?.dueDate) {
          expirationDate = normalizeIso(matchingDue.dueDate, 'T12:00:00.000Z');
        } else {
          const derived = deriveExpiration(v.name, v.dateGiven, petForSchedule);
          if (derived) {
            expirationDate = derived;
            expirationDerived = true;
          }
        }

        await createVaccine(user.uid, {
          petId,
          vaccineName: v.name,
          dateGiven: v.dateGiven,
          expirationDate,
          clinicName: clinicName.trim() || undefined,
          lotNumber: v.lotNumber || undefined,
          documentId,
          reminderId: null,
          isCompleted: true,
          expirationDerived,
          source: 'scan',
        });

        // Seed a renewal reminder when we derived (or had) an
        // expiration AND there isn't already a matching due reminder
        // selected for save below. Two-week heads-up before expiration.
        if (
          expirationDate &&
          !selectedDues.some(d => canonicalizeVaccineName(d.name) === v.name)
        ) {
          const dueAt = new Date(expirationDate);
          if (!Number.isNaN(dueAt.getTime())) {
            try {
              const notifId = await scheduleVaccineExpirationReminder({
                pet: petForSchedule ?? null,
                vaccineName: v.name,
                expiresAt: dueAt,
                daysBefore: warnDays,
              });
              await createReminder(user.uid, {
                petId,
                type: 'vaccination',
                title: `${v.name} vaccine`,
                notes: expirationDerived
                  ? `Auto-derived renewal based on typical schedule. Verify with your vet.`
                  : 'Auto-created from a scanned document.',
                dueDate: dueAt.toISOString(),
                repeatType: 'none',
                repeatInterval: null,
                isCompleted: false,
                nextDueDate: dueAt.toISOString(),
                notificationId: notifId,
              });
              autoRenewalCount++;
            } catch {
              // ignore notification failures, the vaccine row is still saved
            }
          }
        }
      }

      // Schedule reminders for due dates
      for (const d of selectedDues) {
        const dueAt = toDate(d.dueDate);
        if (!dueAt) continue;
        const notifId = await scheduleVaccineExpirationReminder({
          pet: petForSchedule ?? null,
          vaccineName: d.name,
          expiresAt: dueAt,
          daysBefore: warnDays,
        });
        await createReminder(user.uid, {
          petId,
          type: 'vaccination',
          title: `${d.name} vaccine`,
          notes: 'Auto-created from a scanned document.',
          dueDate: dueAt.toISOString(),
          repeatType: 'none',
          repeatInterval: null,
          isCompleted: false,
          nextDueDate: dueAt.toISOString(),
          notificationId: notifId,
        });
      }

      router.back();
      const parts = ['Document saved'];
      if (selectedGiven.length) parts.push(`${selectedGiven.length} vaccine${selectedGiven.length === 1 ? '' : 's'} recorded`);
      const totalReminders = selectedDues.length + autoRenewalCount;
      if (totalReminders) parts.push(`${totalReminders} reminder${totalReminders === 1 ? '' : 's'} scheduled`);
      if (appliedDetailCount) parts.push(`${appliedDetailCount} pet detail${appliedDetailCount === 1 ? '' : 's'} updated`);
      Alert.alert('Saved', parts.join(' · '));
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Capture stage ──
  if (stage === 'capture') {
    return (
      <ScrollView contentContainerStyle={styles.captureWrap} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: 'Scan Document' }} />
        <View style={styles.captureIcon}>
          <Ionicons name="scan-outline" size={36} color={colors.primary} />
        </View>
        <Text style={typography.h2}>Scan a pet document</Text>
        <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.lg, maxWidth: 320 }]}>
          Vaccine card, vet invoice, exam report, insurance card: we'll figure out what it is, pull out vaccines and due dates, and let you review before anything saves.
        </Text>

        {ocrTrialAvailable ? (
          <View style={styles.trialBanner}>
            <Ionicons name="sparkles" size={16} color={colors.primaryDark} />
            <Text style={styles.trialBannerText}>
              Try Smart Scan free. Save vaccine records in seconds.
            </Text>
          </View>
        ) : null}

        {pets.length > 0 ? (
          <View style={styles.petPickerWrap}>
            <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} label="Pet this is for" />
          </View>
        ) : null}

        <PrimaryButton title="Take photo" icon="camera-outline" onPress={() => pickImage('camera')} />
        <PrimaryButton title="Choose from library" icon="image-outline" variant="secondary" onPress={() => pickImage('library')} style={{ marginTop: spacing.sm }} />
        <PrimaryButton title="Pick a file (image or PDF)" icon="document-attach-outline" variant="ghost" onPress={pickFile} style={{ marginTop: spacing.sm }} />
        <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.md, color: colors.textFaint }]}>
          You can still adjust the pet on the review screen.
        </Text>
      </ScrollView>
    );
  }

  // ── Scanning stage ──
  if (stage === 'scanning') {
    const isPdfPreview = fileMime === 'application/pdf';
    return (
      <View style={styles.captureWrap}>
        <Stack.Screen options={{ title: 'Scanning…' }} />
        {imageUri && !isPdfPreview ? (
          <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
        ) : isPdfPreview ? (
          <View style={[styles.preview, styles.pdfPreview]}>
            <Ionicons name="document-text" size={48} color={colors.primary} />
            <Text style={[typography.caption, { marginTop: 8 }]}>PDF document</Text>
          </View>
        ) : null}
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        <Text style={[typography.bodyStrong, { marginTop: spacing.md }]}>Reading the document…</Text>
        <Text style={[typography.caption, { textAlign: 'center', maxWidth: 280, marginTop: 6 }]}>
          Detecting type, vaccines, dates, and clinic. Usually a few seconds.
        </Text>
      </View>
    );
  }

  // ── Confirm stage ──
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Review' }} />
      <ScrollView contentContainerStyle={styles.confirmScroll} keyboardShouldPersistTaps="handled">
        {imageUri && fileMime !== 'application/pdf' ? (
          <Image source={{ uri: imageUri }} style={styles.previewSmall} contentFit="cover" />
        ) : imageUri ? (
          <View style={[styles.previewSmall, styles.pdfPreview]}>
            <Ionicons name="document-text" size={36} color={colors.primary} />
            <Text style={[typography.caption, { marginTop: 6 }]}>PDF document</Text>
          </View>
        ) : null}

        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.bannerText}>
            We detected this as {detectionLabel(result?.documentType)}. Review and adjust below. Nothing is saved until you tap Save.
          </Text>
        </View>

        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />
        <FormField label="Title" required value={title} onChangeText={setTitle} />

        <View style={{ gap: 8 }}>
          <Text style={styles.fieldLabel}>Document type</Text>
          <View style={styles.chipRow}>
            {KIND_OPTIONS.map(k => (
              <Chip
                key={k.value}
                label={k.label}
                icon={k.icon}
                selected={kind === k.value}
                onPress={() => setKind(k.value)}
              />
            ))}
          </View>
        </View>

        {(result?.clinicName || result?.documentDate || showInvoiceFields) && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Clinic / issuer" value={clinicName} onChangeText={setClinicName} />
            </View>
            {showInvoiceFields ? (
              <View style={{ flex: 1 }}>
                <FormField label="Total" value={invoiceTotal} onChangeText={setInvoiceTotal} placeholder="$0.00" />
              </View>
            ) : null}
          </View>
        )}

        {/* Vaccines administered: always renderable so user can add rows
            even when OCR found none. */}
        <Section
          icon="shield-checkmark-outline"
          title="Vaccines administered"
          count={given.length}
          tint={colors.success}
        >
          {given.length === 0 ? (
            <Text style={styles.sectionEmpty}>No vaccines detected. Add any that were given.</Text>
          ) : null}
          {given.map((v, idx) => (
            <ToggleRow
              key={`given-${idx}`}
              title={v.name}
              subtitle={`Given ${fmtDate(v.dateGiven)}${v.lotNumber ? ` · Lot ${v.lotNumber}` : ''}`}
              selected={v.selected}
              onToggle={() =>
                setGiven(prev => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))
              }
              onDelete={() =>
                setGiven(prev => prev.filter((_, i) => i !== idx))
              }
              tint={colors.success}
              duplicate={duplicates.givenDup.has(idx)}
            />
          ))}
          <AddRow
            tint={colors.success}
            placeholder="Vaccine name (e.g. Lepto)"
            defaultDate={result?.documentDate ? (toDate(result.documentDate) ?? new Date()) : new Date()}
            dateLabel="Date given"
            onAdd={(name, date) =>
              setGiven(prev => [
                ...prev,
                { name, dateGiven: date.toISOString(), lotNumber: null, selected: true },
              ])
            }
          />
        </Section>

        {/* Reminders to schedule, same pattern */}
        <Section
          icon="alarm-outline"
          title="Reminders to schedule"
          count={dues.length}
          tint={colors.primary}
        >
          {dues.length === 0 ? (
            <Text style={styles.sectionEmpty}>No upcoming due dates detected. Add any you want to be reminded about.</Text>
          ) : null}
          {dues.map((d, idx) => (
            <ToggleRow
              key={`due-${idx}`}
              title={d.name}
              subtitle={`Due ${fmtDate(d.dueDate)} · alert 14 days before`}
              selected={d.selected}
              onToggle={() =>
                setDues(prev => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))
              }
              onDelete={() =>
                setDues(prev => prev.filter((_, i) => i !== idx))
              }
              tint={colors.primary}
              duplicate={duplicates.dueDup.has(idx)}
            />
          ))}
          <AddRow
            tint={colors.primary}
            placeholder="Vaccine name (e.g. Rabies)"
            // Default to one year from the document date, since most vaccines are
            // annual, so this is a useful starting point the user can tweak.
            defaultDate={(() => {
              const base = result?.documentDate ? toDate(result.documentDate) ?? new Date() : new Date();
              const oneYearOut = new Date(base);
              oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
              return oneYearOut;
            })()}
            dateLabel="Due date"
            onAdd={(name, date) =>
              setDues(prev => [
                ...prev,
                { name, dueDate: date.toISOString(), selected: true },
              ])
            }
          />
        </Section>

        {detectedDetailRows.length > 0 && (
          <Section
            icon="paw-outline"
            title="Update pet details"
            count={detectedDetailRows.length}
            tint={colors.warning}
          >
            {detectedDetailRows.map(row => {
              const selected = !excludedDetails.has(row.key);
              return (
                <ToggleRow
                  key={`detail-${row.key}`}
                  title={row.label}
                  subtitle={`${row.from} → ${row.to}`}
                  selected={selected}
                  onToggle={() =>
                    setExcludedDetails(prev => {
                      const next = new Set(prev);
                      if (next.has(row.key)) next.delete(row.key);
                      else next.add(row.key);
                      return next;
                    })
                  }
                  tint={colors.warning}
                />
              );
            })}
          </Section>
        )}

        {result?.notes ? (
          <View style={styles.notesCard}>
            <Text style={styles.notesLabel}>Other notes from the document</Text>
            <Text style={styles.notesText}>{result.notes}</Text>
          </View>
        ) : null}

        {hasActionable ? (
          <View style={styles.summary}>
            <SummaryStat label="Document" value="1" />
            <SummaryStat label="Vaccines" value={String(selectedGiven.length)} />
            <SummaryStat label="Reminders" value={String(selectedDues.length)} />
          </View>
        ) : null}

        <PrimaryButton
          title={hasActionable ? 'Save document & records' : 'Save document'}
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

function normalizeIso(value: string, timeSuffix: string): string {
  // Add a sensible TOD if Gemini gave us a date-only string.
  if (value.length === 10) return value + timeSuffix;
  return value;
}

function detectionLabel(t: DetectedDocumentType | undefined): string {
  switch (t) {
    case 'vaccine_certificate': return 'a vaccine certificate';
    case 'vet_invoice': return 'a vet invoice';
    case 'vet_record': return 'a vet record';
    case 'insurance': return 'an insurance document';
    case 'other':
    default: return 'a pet document';
  }
}

function Section({ icon, title, count, tint, children }: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  title: string;
  count: number;
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
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function ToggleRow({ title, subtitle, selected, onToggle, onDelete, tint, duplicate }: {
  title: string; subtitle: string; selected: boolean; onToggle: () => void;
  onDelete?: () => void; tint: string;
  duplicate?: boolean;
}) {
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={
        onDelete
          ? () => Alert.alert('Remove this row?', title, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: onDelete },
            ])
          : undefined
      }
      style={({ pressed }) => [
        styles.toggleRow,
        selected && { borderColor: tint, backgroundColor: tint + '0F' },
        duplicate && !selected && styles.toggleRowDup,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.checkbox, selected && { backgroundColor: tint, borderColor: tint }]}>
        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.toggleTitleRow}>
          <Text style={styles.toggleTitle}>{title}</Text>
          {duplicate ? (
            <View style={styles.dupBadge}>
              <Ionicons name="alert-circle" size={11} color="#92400e" />
              <Text style={styles.dupBadgeText}>Already on file</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

function AddRow({ tint, placeholder, defaultDate, dateLabel, onAdd }: {
  tint: string;
  placeholder: string;
  defaultDate: Date;
  dateLabel: string;
  onAdd: (name: string, date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date>(defaultDate);

  if (!open) {
    return (
      <Pressable
        onPress={() => { setDate(defaultDate); setOpen(true); }}
        style={({ pressed }) => [styles.addBtn, { borderColor: tint }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={18} color={tint} />
        <Text style={[styles.addBtnText, { color: tint }]}>Add another</Text>
      </Pressable>
    );
  }

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), date);
    setName('');
    setOpen(false);
  };

  return (
    <View style={[styles.addForm, { borderColor: tint }]}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
        style={styles.input}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <DateField label={dateLabel} value={date} onChange={d => d && setDate(d)} />
      <View style={styles.addActions}>
        <Pressable
          onPress={() => { setOpen(false); setName(''); }}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={!name.trim()}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: tint },
            (!name.trim() || pressed) && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
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
    flexGrow: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.lg, backgroundColor: colors.bg, gap: 6,
  },
  // One-time trial banner on the capture stage, appears only while the
  // free Smart Scan trial is still available, so users know they're
  // about to sample a Plus feature instead of being surprised by a
  // paywall on attempt two.
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '33',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    maxWidth: 340,
  },
  trialBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    lineHeight: 18,
  },
  petPickerWrap: {
    width: '100%',
    maxWidth: 420,
    marginBottom: spacing.lg,
  },
  captureIcon: {
    width: 72, height: 72, borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  preview: { width: '90%', aspectRatio: 3 / 4, borderRadius: radius.lg, backgroundColor: colors.cardSubtle },
  pdfPreview: { alignItems: 'center', justifyContent: 'center' },

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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  section: { gap: spacing.sm, marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  sectionCount: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

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
  toggleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  toggleSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  toggleRowDup: {
    backgroundColor: colors.warningSoft + '66',
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  dupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dupBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400e', letterSpacing: 0.3 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addBtnText: { fontSize: 14, fontWeight: '600' },

  addForm: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cancelBtn: { paddingHorizontal: spacing.md, paddingVertical: 10 },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  confirmBtnText: { color: '#fff', fontWeight: '600' },

  sectionEmpty: {
    fontSize: 13,
    color: colors.textFaint,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  notesCard: {
    backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.lg, gap: 6,
  },
  notesLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase' },
  notesText: { fontSize: 13, color: colors.text, lineHeight: 18 },

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
