import React, { useMemo, useState } from 'react';
import {
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
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { Chip } from './Chip';
import { TimelineRow } from './TimelineRow';
import { colors, fonts, radius, spacing } from '@/theme';
import type { JournalEntry, Pet } from '@/types/models';
import { getEntryPetIds } from '@/types/models';
import { JOURNAL_META } from '@/utils/petIcon';
import type { DistanceUnit } from '@/utils/units';

// Full-screen "View more" modal opened from Home's Recent Activity.
// Shows every journal entry, with three lightweight filters: text
// search, date bucket, and pet. Keeps the visual language of the
// Recent Activity card so the user feels like they pulled the same
// list up a level, not landed in a new screen.

interface Props {
  visible: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  pets: Pet[];
  distanceUnit?: DistanceUnit;
  ownerUid?: string;
}

type DateBucket = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month';

const DATE_BUCKETS: { key: DateBucket; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This week' },
  { key: 'this_month', label: 'This month' },
];

// Same source as JOURNAL_META so the filter row matches the icons
// shown on the entry rows. Labels are short for chip ergonomics.
const TYPE_FILTERS: Array<{ key: 'all' | JournalEntry['type']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'fed', label: 'Meals' },
  { key: 'walk', label: 'Walks' },
  { key: 'medication', label: 'Meds' },
  { key: 'grooming', label: 'Grooming' },
  { key: 'symptom', label: 'Health' },
  { key: 'training', label: 'Training' },
  { key: 'vet_visit', label: 'Vet' },
];

export function ActivityModal({
  visible,
  onClose,
  entries,
  pets,
  distanceUnit = 'mi',
  ownerUid,
}: Props) {
  const [search, setSearch] = useState('');
  const [dateBucket, setDateBucket] = useState<DateBucket>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | JournalEntry['type']>('all');
  const [petFilter, setPetFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter(e => {
      // Text search hits title + note. Pet name match too so "Yahzi"
      // surfaces every entry for that pet without having to use the
      // pet chip filter.
      if (query) {
        const haystacks: string[] = [e.title, e.note ?? ''];
        for (const pid of getEntryPetIds(e)) {
          const name = pets.find(p => p.id === pid)?.name;
          if (name) haystacks.push(name);
        }
        if (!haystacks.some(h => h.toLowerCase().includes(query))) return false;
      }

      if (typeFilter !== 'all' && e.type !== typeFilter) return false;

      if (petFilter && !getEntryPetIds(e).includes(petFilter)) return false;

      if (dateBucket !== 'all') {
        const when = new Date(e.timestamp);
        if (dateBucket === 'today' && !isToday(when)) return false;
        if (dateBucket === 'yesterday' && !isYesterday(when)) return false;
        if (dateBucket === 'this_week' && !isThisWeek(when, { weekStartsOn: 1 })) return false;
        if (dateBucket === 'this_month' && !isThisMonth(when)) return false;
      }

      return true;
    });
  }, [entries, search, typeFilter, petFilter, dateBucket, pets]);

  // Group by day header so a long list reads like a journal instead of
  // an endless scroll. Matches the timeline tab pattern on pet profile.
  const grouped = useMemo(() => {
    const byDay: Record<string, JournalEntry[]> = {};
    for (const e of filtered) {
      const key = format(new Date(e.timestamp), 'EEEE, MMM d');
      (byDay[key] ||= []).push(e);
    }
    return Object.entries(byDay);
  }, [filtered]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (dateBucket !== 'all' ? 1 : 0) +
    (petFilter ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setDateBucket('all');
    setPetFilter(null);
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Activity</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textFaint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title, note, or pet…"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {DATE_BUCKETS.map(b => (
            <Chip
              key={`d-${b.key}`}
              label={b.label}
              selected={dateBucket === b.key}
              onPress={() => setDateBucket(b.key)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map(t => (
            <Chip
              key={`t-${t.key}`}
              label={t.label}
              selected={typeFilter === t.key}
              onPress={() => setTypeFilter(t.key)}
            />
          ))}
        </ScrollView>

        {pets.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <Chip
              label="All pets"
              selected={petFilter === null}
              onPress={() => setPetFilter(null)}
            />
            {pets.map(p => (
              <Chip
                key={`p-${p.id}`}
                label={p.name}
                selected={petFilter === p.id}
                onPress={() => setPetFilter(p.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {activeFilterCount > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {filtered.length} match{filtered.length === 1 ? '' : 'es'}
            </Text>
            <Pressable onPress={clearFilters} hitSlop={6}>
              <Text style={styles.clearText}>Clear filters</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {grouped.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="sparkles-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptyBody}>
                {entries.length === 0
                  ? 'Use Quick Log on Home to start capturing meals, walks, meds, and health notes.'
                  : 'Try clearing the filters above to see more.'}
              </Text>
            </View>
          ) : (
            grouped.map(([day, items]) => (
              <View key={day} style={styles.dayBlock}>
                <Text style={styles.dayHeader}>{day}</Text>
                <View style={styles.dayCard}>
                  {items.map((e, idx) => {
                    const entryPets = getEntryPetIds(e)
                      .map(id => pets.find(p => p.id === id))
                      .filter((p): p is Pet => !!p);
                    return (
                      <View key={e.id} style={idx > 0 && styles.divider}>
                        <TimelineRow
                          entry={e}
                          pets={entryPets}
                          showPet
                          distanceUnit={distanceUnit}
                          ownerUid={ownerUid}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'ios' ? 4 : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  title: { flex: 1, fontSize: 20, fontFamily: fonts.display.bold, color: colors.text },
  close: { padding: 4 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },

  filterRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  summaryText: { fontSize: 12, color: colors.textMuted },
  clearText: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.primary,
  },

  dayBlock: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  dayHeader: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  dayCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },

  empty: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  emptyTitle: { fontSize: 15, fontFamily: fonts.display.bold, color: colors.text },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
