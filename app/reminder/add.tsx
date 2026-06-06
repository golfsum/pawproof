import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { MultiPetPicker } from '@/components/MultiPetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { createReminder } from '@/lib/firestore';
import {
  scheduleGroupedReminder,
  scheduleReminderForPet,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications';
import { shouldNudgeNotifOnReminder } from '@/lib/appPrompts';
import { colors, spacing } from '@/theme';
import {
  REMINDER_CATEGORY_CONFIG,
  DEFAULT_REPEAT_BY_CATEGORY,
  categoryToLegacyType,
  getReminderDefaultName,
  getReminderNamePlaceholder,
  type ReminderCategory,
} from '@/utils/reminderCategory';
import { newReminderGroupId } from '@/utils/reminderGroups';
import type { RepeatType } from '@/types/models';

// Visible order for the Category chip row. Feeding leads because it's
// the most common entry point (set up "Dinner" first thing after
// adding a pet), then walks, then meds, then everything else.
const CATEGORY_ORDER: ReminderCategory[] = [
  'feeding',
  'walk',
  'medication',
  'vet_visit',
  'vaccination',
  'grooming',
  'flea_tick',
  'heartworm',
  'nail_trim',
  'general',
];

const ALL_REPEAT_OPTIONS: { label: string; value: RepeatType }[] = [
  { label: 'One time', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom_days' },
];

/** Which repeat chips to show for each category. Tailoring the option
 *  set keeps the form focused: a vaccine reminder doesn't need a "Daily"
 *  chip, and a feeding reminder doesn't need "Yearly". */
const REPEAT_OPTIONS_BY_CATEGORY: Record<ReminderCategory, RepeatType[]> = {
  feeding:     ['daily', 'weekly', 'custom_days'],
  walk:        ['daily', 'weekly', 'custom_days'],
  medication:  ['daily', 'weekly', 'monthly', 'custom_days'],
  vet_visit:   ['none', 'yearly'],
  vaccination: ['none', 'yearly', 'custom_days'],
  grooming:    ['monthly', 'weekly', 'custom_days'],
  flea_tick:   ['monthly'],
  heartworm:   ['monthly', 'yearly'],
  nail_trim:   ['weekly', 'monthly', 'custom_days'],
  general:     ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom_days'],
};

export default function AddReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();
  const { check, isPremium } = useGate();

  // Multi-pet selection. Defaults to either the petId in the URL (when
  // launched from a specific pet profile) or the first pet. Multi-pet
  // households still start with single selection so the user makes a
  // conscious "everyone" decision; defaulting to all would create
  // unexpected duplicate reminders.
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(() => {
    if (params.petId) return new Set([params.petId]);
    if (pets.length === 1) return new Set([pets[0].id]);
    return new Set(pets[0] ? [pets[0].id] : []);
  });
  const [category, setCategory] = useState<ReminderCategory>('feeding');
  const [reminderName, setReminderName] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [repeat, setRepeat] = useState<RepeatType>(DEFAULT_REPEAT_BY_CATEGORY.feeding);
  const [repeatInterval, setRepeatInterval] = useState('3');
  const [saving, setSaving] = useState(false);

  // Track whether the user manually edited the repeat — if so we
  // don't snap it back to the category default when the category
  // changes. Same pattern as the name field below.
  const userTouchedRepeat = useRef(false);
  const userTouchedName = useRef(false);

  const config = REMINDER_CATEGORY_CONFIG[category];
  const namePlaceholder = useMemo(() => getReminderNamePlaceholder(category), [category]);
  const defaultName = useMemo(() => getReminderDefaultName(category), [category]);

  // Only show the repeat chips that make sense for this category.
  const repeatOptions = useMemo(
    () => ALL_REPEAT_OPTIONS.filter(o => REPEAT_OPTIONS_BY_CATEGORY[category].includes(o.value)),
    [category],
  );

  // When the user changes category, snap repeat to the category default
  // unless they've already manually edited it. If the previous repeat
  // isn't valid for the new category, force it back to the default
  // regardless so we never show a stale selection.
  useEffect(() => {
    const allowed = REPEAT_OPTIONS_BY_CATEGORY[category];
    if (!allowed.includes(repeat)) {
      setRepeat(DEFAULT_REPEAT_BY_CATEGORY[category]);
      userTouchedRepeat.current = false;
    } else if (!userTouchedRepeat.current) {
      setRepeat(DEFAULT_REPEAT_BY_CATEGORY[category]);
    }
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!user || selectedPetIds.size === 0) {
      Alert.alert('Pick a pet', 'Choose at least one pet for this reminder.');
      return;
    }
    if (repeat === 'custom_days' && !isPremium) {
      if (!check('advanced_recurring')) return;
    }

    // Name is optional — if the user didn't type one, use the category
    // default ("Walk reminder") so the lock screen has something to
    // show. Most users will type something, but the form shouldn't
    // block them on a field whose absence has a sensible fallback.
    const finalName = reminderName.trim() || defaultName;
    const legacyType = categoryToLegacyType(category);

    setSaving(true);
    try {
      const selectedPets = pets.filter(p => selectedPetIds.has(p.id));

      // One notification fires for the whole group when the user picks
      // multiple pets, matching the expected "Dinner is due for Moqui,
      // Yahzi, and Lovie" experience. Single-pet selection flows
      // through the per-pet helper for the standard body wording.
      let sharedNotifId: string | null = null;
      if (selectedPets.length === 1) {
        sharedNotifId = await scheduleReminderForPet({
          pet: selectedPets[0],
          reminderType: legacyType,
          reminderTitle: finalName,
          when: dueDate,
        });
      } else if (selectedPets.length > 1) {
        sharedNotifId = await scheduleGroupedReminder({
          petNames: selectedPets.map(p => p.name),
          reminderType: legacyType,
          reminderTitle: finalName,
          when: dueDate,
        });
      }

      // Each pet gets its own reminder doc. The shared `groupId`
      // (only set for 2+ pets) lets the UI collapse them into one row
      // and lets "Mark done" complete every pet in a single tap. The
      // notificationId is also shared so cancel-on-edit/delete reaches
      // every doc.
      //
      // We write BOTH the new canonical fields (`category`, `name`,
      // `groupId`) AND the legacy fields (`type`, `title`) so old
      // readers (the web dashboard, older app builds) keep working
      // without a migration.
      const groupId = selectedPets.length > 1 ? newReminderGroupId() : undefined;
      for (const pet of selectedPets) {
        await createReminder(user.uid, {
          petId: pet.id,
          type: legacyType,
          category,
          title: finalName,
          name: finalName,
          notes: notes.trim() || undefined,
          dueDate: dueDate.toISOString(),
          repeatType: repeat,
          repeatInterval: repeat === 'custom_days' ? Math.max(1, Number(repeatInterval) || 1) : null,
          isCompleted: false,
          nextDueDate: dueDate.toISOString(),
          notificationId: sharedNotifId,
          ...(groupId ? { groupId } : {}),
        });
      }
      router.back();
      // Gently nudge to enable notifications if they're off — reminders are
      // useless without them. Paced so it's occasional, not every save.
      void maybeNudgeNotifications();
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
      <Stack.Screen options={{ title: 'New reminder' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <MultiPetPicker
          pets={pets}
          selectedIds={selectedPetIds}
          onChange={setSelectedPetIds}
        />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORY_ORDER.map(c => {
              const cfg = REMINDER_CATEGORY_CONFIG[c];
              return (
                <Chip
                  key={c}
                  label={cfg.label}
                  icon={cfg.icon as any}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              );
            })}
          </View>
        </View>

        <FormField
          label="Reminder name"
          value={reminderName}
          onChangeText={(v: string) => {
            userTouchedName.current = true;
            setReminderName(v);
          }}
          placeholder={namePlaceholder}
          hint={
            !reminderName.trim()
              ? `Leave blank and we'll save it as "${defaultName}".`
              : undefined
          }
        />

        <DateField label="Date & time" value={dueDate} onChange={d => d && setDueDate(d)} mode="datetime" />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Repeat</Text>
          <View style={styles.chipRow}>
            {repeatOptions.map(o => (
              <Chip
                key={o.value}
                label={o.label}
                selected={repeat === o.value}
                onPress={() => { userTouchedRepeat.current = true; setRepeat(o.value); }}
              />
            ))}
          </View>
          {repeat === 'custom_days' && (
            <FormField
              label="Every N days"
              keyboardType="number-pad"
              value={repeatInterval}
              onChangeText={setRepeatInterval}
              hint={isPremium ? undefined : 'Advanced recurrence is a PawProof Plus feature.'}
            />
          )}
        </View>

        <FormField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <PrimaryButton title="Save reminder" onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Occasionally prompt to enable notifications after creating a reminder, but
// only when they're not already granted. Undetermined → native prompt;
// denied → offer to open Settings (iOS won't show the native prompt twice).
async function maybeNudgeNotifications(): Promise<void> {
  try {
    const status = await getNotificationPermission();
    if (status === 'granted') return;
    if (!(await shouldNudgeNotifOnReminder())) return;
    if (status === 'undetermined') {
      Alert.alert(
        'Turn on reminders?',
        'Allow notifications so PawProof can alert you when this and other care tasks are due.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Enable', onPress: () => { void requestNotificationPermission(); } },
        ],
      );
    } else {
      Alert.alert(
        'Reminders won’t alert you',
        'Notifications are turned off for PawProof, so your reminders won’t pop up. You can turn them on in Settings.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
        ],
      );
    }
  } catch {
    // pacing/permission errors are non-critical
  }
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
