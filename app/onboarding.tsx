import React, { useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { PhotoPicker } from '@/components/PhotoPicker';
import { DateField } from '@/components/DateField';
import { useAuth } from '@/hooks/AuthProvider';
import { useGate } from '@/hooks/useGate';
import { createPet, createReminder, markOnboardingComplete } from '@/lib/firestore';
import { scheduleReminderForPet } from '@/lib/notifications';
import { uploadCompressedPhoto } from '@/lib/storage';
import { SPECIES_LABEL } from '@/utils/petIcon';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { ReminderType, Species } from '@/types/models';

// 4-step onboarding wizard. Fires only for users with
// onboardingCompleted !== true. Each step writes its own piece so a
// user who bails midway still leaves a real pet behind.

type Step = 1 | 2 | 3 | 4;

const SPECIES_OPTIONS: Species[] = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'fish', 'small_mammal', 'other'];

const INTERESTS: { id: string; label: string }[] = [
  { id: 'meals', label: 'Meals' },
  { id: 'walks', label: 'Walks' },
  { id: 'medication', label: 'Medication' },
  { id: 'vaccines', label: 'Vaccines' },
  { id: 'grooming', label: 'Grooming' },
  { id: 'training', label: 'Training' },
  { id: 'vet_visits', label: 'Vet visits' },
  { id: 'documents', label: 'Documents' },
];

interface ReminderSuggestion {
  id: string;
  label: string;
  type: ReminderType;
  // Offset from "next 7am" in days, so the suggestion fires tomorrow.
  // null = pick a friendly slot ourselves.
  hourOfDay?: number;
  repeatType?: 'daily' | 'monthly' | 'yearly';
}

const REMINDER_SUGGESTIONS: ReminderSuggestion[] = [
  { id: 'walk_morning', label: 'Morning walk', type: 'feeding', hourOfDay: 7, repeatType: 'daily' },
  { id: 'dinner', label: 'Dinner', type: 'feeding', hourOfDay: 18, repeatType: 'daily' },
  { id: 'flea_month', label: 'Monthly flea medication', type: 'medication', hourOfDay: 9, repeatType: 'monthly' },
  { id: 'rabies_year', label: 'Annual rabies vaccine', type: 'vaccination', hourOfDay: 9, repeatType: 'yearly' },
  { id: 'grooming', label: 'Grooming', type: 'grooming', hourOfDay: 10, repeatType: 'monthly' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { check } = useGate();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — first pet
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('dog');
  const [breed, setBreed] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [savingPet, setSavingPet] = useState(false);
  const [createdPetId, setCreatedPetId] = useState<string | null>(null);

  // Step 2 — interests
  const [interests, setInterests] = useState<Set<string>>(new Set());

  // Step 3 — reminders
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [savingReminders, setSavingReminders] = useState(false);

  // Step 4 — scan prompt has no state; choice is "Scan" or "Later".
  const [finishing, setFinishing] = useState(false);

  const finish = async (extra?: { goScan?: boolean }) => {
    if (!user) return;
    setFinishing(true);
    try {
      await markOnboardingComplete(user.uid, Array.from(interests));
      if (extra?.goScan) {
        router.replace('/document/scan');
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setFinishing(false);
    }
  };

  const skipAll = () => {
    Alert.alert(
      'Skip setup?',
      'You can always add pets and reminders from the app later.',
      [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: () => void finish() },
      ],
    );
  };

  const savePet = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your pet a name to continue.');
      return;
    }
    setSavingPet(true);
    try {
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadCompressedPhoto(user.uid, photoUri, 'pets');
      }
      const id = await createPet(user.uid, {
        name: name.trim(),
        species,
        breed: breed.trim() || undefined,
        birthday: birthday ? birthday.toISOString() : null,
        approxAgeMonths: null,
        weightKg: null,
        photoUrl,
      });
      setCreatedPetId(id);
      setStep(2);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSavingPet(false);
    }
  };

  const saveReminders = async () => {
    if (!user || !createdPetId) {
      setStep(4);
      return;
    }
    if (selectedReminders.size === 0) {
      setStep(4);
      return;
    }
    setSavingReminders(true);
    try {
      for (const id of selectedReminders) {
        const sug = REMINDER_SUGGESTIONS.find(r => r.id === id);
        if (!sug) continue;
        const when = nextOccurrence(sug.hourOfDay ?? 9, sug.repeatType ?? 'daily');
        const notifId = await scheduleReminderForPet({
          pet: { name: name.trim() },
          reminderType: sug.type,
          reminderTitle: sug.label,
          when,
        });
        await createReminder(user.uid, {
          petId: createdPetId,
          type: sug.type,
          title: sug.label,
          notes: undefined,
          dueDate: when.toISOString(),
          repeatType: sug.repeatType ?? 'none',
          repeatInterval: null,
          isCompleted: false,
          nextDueDate: when.toISOString(),
          notificationId: notifId,
        });
      }
      setStep(4);
    } catch (e: any) {
      Alert.alert('Could not save reminders', e?.message ?? 'Try again.');
    } finally {
      setSavingReminders(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        <View style={styles.steps}>
          {[1, 2, 3, 4].map(n => (
            <View
              key={n}
              style={[styles.stepDot, step >= n ? { backgroundColor: colors.primary } : null]}
            />
          ))}
        </View>
        <Pressable onPress={skipAll} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <Header
                icon="paw"
                title="Add your first pet"
                body="Just the basics for now. You can add more details later in their profile."
              />
              <View style={styles.formCard}>
                <PhotoPicker uri={photoUri} onChange={setPhotoUri} />
                <Field label="Name">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Yahzi"
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                  />
                </Field>
                <Field label="Species">
                  <View style={styles.chipRow}>
                    {SPECIES_OPTIONS.map(s => (
                      <Chip
                        key={s}
                        label={SPECIES_LABEL[s]}
                        selected={species === s}
                        onPress={() => setSpecies(s)}
                      />
                    ))}
                  </View>
                </Field>
                <Field label="Breed (optional)">
                  <TextInput
                    value={breed}
                    onChangeText={setBreed}
                    placeholder="e.g. Golden retriever"
                    placeholderTextColor={colors.textFaint}
                    style={styles.input}
                  />
                </Field>
                <Field label="Birthday (optional)">
                  <DateField value={birthday} onChange={setBirthday} placeholder="Tap to pick" />
                </Field>
              </View>
              <PrimaryButton
                title="Continue"
                onPress={savePet}
                loading={savingPet}
                disabled={!name.trim()}
                icon="arrow-forward-outline"
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Header
                icon="checkmark-done-outline"
                title="What do you want to track?"
                body="We'll tune the Quick Log and reminder suggestions based on this. Pick as many as you like."
              />
              <View style={styles.chipGrid}>
                {INTERESTS.map(i => (
                  <Chip
                    key={i.id}
                    label={i.label}
                    selected={interests.has(i.id)}
                    onPress={() =>
                      setInterests(prev => {
                        const next = new Set(prev);
                        if (next.has(i.id)) next.delete(i.id);
                        else next.add(i.id);
                        return next;
                      })
                    }
                  />
                ))}
              </View>
              <PrimaryButton
                title="Continue"
                onPress={() => setStep(3)}
                icon="arrow-forward-outline"
              />
              <Pressable onPress={() => setStep(3)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Skip this step</Text>
              </Pressable>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Header
                icon="alarm-outline"
                title="Want PawProof to remind you?"
                body="Pick any to add to your reminders. We'll schedule them starting tomorrow and you can edit anytime."
              />
              <View style={{ gap: spacing.sm }}>
                {REMINDER_SUGGESTIONS.map(r => {
                  const selected = selectedReminders.has(r.id);
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() =>
                        setSelectedReminders(prev => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                      style={({ pressed }) => [
                        styles.suggestionRow,
                        selected && styles.suggestionRowSelected,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <View style={[styles.suggestionCheck, selected && styles.suggestionCheckOn]}>
                        {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{r.label}</Text>
                        <Text style={styles.suggestionSub}>{prettyRepeat(r.repeatType)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <PrimaryButton
                title="Continue"
                onPress={saveReminders}
                loading={savingReminders}
                icon="arrow-forward-outline"
              />
              <Pressable onPress={() => setStep(4)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Skip this step</Text>
              </Pressable>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Header
                icon="scan-outline"
                title="Have a vaccine record?"
                body="Try Smart Scan free. We'll read the vaccine names, dates, clinic, and expiration info so you don't have to type."
              />
              <View style={styles.scanBenefits}>
                <Benefit icon="flash-outline" text="Seconds, not minutes" />
                <Benefit icon="shield-checkmark-outline" text="Adds reminders for renewals" />
                <Benefit icon="pricetag-outline" text="First scan free, no card required" />
              </View>
              <PrimaryButton
                title="Scan my first record"
                onPress={() => void finish({ goScan: true })}
                loading={finishing}
                icon="scan-outline"
              />
              <Pressable onPress={() => void finish()} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>I'll do this later</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// Next occurrence of `hour` for daily/monthly/yearly. For daily, we
// roll to tomorrow if the hour today has already passed, so the user
// gets at least one full cycle before the first firing.
function nextOccurrence(hour: number, repeat: 'daily' | 'monthly' | 'yearly'): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  if (repeat === 'daily') {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (repeat === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

function prettyRepeat(r?: 'daily' | 'monthly' | 'yearly'): string {
  if (r === 'daily') return 'Every day';
  if (r === 'monthly') return 'Every month';
  if (r === 'yearly') return 'Every year';
  return 'One-time';
}

function Header({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[typography.h1, { textAlign: 'center', marginTop: spacing.md }]}>{title}</Text>
      <Text style={styles.headerBody}>{body}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Benefit({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  steps: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  skipText: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted },

  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },

  headerWrap: { alignItems: 'center', marginBottom: spacing.md, gap: 4 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
    marginTop: 4,
  },

  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  fieldLabel: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },

  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  suggestionRowSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  suggestionCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  suggestionCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  suggestionTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  suggestionSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  scanBenefits: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.sm,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { fontSize: 14, color: colors.text, flex: 1 },

  secondaryBtn: { alignItems: 'center', padding: spacing.md },
  secondaryText: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.textMuted },
});
