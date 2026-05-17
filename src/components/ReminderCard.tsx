import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { fmtRelative, isOverdue } from '@/utils/dates';
import { describeRepeat } from '@/utils/recurrence';
import { canonicalizeReminderTitle } from '@/utils/vaccineNames';
import { fmtDate } from '@/utils/dates';
import {
  getReminderCategory,
  getReminderConfig,
  getReminderName,
} from '@/utils/reminderCategory';
import { PetAvatar } from './PetAvatar';
import type { Pet, Reminder } from '@/types/models';

interface Props {
  reminder: Reminder;
  pet?: Pet;
  /**
   * Other pets covered by the same multi-pet reminder group (excludes
   * the primary `pet` rendered above). When set, the card surfaces an
   * "Also for: …" line so the user knows tapping Mark done will
   * complete every pet in the group, not just this one.
   */
  groupPets?: Pet[];
  onMarkDone?: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

function joinNames(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function ReminderCard({ reminder, pet, groupPets, onMarkDone, onPress, onLongPress }: Props) {
  const config = getReminderConfig(reminder);
  const category = getReminderCategory(reminder);
  const overdue = !reminder.isCompleted && isOverdue(reminder.dueDate);

  // Vaccine reminders aren't "tasks you complete today"; they're upcoming
  // renewals. A green checkmark next to one reads like "complete this
  // vaccine now," which is misleading. Show a chevron instead, and let the
  // user open the pet profile (or long-press to delete).
  const isInformational = category === 'vaccination';

  // Vaccine reminders use "Expired" (matches vaccine-record vocabulary);
  // every other category uses "Overdue".
  const overdueLabel = isInformational ? 'EXPIRED' : 'OVERDUE';

  const rawName = getReminderName(reminder);
  const displayName = isInformational ? canonicalizeReminderTitle(rawName) : rawName;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.tint + '22' }]}>
        <Ionicons name={config.icon as any} size={20} color={config.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          {overdue ? (
            <View style={styles.overdueTag}>
              <Text style={styles.overdueText}>{overdueLabel}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {pet ? <PetAvatar pet={pet} size={18} /> : null}
          <Text style={styles.metaText} numberOfLines={1}>
            {pet?.name ? `${pet.name} · ` : ''}
            {/* Vaccine reminders show only the date. The 9am time is an
                arbitrary scheduling artifact, not a meaningful detail. */}
            {isInformational
              ? fmtDate(reminder.dueDate)
              : fmtRelative(reminder.dueDate)}
            {' · '}{describeRepeat(reminder)}
          </Text>
        </View>
        {groupPets && groupPets.length > 0 ? (
          <Text style={styles.groupLine} numberOfLines={1}>
            Also for {joinNames(groupPets.map(p => p.name))}. Mark done covers all.
          </Text>
        ) : null}
      </View>
      {isInformational ? (
        onMarkDone ? (
          <Pressable
            onPress={onMarkDone}
            hitSlop={6}
            style={({ pressed }) => [styles.renew, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="checkmark" size={14} color="#fff" />
            <Text style={styles.renewText}>Renew</Text>
          </Pressable>
        ) : (
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </View>
        )
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
  groupLine: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
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
  // Vaccinations use a labelled pill instead of a green check so the
  // affordance reads as "log this dose" rather than "task done".
  renew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  renewText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
});
