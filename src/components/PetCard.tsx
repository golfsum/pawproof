import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { colors, radius, spacing } from '@/theme';
import { PetAvatar } from './PetAvatar';
import { fmtPetAge } from '@/utils/dates';
import { SPECIES_LABEL } from '@/utils/petIcon';
import { pickPetPreview, type PetPreview } from '@/utils/petPreview';
import type {
  JournalEntry,
  Pet,
  Reminder,
  VaccineRecord,
} from '@/types/models';

interface Props {
  pet: Pet;
  // Pet card now picks its own preview from the full reminders +
  // vaccines + entries slices, so the priority ordering (Overdue >
  // Expired > Due today > Expiring soon > Next > Last activity) can
  // happen in one place instead of being split across parents.
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  entries: JournalEntry[];
}

const PREFIX_TINT: Record<PetPreview['tone'], { fg: string; bg: string; label: string }> = {
  danger: { fg: colors.danger, bg: colors.dangerSoft, label: '#991b1b' },
  warning: { fg: colors.warning, bg: colors.warningSoft, label: '#92400e' },
  muted: { fg: colors.textMuted, bg: colors.cardSubtle, label: colors.textMuted },
};

export function PetCard({ pet, reminders, vaccines, entries }: Props) {
  const preview = pickPetPreview({ pet, reminders, vaccines, entries });
  const age = fmtPetAge(pet.birthday, pet.approxAgeMonths);
  const sub = [SPECIES_LABEL[pet.species], pet.breed, age]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={{ pathname: '/pet/[id]', params: { id: pet.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
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

        {/* One priority-ordered preview strip. Tone follows the
            priority bucket so an overdue card reads urgent without
            the user needing to parse the date. */}
        {preview ? (
          <View style={styles.divider}>
            <View
              style={[styles.dividerIcon, { backgroundColor: PREFIX_TINT[preview.tone].bg }]}
            >
              <Ionicons
                name={preview.iconName as any}
                size={14}
                color={PREFIX_TINT[preview.tone].fg}
              />
            </View>
            <Text style={styles.dividerText} numberOfLines={1}>
              <Text
                style={[
                  styles.dividerLabel,
                  { color: PREFIX_TINT[preview.tone].label },
                ]}
              >
                {preview.prefix}:{' '}
              </Text>
              {preview.title} · {preview.whenLabel}
            </Text>
          </View>
        ) : (
          <View style={styles.divider}>
            <View style={[styles.dividerIcon, { backgroundColor: colors.cardSubtle }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
            </View>
            <Text style={[styles.dividerText, { color: colors.textMuted }]} numberOfLines={1}>
              All caught up
            </Text>
          </View>
        )}
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
  dividerLabel: { fontWeight: '700' },
  dividerText: { flex: 1, fontSize: 13, color: colors.text },
});
