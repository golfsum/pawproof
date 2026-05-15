import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { fmtRelative, isOverdue } from '@/utils/dates';
import { REMINDER_META } from '@/utils/petIcon';
import { describeRepeat } from '@/utils/recurrence';
import { canonicalizeReminderTitle } from '@/utils/vaccineNames';
import { fmtDate } from '@/utils/dates';
import { PetAvatar } from './PetAvatar';
import type { Pet, Reminder } from '@/types/models';

interface Props {
  reminder: Reminder;
  pet?: Pet;
  onMarkDone?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ReminderCard({ reminder, pet, onMarkDone, onPress, onLongPress }: Props) {
  const meta = REMINDER_META[reminder.type] ?? REMINDER_META.custom;
  const overdue = !reminder.isCompleted && isOverdue(reminder.dueDate);

  // Vaccine reminders aren't "tasks you complete today" — they're upcoming
  // renewals. A green checkmark next to one reads like "complete this
  // vaccine now," which is misleading. Show a chevron instead, and let the
  // user open the pet profile (or long-press to delete).
  const isInformational = reminder.type === 'vaccination';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.tint + '22' }]}>
        <Ionicons name={meta.icon as any} size={20} color={meta.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {/* Canonicalize "Rabbies vaccine" → "Rabies vaccine" at display
                time so historical typos render correctly without rewriting
                stored data. */}
            {reminder.type === 'vaccination'
              ? canonicalizeReminderTitle(reminder.title)
              : reminder.title}
          </Text>
          {overdue ? (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>{reminder.type === 'vaccination' ? 'EXPIRED' : 'OVERDUE'}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {pet ? <PetAvatar pet={pet} size={18} /> : null}
          <Text style={styles.metaText} numberOfLines={1}>
            {pet?.name ? `${pet.name} · ` : ''}
            {/* Vaccine reminders show only the date — the 9am time is an
                arbitrary scheduling artifact, not a meaningful detail. */}
            {reminder.type === 'vaccination'
              ? fmtDate(reminder.dueDate)
              : fmtRelative(reminder.dueDate)}
            {' · '}{describeRepeat(reminder)}
          </Text>
        </View>
      </View>
      {isInformational ? (
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </View>
      ) : onMarkDone ? (
        <Pressable
          onPress={onMarkDone}
          style={({ pressed }) => [styles.done, pressed && { backgroundColor: colors.success }]}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  overdueTag: {
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  overdueText: { color: '#991b1b', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  done: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
});
