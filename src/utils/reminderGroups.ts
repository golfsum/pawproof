// Multi-pet reminders are stored as N docs (one per pet) that share a
// `groupId`. The UI collapses them into one logical row so the user
// sees "Morning feed · Yahzi, Moqui, Lovie · Today 7:00 AM" with a
// single Mark done button instead of three identical cards.
//
// Grouping resolves in this order:
//   1. `groupId` — stamped by the form when the user picks 2+ pets.
//   2. `notificationId` — older multi-pet reminders share a single
//      notification id, so we can still collapse them.
//   3. Solo bucket keyed by the reminder id, so single-pet reminders
//      pass through unchanged.

import type { Reminder } from '@/types/models';

export interface ReminderGroup {
  /** Stable key for React lists. Uses groupId / notificationId / id. */
  key: string;
  /** Primary reminder — drives display fields (title, dueDate, etc). */
  primary: Reminder;
  /** Every reminder in the group, in original order. One entry for solo. */
  reminders: Reminder[];
  /** Convenience: petIds covered by the group. */
  petIds: string[];
  /** True if more than one reminder is in the bundle. */
  isGrouped: boolean;
}

/**
 * Stable group key for a single reminder. Two reminders with the same
 * key belong to the same logical reminder. Pure function so callers
 * can dedupe / look up without rebuilding the whole group list.
 */
export function groupKeyOf(r: Reminder): string {
  if (r.groupId) return `g:${r.groupId}`;
  if (r.notificationId) return `n:${r.notificationId}`;
  return `s:${r.id}`;
}

/**
 * Collapse a flat reminder list into logical groups. Preserves the
 * order each group's primary appears in the input so list filters /
 * sorts upstream keep working.
 */
export function groupReminders(reminders: Reminder[]): ReminderGroup[] {
  const groups = new Map<string, Reminder[]>();
  const order: string[] = [];

  for (const r of reminders) {
    const key = groupKeyOf(r);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(r);
  }

  return order.map(key => {
    const bundle = groups.get(key)!;
    return {
      key,
      primary: bundle[0],
      reminders: bundle,
      petIds: bundle.map(r => r.petId),
      isGrouped: bundle.length > 1,
    };
  });
}

/**
 * Find the group that contains the given reminder, scoped to the
 * provided reminder list. Used when a per-pet view (Needs Attention,
 * pet profile) needs to "mark all done" rather than only this row.
 */
export function findGroupForReminder(
  reminder: Reminder,
  allReminders: Reminder[],
): ReminderGroup {
  const key = groupKeyOf(reminder);
  const members = allReminders.filter(r => groupKeyOf(r) === key);
  return {
    key,
    primary: members[0] ?? reminder,
    reminders: members.length > 0 ? members : [reminder],
    petIds: members.length > 0 ? members.map(r => r.petId) : [reminder.petId],
    isGrouped: members.length > 1,
  };
}

/**
 * Generates a short, sortable, URL-safe group id. Used by the
 * reminder form when the user picks 2+ pets so every doc the form
 * creates shares the same id. Length is deliberate — long enough to
 * be unique without a UUID library, short enough to read in logs.
 */
export function newReminderGroupId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}
