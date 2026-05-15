import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Screen } from '@/components/Screen';
import { PetCard } from '@/components/PetCard';
import { StatusCard } from '@/components/StatusCard';
import { PetNeedsCard, buildPetNeedsItems, type NeedsItem } from '@/components/PetNeedsCard';
import { TabsHeader } from '@/components/TabsHeader';
import { canonicalizeReminderTitle } from '@/utils/vaccineNames';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { TimelineRow } from '@/components/TimelineRow';
import { QuickLogSheet, QuickLogKind } from '@/components/QuickLogSheet';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { colors, radius, spacing, typography } from '@/theme';
import { isOverdue, daysUntil, toDate } from '@/utils/dates';
import { computeNextDueDate } from '@/utils/recurrence';
import { updateReminder } from '@/lib/firestore';
import { scheduleReminder, cancelReminder } from '@/lib/notifications';
import type { Reminder } from '@/types/models';

const QUICK_LOGS: { kind: QuickLogKind; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { kind: 'fed', label: 'Fed', icon: 'restaurant-outline', tint: colors.warning },
  { kind: 'walk', label: 'Walk', icon: 'walk-outline', tint: colors.primary },
  { kind: 'medication', label: 'Meds', icon: 'medkit-outline', tint: colors.danger },
  { kind: 'training', label: 'Training', icon: 'school-outline', tint: colors.accent },
  { kind: 'symptom', label: 'Health', icon: 'alert-circle-outline', tint: colors.warning },
  { kind: 'grooming', label: 'Grooming', icon: 'cut-outline', tint: colors.info },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { pets, entries, reminders, vaccines, documents } = useData();
  const { check } = useGate();

  const [quickLogKind, setQuickLogKind] = useState<QuickLogKind | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good evening';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const dueToday = useMemo(() => {
    // Strictly today — overdue items have their own status card, so we don't
    // double-count them here.
    return reminders.filter(r => {
      if (r.isCompleted) return false;
      if (isOverdue(r.dueDate)) return false;
      const days = daysUntil(r.dueDate);
      return days != null && days === 0;
    });
  }, [reminders]);

  const overdue = useMemo(() => reminders.filter(r => !r.isCompleted && isOverdue(r.dueDate)), [reminders]);
  const expiringSoon = useMemo(() => {
    return vaccines.filter(v => {
      if (!v.expirationDate) return false;
      const days = daysUntil(v.expirationDate);
      return days != null && days <= 30 && days >= 0;
    });
  }, [vaccines]);

  // Group overdue + due-today reminders + warning insights by pet for the
  // Needs Attention section. Pets with zero items don't render.
  const petsWithNeeds = useMemo(() => {
    return pets
      .map(pet => ({ pet, items: buildPetNeedsItems(pet, reminders, entries) }))
      .filter(p => p.items.length > 0);
  }, [pets, reminders, entries]);
  const totalNeedsItems = petsWithNeeds.reduce((acc, p) => acc + p.items.length, 0);

  const nextReminderFor = (petId: string): Reminder | null => {
    const upcoming = reminders
      .filter(r => r.petId === petId && !r.isCompleted)
      .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
    return upcoming[0] ?? null;
  };

  const recentEntries = entries.slice(0, 5);

  const doMarkDone = async (reminder: Reminder) => {
    if (!profile) return;
    await cancelReminder(reminder.notificationId);
    const next = computeNextDueDate(new Date(reminder.dueDate), reminder.repeatType, reminder.repeatInterval);
    if (next) {
      const newNotifId = await scheduleReminder(reminder.title, reminder.notes ?? 'Reminder', next);
      await updateReminder(profile.id, reminder.id, {
        lastCompletedAt: new Date().toISOString(),
        dueDate: next.toISOString(),
        nextDueDate: next.toISOString(),
        notificationId: newNotifId,
      });
    } else {
      await updateReminder(profile.id, reminder.id, {
        isCompleted: true,
        lastCompletedAt: new Date().toISOString(),
        notificationId: null,
      });
    }
  };

  const onMarkDone = (reminder: Reminder) => {
    const pet = pets.find(p => p.id === reminder.petId);
    const isRecurring = reminder.repeatType !== 'none';
    Alert.alert(
      'Mark done?',
      isRecurring
        ? `Complete "${reminder.title}"${pet ? ` for ${pet.name}` : ''}. Next due date will be scheduled.`
        : `Complete "${reminder.title}"${pet ? ` for ${pet.name}` : ''}. This reminder will be marked complete.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: isRecurring ? 'Mark done' : 'Complete', onPress: () => doMarkDone(reminder) },
      ],
    );
  };

  const handleQuickLog = (kind: QuickLogKind) => {
    if (pets.length === 0) {
      Alert.alert('Add a pet first', 'Add a pet so we know who you\'re logging for.', [
        { text: 'Add pet', onPress: () => router.push('/pet/add') },
        { text: 'Not now', style: 'cancel' },
      ]);
      return;
    }
    setQuickLogKind(kind);
  };

  const handleAddPet = () => {
    if (check('add_pet')) router.push('/pet/add');
  };

  // Emergency card shortcut. One pet → straight in. Multiple → action sheet.
  const openEmergency = () => {
    if (pets.length === 0) return;
    if (pets.length === 1) {
      router.push({ pathname: '/pet/emergency/[id]', params: { id: pets[0].id } });
      return;
    }
    const labels = pets.map(p => p.name);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Emergency card for…', options: [...labels, 'Cancel'], cancelButtonIndex: labels.length },
        idx => {
          if (idx >= 0 && idx < pets.length) {
            router.push({ pathname: '/pet/emergency/[id]', params: { id: pets[idx].id } });
          }
        },
      );
    } else {
      Alert.alert('Emergency card', 'Pick a pet', [
        ...pets.map(p => ({ text: p.name, onPress: () => router.push({ pathname: '/pet/emergency/[id]' as const, params: { id: p.id } }) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <Screen>
      <TabsHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.greeting}>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMM d')}</Text>
          <Text style={typography.h1}>{greeting}</Text>
        </View>

        <View style={styles.statusRow}>
          <StatusCard label="Due Today" count={dueToday.length} tone="primary" icon="time-outline" onPress={() => router.push({ pathname: '/(tabs)/reminders', params: { bucket: 'today' } })} />
          <StatusCard label="Overdue" count={overdue.length} tone="danger" icon="warning-outline" onPress={() => router.push({ pathname: '/(tabs)/reminders', params: { bucket: 'overdue' } })} />
          <StatusCard label="Expiring Soon" count={expiringSoon.length} tone="warning" icon="shield-half-outline" onPress={() => router.push('/(tabs)/records')} />
        </View>

        <SectionHeader
          title="Needs Attention"
          action={petsWithNeeds.length ? { label: 'View all', onPress: () => router.push('/(tabs)/reminders') } : undefined}
        />
        <View style={styles.list}>
          {petsWithNeeds.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                {pets.length === 1
                  ? `Nothing needs attention. ${pets[0].name} is all set.`
                  : pets.length > 1
                    ? 'Nothing needs attention. Everyone is all set.'
                    : 'Add a pet to start tracking care.'}
              </Text>
            </View>
          ) : (
            petsWithNeeds.map(({ pet, items }) => (
              <PetNeedsCard
                key={pet.id}
                pet={pet}
                items={items}
                onMarkDone={onMarkDone}
                onItemPress={(item: NeedsItem) => {
                  // Vaccine rows open the Renew flow (Add Vaccine prefilled
                  // with the same vaccine name + petId). Other reminder rows
                  // jump to the pet profile so the user can take action there.
                  if (item.isVaccine && item.reminder) {
                    const vaccineName = canonicalizeReminderTitle(item.reminder.title)
                      .replace(/\s+(vaccine|renewal)$/i, '')
                      .trim();
                    router.push({
                      pathname: '/vaccine/add',
                      params: { petId: pet.id, vaccineName },
                    });
                  } else if (item.reminder) {
                    router.push({ pathname: '/pet/[id]', params: { id: pet.id } });
                  }
                }}
                onViewAll={() => router.push({ pathname: '/(tabs)/reminders' })}
              />
            ))
          )}
        </View>

        <SectionHeader title="Quick Log" />
        <View style={styles.quickGrid}>
          {QUICK_LOGS.map(q => (
            <Pressable
              key={q.kind}
              onPress={() => handleQuickLog(q.kind)}
              style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: q.tint + '22' }]}>
                <Ionicons name={q.icon} size={22} color={q.tint} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Your Pets" action={{ label: pets.length ? 'See all' : 'Add', onPress: () => pets.length ? router.push('/(tabs)/pets') : handleAddPet() }} />
        <View style={styles.list}>
          {pets.length === 0 ? (
            <EmptyState
              icon="paw-outline"
              title="Add your first pet"
              body="Start tracking feedings, walks, vaccines, and vet visits in one place."
              cta={{ label: 'Add a pet', icon: 'add', onPress: handleAddPet }}
            />
          ) : (
            pets.slice(0, 3).map(pet => (
              <PetCard
                key={pet.id}
                pet={pet}
                nextReminder={nextReminderFor(pet.id)}
                expiringVaccine={
                  vaccines.find(v =>
                    v.petId === pet.id &&
                    v.expirationDate &&
                    (daysUntil(v.expirationDate) ?? 999) <= 30 &&
                    (daysUntil(v.expirationDate) ?? 999) >= 0,
                  ) ?? null
                }
              />
            ))
          )}
        </View>

        {pets.length > 0 && (
          <>
            <SectionHeader
              title="Records"
              action={{ label: 'View all', onPress: () => router.push('/(tabs)/records') }}
            />
            <Pressable
              onPress={() => router.push('/(tabs)/records')}
              style={({ pressed }) => [styles.recordsCard, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.recordsStats}>
                <RecordStat
                  icon="shield-checkmark-outline"
                  tint={colors.success}
                  count={vaccines.length}
                  label={vaccines.length === 1 ? 'vaccine' : 'vaccines'}
                />
                <View style={styles.recordsDivider} />
                <RecordStat
                  icon="document-text-outline"
                  tint={colors.accent}
                  count={documents.length}
                  label={documents.length === 1 ? 'document' : 'documents'}
                />
                {expiringSoon.length > 0 ? (
                  <>
                    <View style={styles.recordsDivider} />
                    <RecordStat
                      icon="alert-circle-outline"
                      tint={colors.warning}
                      count={expiringSoon.length}
                      label="expiring"
                    />
                  </>
                ) : null}
              </View>
              <View style={styles.recordsChevron}>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </View>
            </Pressable>
          </>
        )}

        {recentEntries.length > 0 ? (
          <>
            <SectionHeader title="Recent Activity" />
            <View style={styles.activityCard}>
              {recentEntries.map((entry, idx) => (
                <View key={entry.id} style={idx > 0 && styles.divider}>
                  <TimelineRow entry={entry} pet={pets.find(p => p.id === entry.petId)} showPet />
                </View>
              ))}
            </View>
          </>
        ) : pets.length > 0 ? (
          <>
            <SectionHeader title="Recent Activity" />
            <View style={[styles.card, { marginHorizontal: spacing.base }]}>
              <Text style={styles.emptyText}>
                No activity yet. Use Quick Log above to capture meals, walks, meds, and symptoms here.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <QuickLogSheet
        visible={quickLogKind !== null}
        kind={quickLogKind}
        onClose={() => setQuickLogKind(null)}
      />
    </Screen>
  );
}

function RecordStat({ icon, tint, count, label }: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  count: number;
  label: string;
}) {
  return (
    <View style={recordStatStyles.wrap}>
      <View style={[recordStatStyles.icon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={recordStatStyles.count}>{count}</Text>
      <Text style={recordStatStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const recordStatStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 4 },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  // Day greeting sits below the persistent TabsHeader. Single column now —
  // no need for the row layout since emergency/profile moved to the header.
  greeting: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  date: { fontSize: 13, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  profileBtn: { padding: 4 },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  moreLinkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.dangerSoft,
    marginRight: 4,
  },
  emergencyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
    letterSpacing: 0.1,
  },
  statusRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base },
  list: { paddingHorizontal: spacing.base, gap: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: 14 },
  quickGrid: {
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickBtn: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  recordsCard: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  recordsStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordsDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.divider,
    marginHorizontal: spacing.sm,
  },
  recordsChevron: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.cardSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  activityCard: {
    marginHorizontal: spacing.base,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
});
