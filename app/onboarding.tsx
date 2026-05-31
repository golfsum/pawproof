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

type Step = 'count' | 'pet' | 'interests' | 'reminders' | 'scan';
const STEP_ORDER: Step[] = ['count', 'pet', 'interests', 'reminders', 'scan'];

// Free tier covers up to 2 pets. The count step lets the user say how many
// they have; we onboard up to this many and nudge Plus for larger households.
const FREE_PET_LIMIT = 2;

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

  const [step, setStep] = useState<Step>('count');

  // Step "count" — how many pets the household has. `petGoal` is how many
  // we'll onboard now (capped at FREE_PET_LIMIT); `hasMorePets` flags the
  // 3+ case so we can show a Plus nudge at the end.
  const [petGoal, setPetGoal] = useState(1);
  const [hasMorePets, setHasMorePets] = useState(false);
  // How many pets the user has actually saved so far in this flow.
  const [petsSaved, setPetsSaved] = useState(0);

  // Step "pet" — the add-pet form (reused for each pet in the loop).
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('dog');
  const [breed, setBreed] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [savingPet, setSavingPet] = useState(false);
  const [createdPetId, setCreatedPetId] = useState<string | null>(null);

  // Reset the pet form so the next pet in the loop starts blank.
  const resetPetForm = () => {
    setPhotoUri(null);
    setName('');
    setSpecies('dog');
    setBreed('');
    setBirthday(null);
  };

  // Step 2 — interests
  const [interests, setInterests] = useState<Set<string>>(new Set());

  // Step 3 — reminders
  const [selectedReminders, setSelectedReminders] = useState<Set<string>>(new Set());
  const [savingReminders, setSavingReminders] = useState(false);

  // Step 4 — scan prompt has no state; choice is "Scan" or "Later".
  const [finishing, setFinishing] = useState(false);

  const finish = (extra?: { goScan?: boolean }) => {
    // Navigate immediately. Persisting the onboardingCompleted flag must
    // NEVER block leaving onboarding — if Firestore is slow or unreachable,
    // awaiting the write would trap the user on this screen (this is why the
    // Skip button looked dead). Fire it in the background; if it fails, the
    // gate simply re-shows onboarding on a later launch once writes succeed.
    if (user) {
      markOnboardingComplete(user.uid, Array.from(interests)).catch(err => {
        console.warn('[onboarding] markOnboardingComplete failed (will retry next launch)', err);
      });
    }
    if (extra?.goScan) {
      router.replace('/document/scan');
    } else {
      router.replace('/(tabs)');
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
      const savedNow = petsSaved + 1;
      setPetsSaved(savedNow);
      // If the household has more pets to add (and we're under the free
      // cap), loop back to a blank pet form. Otherwise move on to interests.
      if (savedNow < petGoal) {
        resetPetForm();
        // stay on the 'pet' step for the next pet
      } else {
        setStep('interests');
      }
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSavingPet(false);
    }
  };

  const saveReminders = async () => {
    if (!user || !createdPetId) {
      setStep('scan');
      return;
    }
    if (selectedReminders.size === 0) {
      setStep('scan');
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
      setStep('scan');
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
          {STEP_ORDER.map((s, i) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                i <= STEP_ORDER.indexOf(step) ? { backgroundColor: colors.primary } : null,
              ]}
            />
          ))}
        </View>
        <Pressable onPress={skipAll} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 'count' ? (
            <>
              <Header
                icon="paw"
                title="How many pets do you have?"
                body="We'll set up a profile for each one. You can always add or remove pets later."
              />
              <View style={styles.countRow}>
                {[1, 2].map(n => (
                  <Pressable
                    key={n}
                    onPress={() => { setPetGoal(n); setHasMorePets(false); }}
                    style={({ pressed }) => [
                      styles.countTile,
                      petGoal === n && !hasMorePets && styles.countTileOn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Text style={[styles.countNum, petGoal === n && !hasMorePets && styles.countNumOn]}>{n}</Text>
                    <Text style={[styles.countLabel, petGoal === n && !hasMorePets && styles.countLabelOn]}>
                      {n === 1 ? 'pet' : 'pets'}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => { setPetGoal(FREE_PET_LIMIT); setHasMorePets(true); }}
                  style={({ pressed }) => [
                    styles.countTile,
                    hasMorePets && styles.countTileOn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.countNum, hasMorePets && styles.countNumOn]}>3+</Text>
                  <Text style={[styles.countLabel, hasMorePets && styles.countLabelOn]}>pets</Text>
                </Pressable>
              </View>
              {hasMorePets ? (
                <Text style={styles.countNote}>
                  The free plan covers {FREE_PET_LIMIT} pets. Add your first {FREE_PET_LIMIT} now and
                  unlock the rest with PawProof Plus anytime.
                </Text>
              ) : null}
              <PrimaryButton
                title="Continue"
                onPress={() => setStep('pet')}
                icon="arrow-forward-outline"
              />
            </>
          ) : null}

          {step === 'pet' ? (
            <>
              <Header
                icon="paw"
                title={
                  petGoal > 1
                    ? `Add pet ${petsSaved + 1} of ${petGoal}`
                    : 'Add your first pet'
                }
                body="Just the basics for now. You can add more details later in their profile."
              />
              <View style={styles.formCard}>
                <PhotoPicker value={photoUri} onChange={setPhotoUri} />
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

          {step === 'interests' ? (
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
                onPress={() => setStep('reminders')}
                icon="arrow-forward-outline"
              />
              <Pressable onPress={() => setStep('reminders')} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Skip this step</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'reminders' ? (
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
              <Pressable onPress={() => setStep('scan')} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Skip this step</Text>
              </Pressable>
            </>
          ) : null}

          {step === 'scan' ? (
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

  // "How many pets" count picker.
  countRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  countTile: {
    flex: 1,
    maxWidth: 110,
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  countTileOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  countNum: { fontSize: 32, fontFamily: fonts.display.bold, color: colors.text },
  countNumOn: { color: colors.primary },
  countLabel: { fontSize: 13, color: colors.textMuted },
  countLabelOn: { color: colors.primary },
  countNote: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },

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
