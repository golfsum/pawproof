import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Chip } from '@/components/Chip';
import { DateField } from '@/components/DateField';
import { PetPicker } from '@/components/PetPicker';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { createReminder } from '@/lib/firestore';
import { scheduleReminder } from '@/lib/notifications';
import { colors, spacing } from '@/theme';
import { REMINDER_META } from '@/utils/petIcon';
import type { ReminderType, RepeatType } from '@/types/models';

const REMINDER_TYPES: ReminderType[] = [
  'feeding', 'medication', 'walking', 'vet_visit', 'vaccination',
  'grooming', 'flea_tick', 'heartworm', 'nail_trim', 'custom',
];

const ALL_REPEAT_OPTIONS: { label: string; value: RepeatType }[] = [
  { label: 'One time', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom', value: 'custom_days' },
];

/** Which repeat chips to show for each reminder type. Tailoring the option
 *  set keeps the form focused: a vaccine reminder doesn't need a "Daily"
 *  chip, and a feeding reminder doesn't need "Yearly". */
const REPEAT_OPTIONS_BY_TYPE: Record<ReminderType, RepeatType[]> = {
  feeding:     ['daily', 'weekly', 'custom_days'],
  walking:     ['daily', 'weekly', 'custom_days'],
  medication:  ['daily', 'weekly', 'monthly', 'custom_days'],
  vet_visit:   ['none', 'yearly'],
  vaccination: ['none', 'yearly', 'custom_days'],   // none = one-time renewal
  grooming:    ['monthly', 'weekly', 'custom_days'],
  flea_tick:   ['monthly'],
  heartworm:   ['monthly', 'yearly'],
  nail_trim:   ['weekly', 'monthly', 'custom_days'],
  custom:      ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom_days'],
};

/** Sensible default repeat for each reminder type. */
const DEFAULT_REPEAT_BY_TYPE: Record<ReminderType, RepeatType> = {
  feeding: 'daily',
  walking: 'daily',
  medication: 'daily',
  vet_visit: 'none',
  vaccination: 'none',
  grooming: 'monthly',
  flea_tick: 'monthly',
  heartworm: 'monthly',
  nail_trim: 'monthly',
  custom: 'none',
};

/** Per-type placeholder for the Title field. */
const TITLE_PLACEHOLDER_BY_TYPE: Record<ReminderType, string> = {
  feeding: 'e.g. Breakfast',
  walking: 'e.g. Morning walk',
  medication: 'e.g. Apoquel',
  vet_visit: 'e.g. Annual checkup',
  vaccination: 'e.g. Rabies vaccine',
  grooming: 'e.g. Bath & nails',
  flea_tick: 'e.g. NexGard',
  heartworm: 'e.g. Heartgard',
  nail_trim: 'e.g. Nail trim',
  custom: 'Name this reminder',
};

export default function AddReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ petId?: string }>();
  const { user } = useAuth();
  const { pets } = useData();
  const { check, isPremium } = useGate();

  const [petId, setPetId] = useState<string | null>(params.petId ?? pets[0]?.id ?? null);
  const [type, setType] = useState<ReminderType>('feeding');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000));
  const [repeat, setRepeat] = useState<RepeatType>(DEFAULT_REPEAT_BY_TYPE.feeding);
  const [repeatInterval, setRepeatInterval] = useState('3');
  const [saving, setSaving] = useState(false);

  const titleHint = useMemo(() => (REMINDER_META[type]?.label ?? 'Reminder'), [type]);
  const titlePlaceholder = TITLE_PLACEHOLDER_BY_TYPE[type] ?? `e.g. ${titleHint}`;

  // Only show the repeat chips that make sense for this type.
  const repeatOptions = useMemo(
    () => ALL_REPEAT_OPTIONS.filter(o => REPEAT_OPTIONS_BY_TYPE[type].includes(o.value)),
    [type],
  );

  // When the user changes type, snap repeat to the type's default — unless
  // they already manually picked a value that's still valid for the new type.
  const userTouchedRepeat = useRef(false);
  useEffect(() => {
    const allowed = REPEAT_OPTIONS_BY_TYPE[type];
    if (!allowed.includes(repeat)) {
      setRepeat(DEFAULT_REPEAT_BY_TYPE[type]);
      userTouchedRepeat.current = false;
    } else if (!userTouchedRepeat.current) {
      setRepeat(DEFAULT_REPEAT_BY_TYPE[type]);
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!user || !petId) {
      Alert.alert('Pick a pet', 'Choose which pet this reminder is for.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', `Name this reminder — e.g. "${titleHint}".`);
      return;
    }
    if (repeat === 'custom_days' && !isPremium) {
      if (!check('advanced_recurring')) return;
    }

    setSaving(true);
    try {
      const notifId = await scheduleReminder(title.trim(), notes.trim() || titleHint, dueDate);
      await createReminder(user.uid, {
        petId,
        type,
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate: dueDate.toISOString(),
        repeatType: repeat,
        repeatInterval: repeat === 'custom_days' ? Math.max(1, Number(repeatInterval) || 1) : null,
        isCompleted: false,
        nextDueDate: dueDate.toISOString(),
        notificationId: notifId,
      });
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
      <Stack.Screen options={{ title: 'New reminder' }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PetPicker pets={pets} selectedId={petId} onSelect={setPetId} />

        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {REMINDER_TYPES.map(t => (
              <Chip
                key={t}
                label={REMINDER_META[t].label}
                icon={REMINDER_META[t].icon as any}
                selected={type === t}
                onPress={() => setType(t)}
              />
            ))}
          </View>
        </View>

        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          required
          placeholder={titlePlaceholder}
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

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginLeft: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
