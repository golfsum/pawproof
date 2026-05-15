import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { fmtTime } from '@/utils/dates';
import { JOURNAL_META } from '@/utils/petIcon';
import type { JournalEntry, Pet } from '@/types/models';

interface Props {
  entry: JournalEntry;
  pet?: Pet;
  showPet?: boolean;
}

export function TimelineRow({ entry, pet, showPet }: Props) {
  const meta = JOURNAL_META[entry.type] ?? JOURNAL_META.note;
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
        {(showPet && pet) || entry.amount || entry.durationMin ? (
          <Text style={styles.sub} numberOfLines={1}>
            {showPet && pet ? pet.name : ''}
            {showPet && pet && (entry.amount || entry.durationMin) ? ' · ' : ''}
            {entry.amount ?? ''}
            {entry.durationMin ? `${entry.amount ? ' · ' : ''}${entry.durationMin} min` : ''}
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
