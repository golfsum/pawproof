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
import { Toast } from '@/components/Toast';
import { MarkVaccineDoneSheet } from '@/components/MarkVaccineDoneSheet';
import { ActivityModal } from '@/components/ActivityModal';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { useGate } from '@/hooks/useGate';
import { colors, radius, spacing, typography } from '@/theme';
import { isOverdue, daysUntil, toDate, fmtRelative, fmtDay } from '@/utils/dates';
import { computeNextDueDate } from '@/utils/recurrence';
import { JOURNAL_META } from '@/utils/petIcon';
import { createEntry, updateReminder } from '@/lib/firestore';
import { scheduleReminderForPet, cancelReminder } from '@/lib/notifications';
import { markReminderDone } from '@/lib/reminderActions';
import { fmtDistance, resolveDistanceUnit } from '@/utils/units';
import { getEntryPetIds, entryCoversPet } from '@/types/models';
import { getReminderName } from '@/utils/reminderCategory';
import { findGroupForReminder } from '@/utils/reminderGroups';
import type { JournalEntry, JournalEntryType, Reminder } from '@/types/models';

function labelFor(kind: QuickLogKind): string {
  switch (kind) {
    case 'fed': return 'Fed';
    case 'walk': return 'Walk';
    case 'medication': return 'Meds';
    case 'training': return 'Training';
    case 'symptom': return 'Health';
    case 'grooming': return 'Grooming';
  }
}

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
  const { user, profile } = useAuth();
  const { pets, entries, reminders, vaccines, documents, receivedShares } = useData();
  const { check } = useGate();

  const [quickLogKind, setQuickLogKind] = useState<QuickLogKind | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  // Mark-vaccine-done sheet driven by Needs Attention vaccine taps.
  const [vaccineSheet, setVaccineSheet] = useState<
    | { petId: string; vaccineName: string; reminderId?: string; reminderNotificationId?: string | null }
    | null
  >(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Good night';        // 12am–4:59am
    if (h < 12) return 'Good morning';     // 5am–11:59am
    if (h < 17) return 'Good afternoon';   // 12pm–4:59pm
    if (h < 21) return 'Good evening';     // 5pm–8:59pm
    return 'Good night';                   // 9pm–11:59pm
  }, []);

  const dueToday = useMemo(() => {
    // Strictly today. Overdue items have their own status card, so we don't
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

  // "Today" feed: a single chronological list of every actionable item
  // for today. Combines overdue reminders, due-today reminders, and
  // vaccines that crossed (or are crossing) their expiration date in
  // the last/next few days. Sorted by time so the user reads it
  // top-to-bottom like a day planner.
  type TodayItem =
    | { kind: 'overdue_reminder'; reminder: Reminder; sortKey: number }
    | { kind: 'today_reminder'; reminder: Reminder; sortKey: number }
    | { kind: 'expired_vaccine'; vaccine: typeof vaccines[number]; petId: string; sortKey: number }
    | { kind: 'expiring_today'; vaccine: typeof vaccines[number]; petId: string; sortKey: number };

  const todayItems = useMemo<TodayItem[]>(() => {
    const items: TodayItem[] = [];
    const startOfTodayMs = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    for (const r of reminders) {
      if (r.isCompleted) continue;
      const dueMs = +new Date(r.dueDate);
      if (isOverdue(r.dueDate)) {
        items.push({ kind: 'overdue_reminder', reminder: r, sortKey: dueMs });
      } else if ((daysUntil(r.dueDate) ?? 999) === 0) {
        items.push({ kind: 'today_reminder', reminder: r, sortKey: dueMs });
      }
    }
    for (const v of vaccines) {
      if (!v.expirationDate) continue;
      const days = daysUntil(v.expirationDate);
      if (days == null) continue;
      // Surface vaccines that lapsed in the last week (so the user
      // sees them on the daily list, not just "expired forever ago")
      // and ones expiring today.
      if (days === 0) {
        items.push({
          kind: 'expiring_today',
          vaccine: v,
          petId: v.petId,
          sortKey: +new Date(v.expirationDate),
        });
      } else if (days < 0 && days >= -7) {
        items.push({
          kind: 'expired_vaccine',
          vaccine: v,
          petId: v.petId,
          sortKey: +new Date(v.expirationDate),
        });
      }
    }
    // Overdue + expired items sort to the top (negative time delta);
    // today items sort by time-of-day.
    return items.sort((a, b) => {
      const aPast = a.sortKey < startOfTodayMs;
      const bPast = b.sortKey < startOfTodayMs;
      if (aPast !== bPast) return aPast ? -1 : 1;
      return a.sortKey - b.sortKey;
    });
  }, [reminders, vaccines]);

  // Group overdue + due-today reminders + warning insights by pet for the
  // Needs Attention section. Pets with zero items don't render.
  const petsWithNeeds = useMemo(() => {
    return pets
      .map(pet => ({ pet, items: buildPetNeedsItems(pet, reminders, entries, vaccines) }))
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

  // Today's Care: account-wide rollup of what got logged today across
  // all pets. We bucket entries by kind so the user sees "Meals: 1 of 2
  // logged · Walks: 2.0 mi today · Meds: all caught up · Health: no
  // notes" without having to scroll through Recent Activity. Empty
  // state replaces the cards when nothing's been logged yet today.
  const distanceUnit = resolveDistanceUnit(profile?.distanceUnit);
  const todaysCare = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startMs = startOfDay.getTime();

    const todays = entries.filter(e => +new Date(e.timestamp) >= startMs);
    const meals = todays.filter(e => e.type === 'fed');
    const walks = todays.filter(e => e.type === 'walk');
    const meds = todays.filter(e => e.type === 'medication');
    const health = todays.filter(e => e.type === 'symptom');

    // "1 of 2 logged" only reads cleanly when we know the day's target.
    // We estimate a target based on per-pet feeding reminders that are
    // due today; if none exist we just show the raw logged count.
    const startOfTodayMs = startMs;
    const endOfTodayMs = startMs + 24 * 60 * 60 * 1000;
    const mealsDueToday = reminders.filter(r => {
      if (r.type !== 'feeding') return false;
      if (r.isCompleted) return false;
      const due = +new Date(r.dueDate);
      return due >= startOfTodayMs && due < endOfTodayMs;
    });
    const mealsTarget = mealsDueToday.length;

    const walkDistanceMeters = walks.reduce(
      (acc, w) => acc + (w.distanceMeters ?? 0),
      0,
    );

    // Med reminders past their due time that haven't been logged today
    // are the "missed" count. If everything's accounted for we say
    // "All caught up."
    const medsDueToday = reminders.filter(r => {
      if (r.type !== 'medication') return false;
      if (r.isCompleted) return false;
      const due = +new Date(r.dueDate);
      return due >= startOfTodayMs && due < endOfTodayMs;
    });
    const medsLogged = meds.length;
    const medsMissed = Math.max(0, medsDueToday.length - medsLogged);

    return {
      anyLoggedToday: todays.length > 0,
      meals: {
        logged: meals.length,
        target: mealsTarget,
      },
      walks: {
        count: walks.length,
        distanceMeters: walkDistanceMeters > 0 ? walkDistanceMeters : null,
      },
      meds: {
        logged: medsLogged,
        missed: medsMissed,
      },
      health: {
        count: health.length,
      },
    };
  }, [entries, reminders]);

  const doMarkDone = async (reminder: Reminder) => {
    if (!profile) return;
    const result = await markReminderDone({
      uid: profile.id,
      reminder,
      allReminders: reminders,
      allPets: pets,
      actorName: profile.displayName ?? user?.displayName ?? null,
    });
    setToast(result.message);
  };

  const onMarkDone = (reminder: Reminder) => {
    const name = getReminderName(reminder);
    const isRecurring = reminder.repeatType !== 'none';
    // Group-aware confirmation: a multi-pet reminder reads as "for
    // Yahzi, Moqui, and Lovie" so the user knows tapping mark-done
    // completes every pet in one go.
    const group = findGroupForReminder(reminder, reminders);
    const groupPets = group.petIds
      .map(id => pets.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);
    const forPhrase = (() => {
      if (groupPets.length === 0) return '';
      if (groupPets.length === 1) return ` for ${groupPets[0].name}`;
      if (groupPets.length === 2) return ` for ${groupPets[0].name} and ${groupPets[1].name}`;
      return ` for ${groupPets.slice(0, -1).map(p => p.name).join(', ')}, and ${groupPets[groupPets.length - 1].name}`;
    })();
    Alert.alert(
      'Mark done?',
      isRecurring
        ? `Complete "${name}"${forPhrase}. Next due date will be scheduled.`
        : `Complete "${name}"${forPhrase}. This reminder will be marked complete.`,
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

  // Long-press shortcut: file a minimal entry for the only pet without
  // opening the sheet. Multi-pet households still go through the sheet
  // since we don't know which pet they meant. The kinds that need
  // mandatory metadata (meal subtype, symptom severity, medication
  // name) also fall through to the sheet so we don't write malformed
  // entries.
  const QUICK_PRESS_KINDS: Record<QuickLogKind, boolean> = {
    fed: false,
    walk: true,
    medication: false,
    training: true,
    symptom: false,
    grooming: true,
  };
  const handleQuickLogLongPress = async (kind: QuickLogKind) => {
    if (!user) return;
    if (pets.length === 0) {
      handleQuickLog(kind);
      return;
    }
    if (pets.length > 1) {
      setToast('Choose a pet to quick log faster next time.');
      setQuickLogKind(kind);
      return;
    }
    if (!QUICK_PRESS_KINDS[kind]) {
      // Needs a sheet to capture the required subtype.
      setQuickLogKind(kind);
      return;
    }
    const pet = pets[0];
    const meta = JOURNAL_META[kind as JournalEntryType];
    try {
      await createEntry(user.uid, {
        petId: pet.id,
        type: kind as JournalEntryType,
        title: meta?.label ?? labelFor(kind),
        note: undefined,
        timestamp: new Date().toISOString(),
        durationMin: null,
        amount: null,
        subtype: null,
        severity: null,
        photoUrl: null,
        actorUid: user.uid,
        actorName: user.displayName ?? null,
      });
      setToast(`${labelFor(kind)} logged for ${pet.name}.`);
    } catch (e: any) {
      Alert.alert('Could not log', e?.message ?? 'Try again.');
    }
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

        {todayItems.length > 0 ? (
          <>
            <SectionHeader
              title="Today"
              action={{ label: 'Calendar', onPress: () => router.push('/calendar') }}
            />
            <View style={styles.todayList}>
              {todayItems.slice(0, 6).map((item, idx) => {
                if (item.kind === 'overdue_reminder' || item.kind === 'today_reminder') {
                  const r = item.reminder;
                  const pet = pets.find(p => p.id === r.petId);
                  const isOverdueItem = item.kind === 'overdue_reminder';
                  const isVaccineReminder = r.type === 'vaccination';
                  return (
                    <Pressable
                      key={`r-${r.id}`}
                      onPress={() => {
                        // Vaccination reminders open the date-picker sheet
                        // so the user can log the dose (today default,
                        // back-date supported). Every other category just
                        // routes to the Reminders tab.
                        if (isVaccineReminder) {
                          const cleanName = canonicalizeReminderTitle(getReminderName(r))
                            .replace(/\s+(vaccine|renewal)$/i, '')
                            .trim() || getReminderName(r);
                          setVaccineSheet({
                            petId: r.petId,
                            vaccineName: cleanName,
                            reminderId: r.id,
                            reminderNotificationId: r.notificationId ?? null,
                          });
                          return;
                        }
                        router.push({ pathname: '/(tabs)/reminders' });
                      }}
                      style={({ pressed }) => [
                        styles.todayRow,
                        isOverdueItem && styles.todayRowDanger,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <View
                        style={[
                          styles.todayDot,
                          { backgroundColor: isOverdueItem ? colors.danger : colors.warning },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.todayTitle} numberOfLines={1}>
                          {getReminderName(r)}
                        </Text>
                        <Text style={styles.todaySub} numberOfLines={1}>
                          {pet?.name ?? ''}
                          {pet?.name ? ' · ' : ''}
                          {(() => {
                            const dueAt = toDate(r.dueDate);
                            if (!dueAt) return isOverdueItem ? 'Overdue' : 'Due today';
                            // Overdue items show the ACTUAL due date (e.g.
                            // "Mar 14, 2024" / "Yesterday, 9:00 AM"), not just a
                            // weekday — otherwise an item that lapsed months ago
                            // reads as if it's due today.
                            return isOverdueItem
                              ? `Overdue · ${fmtRelative(dueAt)}`
                              : `Due today · ${format(dueAt, 'h:mm a')}`;
                          })()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }
                const v = item.vaccine;
                const pet = pets.find(p => p.id === item.petId);
                const expired = item.kind === 'expired_vaccine';
                return (
                  <Pressable
                    key={`v-${v.id}`}
                    onPress={() =>
                      setVaccineSheet({
                        petId: item.petId,
                        vaccineName: v.vaccineName,
                      })
                    }
                    style={({ pressed }) => [
                      styles.todayRow,
                      expired && styles.todayRowDanger,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View
                      style={[
                        styles.todayDot,
                        { backgroundColor: expired ? colors.danger : colors.warning },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.todayTitle} numberOfLines={1}>
                        {v.vaccineName} vaccine
                      </Text>
                      <Text style={styles.todaySub} numberOfLines={1}>
                        {pet?.name ?? ''}
                        {pet?.name ? ' · ' : ''}
                        {expired
                          ? (v.expirationDate ? `Expired · ${fmtDay(v.expirationDate)}` : 'Expired')
                          : 'Expires today'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {todayItems.length > 6 ? (
                <Pressable
                  onPress={() => router.push({ pathname: '/(tabs)/reminders' })}
                  hitSlop={8}
                  style={styles.todayMoreRow}
                >
                  <Text style={styles.todayMoreText}>
                    + {todayItems.length - 6} more for today
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {pets.length > 0 ? (
          <>
            <SectionHeader title="Today's Care" />
            <View style={styles.careGrid}>
              <CareCard
                icon="restaurant-outline"
                tint={colors.warning}
                label="Meals"
                value={
                  todaysCare.meals.target > 0
                    ? `${todaysCare.meals.logged} of ${todaysCare.meals.target} logged`
                    : todaysCare.meals.logged > 0
                      ? `${todaysCare.meals.logged} logged`
                      : 'None yet'
                }
              />
              <CareCard
                icon="walk-outline"
                tint={colors.primary}
                label="Walks"
                value={
                  todaysCare.walks.distanceMeters
                    ? `${fmtDistance(todaysCare.walks.distanceMeters, distanceUnit)} today`
                    : todaysCare.walks.count > 0
                      ? `${todaysCare.walks.count} walk${todaysCare.walks.count === 1 ? '' : 's'}`
                      : 'No walks yet'
                }
              />
              <CareCard
                icon="medkit-outline"
                tint={colors.danger}
                label="Meds"
                value={
                  todaysCare.meds.missed > 0
                    ? `${todaysCare.meds.missed} missed`
                    : todaysCare.meds.logged > 0
                      ? 'All caught up'
                      : 'None today'
                }
              />
              <CareCard
                icon="heart-outline"
                tint={colors.accent}
                label="Health"
                value={
                  todaysCare.health.count > 0
                    ? `${todaysCare.health.count} note${todaysCare.health.count === 1 ? '' : 's'}`
                    : 'No notes today'
                }
              />
            </View>
            {!todaysCare.anyLoggedToday ? (
              <Text style={styles.careEmpty}>
                No care logged yet today. Use Quick Log below to capture meals,
                walks, meds, and health notes.
              </Text>
            ) : null}
          </>
        ) : null}

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
                  // Vaccine rows open the Mark Vaccine Done sheet so
                  // the user can confirm the date (today by default,
                  // pickable for back-dating). The sheet records the
                  // dose and schedules the next renewal in one tap.
                  if (item.isVaccine && item.reminder) {
                    const vaccineName = canonicalizeReminderTitle(item.reminder.title)
                      .replace(/\s+(vaccine|renewal)$/i, '')
                      .trim();
                    setVaccineSheet({
                      petId: pet.id,
                      vaccineName,
                      reminderId: item.reminder.id,
                      reminderNotificationId: item.reminder.notificationId ?? null,
                    });
                  } else if (item.reminder) {
                    router.push({ pathname: '/pet/[id]', params: { id: pet.id } });
                  }
                }}
                onViewAll={() => router.push({ pathname: '/(tabs)/reminders', params: { petId: pet.id } })}
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
              onLongPress={() => void handleQuickLogLongPress(q.kind)}
              delayLongPress={350}
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
                reminders={reminders}
                vaccines={vaccines}
                entries={entries}
              />
            ))
          )}
        </View>

        {receivedShares.length > 0 ? (
          <>
            <SectionHeader title="Pets you help care for" />
            <View style={styles.list}>
              {receivedShares.map(s => (
                <View key={s.id} style={styles.sharedRow}>
                  <View style={styles.sharedIcon}>
                    <Ionicons name="people-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sharedName}>{s.petName}</Text>
                    <Text style={styles.sharedMeta}>
                      Shared by {s.ownerName ?? s.ownerEmail ?? 'an owner'} ·{' '}
                      {s.role === 'caregiver' ? 'Caregiver' : 'View only'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

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
            <SectionHeader
              title="Recent Activity"
              action={
                entries.length > recentEntries.length
                  ? { label: `View all (${entries.length})`, onPress: () => setActivityModalOpen(true) }
                  : { label: 'View all', onPress: () => setActivityModalOpen(true) }
              }
            />
            <View style={styles.activityCard}>
              {recentEntries.map((entry, idx) => {
                const entryPets = getEntryPetIds(entry)
                  .map(id => pets.find(p => p.id === id))
                  .filter((p): p is NonNullable<typeof p> => !!p);
                return (
                  <View key={entry.id} style={idx > 0 && styles.divider}>
                    <TimelineRow
                      entry={entry}
                      pets={entryPets}
                      showPet
                      distanceUnit={distanceUnit}
                    />
                  </View>
                );
              })}
            </View>
          </>
        ) : pets.length > 0 ? (
          <>
            <SectionHeader title="Recent Activity" />
            <View style={[styles.card, { marginHorizontal: spacing.base }]}>
              <Text style={styles.emptyText}>
                No activity yet. Use Quick Log above to capture meals, walks, meds, and health notes here.
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

      <ActivityModal
        visible={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        entries={entries}
        pets={pets}
        distanceUnit={distanceUnit}
        ownerUid={user?.uid}
      />

      <Toast message={toast} onHidden={() => setToast(null)} bottomOffset={120} />

      <MarkVaccineDoneSheet
        visible={vaccineSheet !== null}
        onClose={() => setVaccineSheet(null)}
        petId={vaccineSheet?.petId ?? ''}
        vaccineName={vaccineSheet?.vaccineName ?? ''}
        reminderId={vaccineSheet?.reminderId}
        reminderNotificationId={vaccineSheet?.reminderNotificationId}
        onCompleted={({ nextDue }) => {
          const fmtNext = nextDue ? ` Next reminder: ${new Date(nextDue).toLocaleDateString()}.` : '';
          setToast(`Vaccine marked complete.${fmtNext}`);
        }}
      />
    </Screen>
  );
}

// Small 2x2 card used on the Today's Care grid. Tint sets both the
// icon background and accent so the row reads consistently with the
// existing record stat tiles.
function CareCard({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <View style={careCardStyles.wrap}>
      <View style={[careCardStyles.icon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={careCardStyles.label}>{label}</Text>
        <Text style={careCardStyles.value} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const careCardStyles = StyleSheet.create({
  wrap: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  icon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
});

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
  // Day greeting sits below the persistent TabsHeader. Single column now,
  // no need for the row layout since emergency/profile moved to the header.
  greeting: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  date: { fontSize: 13, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
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
  // Today section — daily-planner-style chronological list. Each row
  // gets a colored dot at the leading edge (red for overdue/expired,
  // amber for due-today/expiring-today) so the urgency reads at a
  // glance without crowding the row with chips.
  todayList: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  todayRowDanger: { borderLeftColor: colors.danger },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  todaySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  todayMoreRow: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  todayMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  careGrid: {
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  careEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    lineHeight: 19,
  },
  sharedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  sharedIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  sharedName: { fontSize: 14, fontWeight: '700', color: colors.text },
  sharedMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
