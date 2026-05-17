import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { fmtTime } from '@/utils/dates';
import { JOURNAL_META } from '@/utils/petIcon';
import { fmtDistance, type DistanceUnit } from '@/utils/units';
import type { JournalEntry, Pet } from '@/types/models';

interface Props {
  entry: JournalEntry;
  pet?: Pet;
  /**
   * Every pet this entry covers. Used for multi-pet entries so the
   * subtitle reads "Yahzi, Moqui, and Lovie" instead of just the first
   * one. When omitted we fall back to `pet`.
   */
  pets?: Pet[];
  showPet?: boolean;
  /** Distance unit for walk rows. Defaults to mi. */
  distanceUnit?: DistanceUnit;
  // When set, entries logged by anyone OTHER than this uid get their
  // actorName surfaced as "by Noel". Owner-logged entries (actorUid ===
  // ownerUid) stay clean. Passing undefined disables attribution.
  ownerUid?: string;
}

function joinPetNames(pets: Pet[]): string {
  const names = pets.map(p => p.name);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function TimelineRow({ entry, pet, pets, showPet, distanceUnit = 'mi', ownerUid }: Props) {
  const meta = JOURNAL_META[entry.type] ?? JOURNAL_META.note;
  // Only show "by X" when a caregiver wrote it, not the owner.
  const byActor =
    entry.actorUid && entry.actorName && ownerUid && entry.actorUid !== ownerUid
      ? entry.actorName
      : null;

  const resolvedPets = pets && pets.length > 0 ? pets : pet ? [pet] : [];
  const petLabel = showPet && resolvedPets.length > 0 ? joinPetNames(resolvedPets) : '';
  const distanceLabel = entry.distanceMeters
    ? fmtDistance(entry.distanceMeters, distanceUnit)
    : '';
  const durationLabel = entry.durationMin ? `${entry.durationMin} min` : '';

  const subBits = [
    petLabel,
    entry.amount ?? '',
    distanceLabel,
    durationLabel,
    byActor ? `by ${byActor}` : '',
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: meta.tint + '22' }]}>
        <Ionicons name={meta.icon as any} size={18} color={meta.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
          <Text style={styles.time}>{fmtTime(entry.timestamp)}</Text>
        </View>
        {subBits.length > 0 ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subBits.join(' · ')}
          </Text>
        ) : null}
        {entry.note ? <Text style={styles.note} numberOfLines={3}>{entry.note}</Text> : null}
        {entry.photoUrl ? (
          <Image source={{ uri: entry.photoUrl }} style={styles.photo} contentFit="cover" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm },
  time: { fontSize: 12, color: colors.textMuted },
  sub: { fontSize: 12, color: colors.textMuted },
  note: { fontSize: 14, color: colors.text, marginTop: 4 },
  photo: {
    marginTop: 8,
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    backgroundColor: colors.cardSubtle,
  },
});
