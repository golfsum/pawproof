import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ReminderCard } from '@/components/ReminderCard';
import { PetAvatar } from '@/components/PetAvatar';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { TabsHeader } from '@/components/TabsHeader';
import { useData } from '@/hooks/useData';
import { useAuth } from '@/hooks/AuthProvider';
import { colors, radius, spacing, typography } from '@/theme';
import { isOverdue, daysUntil } from '@/utils/dates';
import { computeNextDueDate } from '@/utils/recurrence';
import { updateReminder, deleteReminder } from '@/lib/firestore';
import { scheduleReminder, cancelReminder } from '@/lib/notifications';
import type { Reminder, ReminderType } from '@/types/models';

type FilterKey = 'all' | ReminderType | 'vaccines';
type SortKey = 'date_asc' | 'date_desc' | 'pet_name';

const FILTERS: { label: string; key: FilterKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'All', key: 'all', icon: 'list-outline' },
  { label: 'Feeding', key: 'feeding', icon: 'restaurant-outline' },
  { label: 'Meds', key: 'medication', icon: 'medkit-outline' },
  { label: 'Vet', key: 'vet_visit', icon: 'pulse-outline' },
  { label: 'Vaccines', key: 'vaccination', icon: 'shield-checkmark-outline' },
  { label: 'Grooming', key: 'grooming', icon: 'cut-outline' },
];

const SORTS: { label: string; key: SortKey; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Date · soonest first', key: 'date_asc', icon: 'arrow-up-outline' },
  { label: 'Date · latest first', key: 'date_desc', icon: 'arrow-down-outline' },
  { label: 'Pet name', key: 'pet_name', icon: 'paw-outline' },
];

type BucketKey = 'all' | 'today' | 'overdue';

export default function RemindersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bucket?: BucketKey }>();
  const { pets, reminders } = useData();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [petFilter, setPetFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('date_asc');
  const [bucket, setBucket] = useState<BucketKey>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  // Track collapsed pet IDs so multi-pet accounts can fold sections shut.
  const [collapsedPets, setCollapsedPets] = useState<Set<string>>(new Set());
  const togglePet = (petId: string) =>
    setCollapsedPets(prev => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });

  // When the user lands here via a status card on Home, apply the bucket
  // filter once on focus, then clear the param so navigating back here
  // later doesn't keep filtering them.
  useFocusEffect(useCallback(() => {
    if (params.bucket && params.bucket !== bucket) {
      setBucket(params.bucket);
      router.setParams({ bucket: '' });
    }
  }, [params.bucket]));

  const isDefault = filter === 'all' && sortBy === 'date_asc' && petFilter === null && bucket === 'all';

  const filtered = useMemo(() => {
    let result = reminders;
    if (filter === 'vaccines') result = result.filter(r => r.type === 'vaccination');
    else if (filter !== 'all') result = result.filter(r => r.type === filter);
    if (petFilter) result = result.filter(r => r.petId === petFilter);

    const petName = (petId: string) => pets.find(p => p.id === petId)?.name ?? '';
    const sorted = [...result];
    sorted.sort((a, b) => {
      if (sortBy === 'pet_name') {
        const cmp = petName(a.petId).localeCompare(petName(b.petId));
        if (cmp !== 0) return cmp;
        return +new Date(a.dueDate) - +new Date(b.dueDate);
      }
      const delta = +new Date(a.dueDate) - +new Date(b.dueDate);
      return sortBy === 'date_desc' ? -delta : delta;
    });
    return sorted;
  }, [reminders, filter, sortBy, pets, petFilter]);

  const active = filtered.filter(r => !r.isCompleted);
  const overdue = active.filter(r => isOverdue(r.dueDate));
  const dueToday = active.filter(r => {
    if (isOverdue(r.dueDate)) return false;
    const d = daysUntil(r.dueDate);
    return d != null && d === 0;
  });
  // Vaccine expirations only ever sit in "future" — same-day or overdue
  // vaccines belong in the urgent groups above. The remaining future
  // reminders split by type so daily-task reminders don't drown in
  // multi-year vaccine renewals.
  const futureActive = active.filter(r => {
    const d = daysUntil(r.dueDate);
    return d != null && d > 0;
  });
  const upcoming = futureActive.filter(r => r.type !== 'vaccination');
  const vaccineExpirations = futureActive.filter(r => r.type === 'vaccination');

  const handleDone = async (r: Reminder) => {
    if (!profile) return;
    await cancelReminder(r.notificationId);
    const next = computeNextDueDate(new Date(r.dueDate), r.repeatType, r.repeatInterval);
    if (next) {
      const newId = await scheduleReminder(r.title, r.notes ?? 'Reminder', next);
      await updateReminder(profile.id, r.id, {
        dueDate: next.toISOString(),
        nextDueDate: next.toISOString(),
        lastCompletedAt: new Date().toISOString(),
        notificationId: newId,
      });
    } else {
      await updateReminder(profile.id, r.id, {
        isCompleted: true,
        lastCompletedAt: new Date().toISOString(),
        notificationId: null,
      });
    }
  };

  const promptMarkDone = (r: Reminder) => {
    const pet = pets.find(p => p.id === r.petId);
    const isRecurring = r.repeatType !== 'none';
    Alert.alert(
      'Mark done?',
      isRecurring
        ? `Complete "${r.title}"${pet ? ` for ${pet.name}` : ''}. Next due date will be scheduled.`
        : `Complete "${r.title}"${pet ? ` for ${pet.name}` : ''}. This reminder will be marked complete.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isRecurring ? 'Mark done' : 'Complete', onPress: () => handleDone(r) },
      ],
    );
  };

  const promptDelete = (r: Reminder) => {
    if (!profile) return;
    Alert.alert(
      'Delete reminder?',
      `Remove "${r.title}" entirely. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelReminder(r.notificationId);
            await deleteReminder(profile.id, r.id);
          },
        },
      ],
    );
  };

  // Subgroup renderer — used inside each per-pet block. Smaller heading so
  // the pet name remains the visual anchor.
  const renderSubgroup = (title: string, items: Reminder[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <Text style={styles.subgroupLabel}>{title} · {items.length}</Text>
        <View style={styles.list}>
          {items.map(r => {
            const pet = pets.find(p => p.id === r.petId);
            return (
              <ReminderCard
                key={r.id}
                reminder={r}
                pet={pet}
                onMarkDone={() => promptMarkDone(r)}
                onLongPress={() => promptDelete(r)}
                onPress={pet ? () => router.push({ pathname: '/pet/[id]', params: { id: pet.id } }) : undefined}
              />
            );
          })}
        </View>
      </>
    );
  };

  // Group active reminders by pet so the user sees one organised section per
  // pet — matches the Home screen's pet-first grouping.
  const groupedByPet = useMemo(() => {
    return pets
      .map(pet => {
        const petReminders = active.filter(r => r.petId === pet.id);
        const petOverdue = petReminders.filter(r => isOverdue(r.dueDate));
        const petDueToday = petReminders.filter(r => {
          if (isOverdue(r.dueDate)) return false;
          const d = daysUntil(r.dueDate);
          return d != null && d === 0;
        });
        const petFuture = petReminders.filter(r => {
          const d = daysUntil(r.dueDate);
          return d != null && d > 0;
        });
        const petUpcoming = petFuture.filter(r => r.type !== 'vaccination');
        const petVaccines = petFuture.filter(r => r.type === 'vaccination');
        return {
          pet,
          all: petReminders,
          overdue: petOverdue,
          dueToday: petDueToday,
          upcoming: petUpcoming,
          vaccines: petVaccines,
        };
      })
      .filter(g => g.all.length > 0);
  }, [pets, active]);

  return (
    <Screen>
      <TabsHeader />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={typography.h1}>Reminders</Text>
          <Text style={styles.sub}>
            {groupedByPet.length > 0 ? `${groupedByPet.length} pet${groupedByPet.length === 1 ? '' : 's'} · ` : ''}
            {active.length} active reminder{active.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          onPress={() => setSheetOpen(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="options-outline" size={20} color={isDefault ? colors.text : colors.primary} />
          {!isDefault ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        {bucket !== 'all' ? (
          <View style={styles.bucketBanner}>
            <Ionicons name="filter-outline" size={14} color={colors.primary} />
            <Text style={styles.bucketBannerText}>
              Showing {bucket === 'today' ? 'today' : 'overdue'} only
            </Text>
            <Pressable onPress={() => setBucket('all')} hitSlop={8}>
              <Text style={styles.bucketBannerClear}>Clear</Text>
            </Pressable>
          </View>
        ) : null}

        {active.length === 0 ? (
          <View style={{ marginTop: spacing.lg }}>
            <EmptyState
              icon="alarm-outline"
              title="No reminders"
              body={pets.length ? 'Add reminders for feedings, meds, vet visits, and more.' : 'Add a pet first, then create reminders for them.'}
              cta={pets.length ? { label: 'Add reminder', icon: 'add', onPress: () => router.push('/reminder/add') } : undefined}
            />
          </View>
        ) : (
          <>
            {groupedByPet.map(g => {
              // Apply the bucket filter inside each pet section.
              const showOverdue = (bucket === 'all' || bucket === 'overdue') && g.overdue.length > 0;
              const showToday = (bucket === 'all' || bucket === 'today') && g.dueToday.length > 0;
              const showUpcoming = bucket === 'all' && g.upcoming.length > 0;
              const showVaccines = bucket === 'all' && g.vaccines.length > 0;
              if (!showOverdue && !showToday && !showUpcoming && !showVaccines) return null;

              const visibleCount =
                (showOverdue ? g.overdue.length : 0) +
                (showToday ? g.dueToday.length : 0) +
                (showUpcoming ? g.upcoming.length : 0) +
                (showVaccines ? g.vaccines.length : 0);

              const collapsed = collapsedPets.has(g.pet.id);
              // Badge number + color tell a single story: red = N overdue,
              // amber = N due today, neutral = total when nothing's urgent.
              // Previously the badge always showed total in red, which read
              // as "5 overdue" even when only 1 was actually late.
              const badgeCount =
                g.overdue.length > 0 ? g.overdue.length
                : g.dueToday.length > 0 ? g.dueToday.length
                : visibleCount;
              const badgeBg =
                g.overdue.length > 0 ? colors.danger
                : g.dueToday.length > 0 ? colors.warning
                : colors.cardSubtle;
              const badgeFg =
                g.overdue.length > 0 || g.dueToday.length > 0 ? '#fff' : colors.textMuted;
              return (
                <View key={g.pet.id} style={styles.petSection}>
                  <Pressable
                    onPress={() => togglePet(g.pet.id)}
                    style={({ pressed }) => [styles.petHeader, pressed && { opacity: 0.85 }]}
                  >
                    <PetAvatar pet={g.pet} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.petHeaderName}>{g.pet.name}</Text>
                      <Text style={styles.petHeaderSub} numberOfLines={1}>
                        {visibleCount} reminder{visibleCount === 1 ? '' : 's'}
                        {g.overdue.length > 0 ? ` · ${g.overdue.length} overdue` : ''}
                        {g.dueToday.length > 0 ? ` · ${g.dueToday.length} today` : ''}
                      </Text>
                    </View>
                    <View style={[styles.petCountBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.petCountText, { color: badgeFg }]}>{badgeCount}</Text>
                    </View>
                    <Ionicons
                      name={collapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color={colors.textFaint}
                      style={{ marginLeft: 4 }}
                    />
                  </Pressable>
                  {!collapsed ? (
                    <>
                      {showOverdue && renderSubgroup('Overdue', g.overdue)}
                      {showToday && renderSubgroup('Due today', g.dueToday)}
                      {showUpcoming && renderSubgroup('Upcoming', g.upcoming)}
                      {showVaccines && renderSubgroup('Vaccine expirations', g.vaccines)}
                    </>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <FAB onPress={() => router.push('/reminder/add')} />

      <FilterSortSheet
        visible={sheetOpen}
        filter={filter}
        petFilter={petFilter}
        pets={pets}
        sortBy={sortBy}
        onChange={(next) => {
          if (next.filter !== undefined) setFilter(next.filter);
          if (next.petFilter !== undefined) setPetFilter(next.petFilter);
          if (next.sortBy !== undefined) setSortBy(next.sortBy);
        }}
        onClose={() => setSheetOpen(false)}
        onReset={() => { setFilter('all'); setSortBy('date_asc'); setPetFilter(null); }}
      />
    </Screen>
  );
}

function FilterSortSheet({
  visible, filter, petFilter, pets, sortBy, onChange, onClose, onReset,
}: {
  visible: boolean;
  filter: FilterKey;
  petFilter: string | null;
  pets: { id: string; name: string }[];
  sortBy: SortKey;
  onChange: (next: { filter?: FilterKey; petFilter?: string | null; sortBy?: SortKey }) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter & Sort</Text>
            <Pressable onPress={onReset} hitSlop={10}>
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>

          {pets.length > 1 ? (
            <>
              <Text style={styles.sheetLabel}>Filter by pet</Text>
              <View style={styles.chipRow}>
                <Chip
                  label="All pets"
                  selected={petFilter === null}
                  tone="primary"
                  onPress={() => onChange({ petFilter: null })}
                  style={styles.petChip}
                />
                {pets.map(p => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={petFilter === p.id}
                    tone="primary"
                    onPress={() => onChange({ petFilter: p.id })}
                    style={styles.petChip}
                  />
                ))}
              </View>
              <View style={{ height: spacing.lg }} />
            </>
          ) : null}

          <Text style={styles.sheetLabel}>Filter by type</Text>
          <View style={styles.chipRow}>
            {FILTERS.map(f => (
              <Chip
                key={f.key}
                label={f.label}
                icon={f.icon}
                selected={filter === f.key}
                tone="primary"
                onPress={() => onChange({ filter: f.key })}
              />
            ))}
          </View>

          <Text style={[styles.sheetLabel, { marginTop: spacing.lg }]}>Sort by</Text>
          <View style={{ gap: spacing.sm }}>
            {SORTS.map(s => (
              <Pressable
                key={s.key}
                onPress={() => onChange({ sortBy: s.key })}
                style={({ pressed }) => [
                  styles.sortRow,
                  sortBy === s.key && styles.sortRowSelected,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name={s.icon} size={18} color={sortBy === s.key ? colors.primary : colors.textMuted} />
                <Text style={[styles.sortLabel, sortBy === s.key && { color: colors.primary, fontWeight: '700' }]}>
                  {s.label}
                </Text>
                {sortBy === s.key ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bucketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    marginHorizontal: spacing.base,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  bucketBannerText: { flex: 1, fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
  bucketBannerClear: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  filterDot: {
    position: 'absolute',
    top: 8, right: 8,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  list: { paddingHorizontal: spacing.base, gap: spacing.sm },

  // More breathing room between pets so each block reads as its own unit.
  // The thin top divider visually separates without adding heavy lines.
  petSection: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  petHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  petHeaderName: { fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  petHeaderSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  petCountBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
  petCountText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  subgroupLabel: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 6,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  // Bottom sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  grabber: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  resetText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  sheetLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.6,
    color: colors.textMuted, textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Pet chips need consistent sizing so "All pets" doesn't look much wider
  // than a 5-letter pet name, AND so long kennel-club names truncate
  // gracefully instead of pushing other chips off the row.
  petChip: { minWidth: 100, maxWidth: 180, justifyContent: 'center', paddingHorizontal: 14 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sortRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sortLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  doneBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
