import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing } from '@/theme';
import { PetAvatar } from './PetAvatar';
import { fmtPetAge, fmtDate } from '@/utils/dates';
import { SPECIES_LABEL, REMINDER_META } from '@/utils/petIcon';
import type { Pet, Reminder, VaccineRecord } from '@/types/models';

interface Props {
  pet: Pet;
  nextReminder?: Reminder | null;
  expiringVaccine?: VaccineRecord | null;
}

export function PetCard({ pet, nextReminder, expiringVaccine }: Props) {
  const reminderMeta = nextReminder ? REMINDER_META[nextReminder.type] ?? REMINDER_META.custom : null;
  const age = fmtPetAge(pet.birthday, pet.approxAgeMonths);
  const sub = [
    SPECIES_LABEL[pet.species],
    pet.breed,
    age,
  ].filter(Boolean).join(' · ');

  return (
    <Link href={{ pathname: '/pet/[id]', params: { id: pet.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {/* Header — avatar + name + chevron, always present */}
        <View style={styles.header}>
          <PetAvatar pet={pet} size={64} />
          <View style={styles.headerBody}>
            <Text style={styles.name} numberOfLines={1}>{pet.name}</Text>
            <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </View>
        </View>

        {/* Next reminder strip — only shows when there is one. Visually
            separated by a soft divider so the card has weight even with
            just a name. */}
        {nextReminder && reminderMeta ? (
          <View style={styles.divider}>
            <View style={[styles.dividerIcon, { backgroundColor: reminderMeta.tint + '22' }]}>
              <Ionicons name={reminderMeta.icon as any} size={14} color={reminderMeta.tint} />
            </View>
            <Text style={styles.dividerText} numberOfLines={1}>
              <Text style={styles.dividerLabel}>Next: </Text>
              {nextReminder.title} · {fmtDate(nextReminder.dueDate)}
            </Text>
          </View>
        ) : null}

        {/* Expiring vaccine warning — separate, visible row when present */}
        {expiringVaccine ? (
          <View style={styles.warning}>
            <Ionicons name="shield-half-outline" size={14} color="#92400e" />
            <Text style={styles.warningText} numberOfLines={1}>
              {expiringVaccine.vaccineName} expires {fmtDate(expiringVaccine.expirationDate)}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pressed: { opacity: 0.92 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerBody: { flex: 1, gap: 3, justifyContent: 'center' },
  name: { fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  sub: { fontSize: 13, color: colors.textMuted },
  chevronWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  dividerIcon: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  dividerLabel: { color: colors.textMuted, fontWeight: '600' },
  dividerText: { flex: 1, fontSize: 13, color: colors.text },

  warning: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  warningText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '600' },
});
