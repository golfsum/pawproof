import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { colors, fonts, radius } from '@/theme';

// Lightweight monthly calendar grid. Built from scratch so we don't
// pull in react-native-calendars just for one screen. The day cell
// renders up to 3 colored dots representing event categories — past
// entries (already happened) and future reminders (still due).
//
// The grid always shows 6 weeks so the layout doesn't jump when
// switching months. Leading/trailing days from adjacent months are
// rendered in a muted color and tap behaviour falls through to the
// usual onDayPress (so a user who taps "Feb 1" while looking at the
// January grid jumps to the right thing).

export interface DayMarker {
  /** Hex color for the dot. */
  color: string;
}

export interface DayInfo {
  /** YYYY-MM-DD key. Used by the parent to look up events. */
  key: string;
  /** Markers to draw under the day number. Capped at 3 visually. */
  markers: DayMarker[];
  /** True if there are more markers than were drawn (renders a "+" badge). */
  overflow?: boolean;
}

interface Props {
  /** First day of the month being displayed. */
  month: Date;
  /** Currently selected day, if any. */
  selectedDay?: Date | null;
  /** Per-day info lookup, keyed by 'YYYY-MM-DD'. */
  byDay: Record<string, DayInfo>;
  onChangeMonth: (next: Date) => void;
  onDayPress: (day: Date) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function dayKey(d: Date): string {
  // Defensive: an Invalid Date would make date-fns format() throw and
  // white-screen the calendar. Return a sentinel that simply won't match
  // any real day cell instead.
  if (Number.isNaN(d.getTime())) return 'invalid';
  return format(d, 'yyyy-MM-dd');
}

export function CalendarMonth({ month, selectedDay, byDay, onChangeMonth, onDayPress }: Props) {
  const grid = useMemo(() => {
    // 6 full weeks so the row count is stable. Some leading/trailing
    // days will belong to the previous/next month.
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    const cells: Date[] = [];
    let cursor = start;
    while (cursor <= end || cells.length < 42) {
      cells.push(cursor);
      cursor = addDays(cursor, 1);
      if (cells.length >= 42) break;
    }
    return cells;
  }, [month]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, -1))}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
        <Pressable
          onPress={() => onChangeMonth(addMonths(month, 1))}
          hitSlop={10}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`w-${i}`} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d, i) => {
          const inMonth = isSameMonth(d, month);
          const isSelected = selectedDay && isSameDay(d, selectedDay);
          const today = isToday(d);
          const info = byDay[dayKey(d)];
          const markers = info?.markers ?? [];
          return (
            <Pressable
              key={`d-${i}`}
              onPress={() => onDayPress(d)}
              style={({ pressed }) => [
                styles.cell,
                isSelected && styles.cellSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View
                style={[
                  styles.cellInner,
                  today && !isSelected && styles.cellToday,
                  isSelected && styles.cellInnerSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !inMonth && styles.dayNumMuted,
                    today && styles.dayNumToday,
                    isSelected && styles.dayNumSelected,
                  ]}
                >
                  {d.getDate()}
                </Text>
                <View style={styles.dotsRow}>
                  {markers.slice(0, 3).map((m, idx) => (
                    <View
                      key={`m-${idx}`}
                      style={[styles.dot, { backgroundColor: m.color }]}
                    />
                  ))}
                  {info?.overflow ? (
                    <Text style={styles.overflowText}>+</Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL_WIDTH_PERCENT = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  monthLabel: { fontSize: 16, fontFamily: fonts.display.bold, color: colors.text },

  weekdayRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginBottom: 4,
  },
  weekday: {
    width: CELL_WIDTH_PERCENT,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_WIDTH_PERCENT,
    aspectRatio: 1,
    padding: 2,
  },
  cellSelected: {},
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 4,
  },
  cellToday: {
    backgroundColor: colors.primarySoft,
  },
  cellInnerSelected: {
    backgroundColor: colors.primary,
  },
  dayNum: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  dayNumMuted: { color: colors.textFaint },
  dayNumToday: { color: colors.primary, fontWeight: '700' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
    minHeight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  overflowText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    marginLeft: 1,
  },
});

