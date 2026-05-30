import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { Screen } from '@/components/Screen';
import { CalendarMonth, dayKey, type DayInfo, type DayMarker } from '@/components/CalendarMonth';
import { PetAvatar } from '@/components/PetAvatar';
import { useAuth } from '@/hooks/AuthProvider';
import { useData } from '@/hooks/useData';
import { JOURNAL_META } from '@/utils/petIcon';
import {
  REMINDER_CATEGORY_CONFIG,
  getReminderCategory,
  getReminderName,
} from '@/utils/reminderCategory';
import { getEntryPetIds } from '@/types/models';
import { colors, fonts, radius, spacing, typography } from '@/theme';
import type { JournalEntry, Reminder, Pet } from '@/types/models';

// Monthly calendar view. Shows past journal entries and future
// reminders together so the user can scrub a month and see "what did
// we do" and "what's coming up" in one place. Dots beneath each day
// signal at-a-glance density; tapping a day expands a list panel
// below the grid with the specifics.
//
// Lives at /calendar; reachable from a button on the Reminders tab
// header. Reuses the existing useData() listeners — no extra Firestore
// reads.

type DayEvent =
  | { kind: 'entry'; entry: JournalEntry; time: Date; color: string; icon: string; pets: Pet[] }
  | { kind: 'reminder'; reminder: Reminder; time: Date; color: string; icon: string; pets: Pet[] };

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { pets, entries, reminders } = useData();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Build the per-day marker map across BOTH entries and reminders.
  // Each event contributes at most one dot per category so a day with
  // five walks doesn't draw five identical dots — we surface variety,
  // not volume.
  const byDay = useMemo(() => {
    const map: Record<string, { markers: DayMarker[]; seen: Set<string>; total: number }> = {};

    const stamp = (date: Date, color: string, categoryKey: string) => {
      const key = dayKey(date);
      const bucket = map[key] ?? { markers: [], seen: new Set<string>(), total: 0 };
      bucket.total++;
      if (!bucket.seen.has(categoryKey)) {
        bucket.markers.push({ color });
        bucket.seen.add(categoryKey);
      }
      map[key] = bucket;
    };

    for (const e of entries) {
      const d = new Date(e.timestamp);
      if (Number.isNaN(d.getTime())) continue; // skip malformed dates, don't crash the calendar
      const meta = JOURNAL_META[e.type] ?? JOURNAL_META.note;
      stamp(d, meta.tint, `e:${e.type}`);
    }
    for (const r of reminders) {
      if (r.isCompleted) continue;
      const d = new Date(r.dueDate);
      if (Number.isNaN(d.getTime())) continue;
      const config = REMINDER_CATEGORY_CONFIG[getReminderCategory(r)];
      stamp(d, config.tint, `r:${getReminderCategory(r)}`);
    }

    const out: Record<string, DayInfo> = {};
    for (const [key, bucket] of Object.entries(map)) {
      out[key] = {
        key,
        markers: bucket.markers,
        overflow: bucket.total > bucket.markers.length,
      };
    }
    return out;
  }, [entries, reminders]);

  // Resolve the list of events for the selected day. Entries first
  // (chronological), reminders second (also chronological). Both are
  // sorted by time so the panel reads top-to-bottom like a day plan.
  const dayEvents = useMemo<DayEvent[]>(() => {
    const items: DayEvent[] = [];

    for (const e of entries) {
      const when = new Date(e.timestamp);
      if (!isSameDay(when, selectedDay)) continue;
      const meta = JOURNAL_META[e.type] ?? JOURNAL_META.note;
      const ids = getEntryPetIds(e);
      const entryPets = ids
        .map(id => pets.find(p => p.id === id))
        .filter((p): p is Pet => !!p);
      items.push({
        kind: 'entry',
        entry: e,
        time: when,
        color: meta.tint,
        icon: meta.icon,
        pets: entryPets,
      });
    }

    for (const r of reminders) {
      if (r.isCompleted) continue;
      const when = new Date(r.dueDate);
      if (!isSameDay(when, selectedDay)) continue;
      const config = REMINDER_CATEGORY_CONFIG[getReminderCategory(r)];
      const pet = pets.find(p => p.id === r.petId);
      items.push({
        kind: 'reminder',
        reminder: r,
        time: when,
        color: config.tint,
        icon: config.icon,
        pets: pet ? [pet] : [],
      });
    }

    items.sort((a, b) => +a.time - +b.time);
    return items;
  }, [selectedDay, entries, reminders, pets]);

  const dayLabel = useMemo(() => {
    if (isSameDay(selectedDay, new Date())) return 'Today';
    return format(selectedDay, 'EEEE, MMMM d');
  }, [selectedDay]);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Calendar' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={typography.h1}>Calendar</Text>
            <Text style={styles.intro}>
              Past activity and upcoming reminders, all in one view.
            </Text>
          </View>
          {!isSameDay(selectedDay, new Date()) ? (
            <Pressable
              onPress={() => {
                const now = new Date();
                setMonth(startOfMonth(now));
                setSelectedDay(now);
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.todayPill, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="calendar-clear-outline" size={14} color={colors.primary} />
              <Text style={styles.todayPillText}>Today</Text>
            </Pressable>
          ) : null}
        </View>

        <CalendarMonth
          month={month}
          selectedDay={selectedDay}
          byDay={byDay}
          onChangeMonth={setMonth}
          onDayPress={d => {
            setSelectedDay(d);
            if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
              setMonth(startOfMonth(d));
            }
          }}
        />

        <Text style={styles.sectionLabel}>{dayLabel}</Text>
        {dayEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={20} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              Nothing on this day. Tap a different date or use Quick Log to capture today's care.
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {dayEvents.map((ev, idx) => (
              <Pressable
                key={`${ev.kind}-${idx}`}
                onPress={() => {
                  // Tapping a row navigates to the most useful target:
                  // entries → pet timeline, reminders → reminders tab.
                  if (ev.kind === 'entry') {
                    const firstPet = ev.pets[0];
                    if (firstPet) {
                      router.push({ pathname: '/pet/[id]', params: { id: firstPet.id } });
                    }
                  } else {
                    router.push('/(tabs)/reminders');
                  }
                }}
                style={({ pressed }) => [styles.eventRow, pressed && { opacity: 0.9 }]}
              >
                <View style={[styles.eventIcon, { backgroundColor: ev.color + '22' }]}>
                  <Ionicons name={ev.icon as any} size={18} color={ev.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {ev.kind === 'entry' ? ev.entry.title : getReminderName(ev.reminder)}
                  </Text>
                  <Text style={styles.eventSub} numberOfLines={1}>
                    {ev.pets.length > 0 ? `${ev.pets.map(p => p.name).join(', ')} · ` : ''}
                    {format(ev.time, 'h:mm a')}
                    {ev.kind === 'reminder' ? ' · Reminder' : ''}
                  </Text>
                </View>
                {ev.pets[0] ? <PetAvatar pet={ev.pets[0]} size={26} /> : null}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendRow}>
            <LegendDot color={REMINDER_CATEGORY_CONFIG.feeding.tint} label="Feeding" />
            <LegendDot color={REMINDER_CATEGORY_CONFIG.walk.tint} label="Walks" />
            <LegendDot color={REMINDER_CATEGORY_CONFIG.medication.tint} label="Meds" />
            <LegendDot color={REMINDER_CATEGORY_CONFIG.vaccination.tint} label="Vaccines" />
            <LegendDot color={REMINDER_CATEGORY_CONFIG.grooming.tint} label="Grooming" />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  intro: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
  },
  todayPillText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },

  sectionLabel: {
    fontSize: 13,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginLeft: 4,
  },
  eventsList: { gap: 8 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  eventIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  eventTitle: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  eventSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  emptyText: { flex: 1, fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  legend: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  legendTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: colors.textMuted },
});
