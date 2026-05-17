import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from './DateField';
import { PetAvatar } from './PetAvatar';
import { PrimaryButton } from './PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { usePet } from '@/hooks/useData';
import {
  cancelReminder,
  scheduleVaccineExpirationReminder,
} from '@/lib/notifications';
import {
  createReminder,
  createVaccine,
  updateReminder,
} from '@/lib/firestore';
import { canonicalizeVaccineName } from '@/utils/vaccineNames';
import { deriveExpiration } from '@/utils/vaccineSchedules';
import { fmtDate } from '@/utils/dates';
import { colors, fonts, radius, spacing } from '@/theme';

// Shared "mark a vaccine as administered" bottom sheet. Used from
// Records, Reminders, and Home's Needs Attention so all three surface
// the same flow:
//   1. Pick the date the vaccine was actually given (defaults today,
//      but supports back-dating for vets that took a week to update).
//   2. Optional clinic name + notes.
//   3. Save creates a VaccineRecord, derives the next expiration from
//      the vaccine schedule library, schedules a renewal reminder, and
//      (if launched from a vaccine reminder) marks that reminder done.
//
// Doesn't try to be a full Edit Vaccine form — there's a dedicated
// route for that. Keeps the surface tight enough to ship from anywhere
// the user encounters an expiring vaccine.

interface Props {
  visible: boolean;
  onClose: () => void;
  petId: string;
  // Pre-fill the vaccine name. Required: we don't show a vaccine
  // picker here on purpose; the calling card always knows the name.
  vaccineName: string;
  // If we're marking a reminder done, pass its ID + notificationId so
  // we can retire it after creating the vaccine record. When omitted,
  // we just create the record without touching reminders.
  reminderId?: string | null;
  reminderNotificationId?: string | null;
  // Fires after save completes. Caller can use this to show a toast
  // or refresh local UI; defaults to a no-op.
  onCompleted?: (info: { dateGiven: string; nextDue: string | null }) => void;
}

export function MarkVaccineDoneSheet({
  visible,
  onClose,
  petId,
  vaccineName,
  reminderId,
  reminderNotificationId,
  onCompleted,
}: Props) {
  const { user, profile } = useAuth();
  const pet = usePet(petId);
  const warnDays = profile?.notificationPrefs?.vaccineWarnDays ?? 14;

  const [date, setDate] = useState<Date | null>(new Date());
  const [clinic, setClinic] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state every time the sheet opens. Without this, a second
  // open after a successful save would still hold stale clinic/notes
  // from the prior vaccine.
  useEffect(() => {
    if (visible) {
      setDate(new Date());
      setClinic('');
      setNotes('');
    }
  }, [visible]);

  const canonical = canonicalizeVaccineName(vaccineName);

  const handleSave = async () => {
    if (!user || !date) return;
    setSaving(true);
    try {
      const dateGiven = date.toISOString();
      const nextDue = deriveExpiration(canonical, dateGiven, pet);

      // Record the dose.
      await createVaccine(user.uid, {
        petId,
        vaccineName: canonical,
        dateGiven,
        expirationDate: nextDue,
        clinicName: clinic.trim() || undefined,
        notes: notes.trim() || undefined,
        isCompleted: true,
        expirationDerived: !!nextDue,
        source: reminderId ? 'reminder' : 'manual',
      });

      // Schedule next renewal reminder if we can compute one.
      if (nextDue) {
        const dueAt = new Date(nextDue);
        try {
          const notifId = await scheduleVaccineExpirationReminder({
            pet: pet ?? null,
            vaccineName: canonical,
            expiresAt: dueAt,
            daysBefore: warnDays,
          });
          await createReminder(user.uid, {
            petId,
            type: 'vaccination',
            title: `${canonical} vaccine`,
            notes: 'Auto-scheduled after marking the previous dose complete.',
            dueDate: dueAt.toISOString(),
            repeatType: 'none',
            repeatInterval: null,
            isCompleted: false,
            nextDueDate: dueAt.toISOString(),
            notificationId: notifId,
          });
        } catch {
          // Notification scheduling can fail (permission denied,
          // simulator) — the vaccine row is still saved.
        }
      }

      // Retire the source reminder if launched from one.
      if (reminderId) {
        try {
          await cancelReminder(reminderNotificationId ?? null);
          await updateReminder(user.uid, reminderId, {
            isCompleted: true,
            lastCompletedAt: dateGiven,
            notificationId: null,
          });
        } catch {
          // Best-effort. The vaccine row matters more than retiring
          // the reminder cleanly.
        }
      }

      onCompleted?.({ dateGiven, nextDue });
      onClose();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Mark vaccine done</Text>
              <Text style={styles.subtitle}>{canonical}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ gap: spacing.base, paddingBottom: spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            {pet ? (
              <View style={styles.petRow}>
                <PetAvatar pet={pet} size={32} />
                <Text style={styles.petName}>{pet.name}</Text>
              </View>
            ) : null}

            <DateField
              label="Date given"
              value={date}
              onChange={setDate}
              maximumDate={new Date()}
            />

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Clinic (optional)</Text>
              <TextInput
                value={clinic}
                onChangeText={setClinic}
                placeholder="e.g. Bay Area Pet Hospital"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything you want to remember"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
                multiline
              />
            </View>

            <View style={styles.scheduleHint}>
              <Ionicons name="alarm-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.scheduleHintText}>
                We'll auto-schedule the next renewal based on the typical
                schedule for {canonical}. Verify with your vet.
              </Text>
            </View>

            <PrimaryButton
              title={date ? `Save · Given ${fmtDate(date.toISOString())}` : 'Save'}
              onPress={handleSave}
              loading={saving}
              disabled={!date}
              icon="checkmark-outline"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontFamily: fonts.display.bold, color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  close: { padding: 4 },

  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  petName: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },

  label: { fontSize: 13, fontFamily: fonts.body.semibold, color: colors.textMuted },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },

  scheduleHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
  },
  scheduleHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 17,
  },
});
