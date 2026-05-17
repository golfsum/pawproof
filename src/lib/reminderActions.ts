// Centralized "complete a reminder" logic, used by the Home Today
// row, the Reminders tab, the Needs Attention card, and the per-pet
// profile. Handles three concerns the call sites previously each
// reimplemented:
//
//   1. Multi-pet grouping: marking "Morning feed" done for Yahzi,
//      Moqui, and Lovie updates every doc in the group with one tap,
//      cancels the shared notification once, and reschedules once.
//   2. Recurrence: recurring reminders snap to their next due date;
//      one-shot reminders flip to isCompleted: true.
//   3. Notification rescheduling: single-pet → scheduleReminderForPet,
//      multi-pet → scheduleGroupedReminder, so the user gets the right
//      lock-screen wording on the next firing.

import { format } from 'date-fns';
import { cancelReminder, scheduleGroupedReminder, scheduleReminderForPet } from '@/lib/notifications';
import { createEntry, updateReminder } from '@/lib/firestore';
import { computeNextDueDate } from '@/utils/recurrence';
import { findGroupForReminder } from '@/utils/reminderGroups';
import {
  getReminderCategory,
  getReminderName,
  journalTypeForCategory,
} from '@/utils/reminderCategory';
import type { Pet, Reminder } from '@/types/models';

export interface MarkDoneResult {
  /** Human-readable summary for the confirmation toast. */
  message: string;
  /** True if the reminder was completed outright (one-shot). */
  completed: boolean;
  /** Next firing time, if the reminder recurs. */
  nextDue: Date | null;
}

/**
 * Mark a reminder done. If the reminder is part of a multi-pet group
 * (see `groupReminders`), every doc in the group is updated together.
 * Pets are looked up by id from `allPets` so the reschedule call gets
 * the right pet names for the lock-screen copy.
 *
 * Single-pet recurring reminder → reschedules and updates one doc.
 * Multi-pet recurring group → reschedules ONCE for the group, updates
 *                              every doc with the shared new notif id.
 * Any one-shot → marks every doc in the group completed and clears
 *                 the notification id.
 */
export async function markReminderDone(args: {
  uid: string;
  reminder: Reminder;
  allReminders: Reminder[];
  allPets: Pet[];
  /**
   * Display name of whoever tapped Mark done. Used to stamp the
   * resulting journal entry so the timeline can credit caregivers
   * ("Fed by Noel at 7:42 AM"). Omit for the pet owner — owner-logged
   * entries don't render attribution.
   */
  actorName?: string | null;
}): Promise<MarkDoneResult> {
  const { uid, reminder, allReminders, allPets, actorName } = args;
  const group = findGroupForReminder(reminder, allReminders);
  const primary = group.primary;
  const reminderName = getReminderName(primary);
  const category = getReminderCategory(primary);

  // Cancel the shared notification once. iOS is idempotent on cancel
  // so re-calling for already-cancelled ids is harmless.
  await cancelReminder(primary.notificationId);

  const next = computeNextDueDate(
    new Date(primary.dueDate),
    primary.repeatType,
    primary.repeatInterval,
  );

  if (!next) {
    // One-shot: every doc in the group flips to completed and loses
    // its notification id (which we already cancelled above).
    await Promise.all(
      group.reminders.map(r =>
        updateReminder(uid, r.id, {
          isCompleted: true,
          lastCompletedAt: new Date().toISOString(),
          notificationId: null,
        }),
      ),
    );
    await logCompletionEntry({
      uid,
      reminderName,
      category,
      petIds: group.petIds,
      isGrouped: group.isGrouped,
      actorName,
      notes: primary.notes,
    });
    return {
      message: group.isGrouped
        ? `Done. ${group.reminders.length} pets marked complete.`
        : 'Done. Reminder completed.',
      completed: true,
      nextDue: null,
    };
  }

  // Recurring: schedule the NEXT firing once for the whole group, then
  // update every doc to point at the new due date and shared notif id.
  const groupPets = group.petIds
    .map(id => allPets.find(p => p.id === id))
    .filter((p): p is Pet => !!p);

  let newNotifId: string | null = null;
  if (groupPets.length === 1) {
    newNotifId = await scheduleReminderForPet({
      pet: groupPets[0],
      reminderType: primary.type,
      reminderTitle: reminderName,
      when: next,
    });
  } else if (groupPets.length > 1) {
    newNotifId = await scheduleGroupedReminder({
      petNames: groupPets.map(p => p.name),
      reminderType: primary.type,
      reminderTitle: reminderName,
      when: next,
    });
  }

  await Promise.all(
    group.reminders.map(r =>
      updateReminder(uid, r.id, {
        dueDate: next.toISOString(),
        nextDueDate: next.toISOString(),
        lastCompletedAt: new Date().toISOString(),
        notificationId: newNotifId,
      }),
    ),
  );

  await logCompletionEntry({
    uid,
    reminderName,
    category,
    petIds: group.petIds,
    isGrouped: group.isGrouped,
    actorName,
    notes: primary.notes,
  });

  // Friendly toast — match the wording the Reminders tab was already
  // using, with a count prefix when the group covered multiple pets.
  const sameYear = next.getFullYear() === new Date().getFullYear();
  const dateStr = sameYear ? format(next, 'EEE, MMM d') : format(next, 'MMM d, yyyy');
  const timeStr = format(next, 'h:mm a');
  const prefix = group.isGrouped ? `Done for ${group.reminders.length} pets.` : 'Done.';

  return {
    message: `${prefix} Next reminder: ${dateStr} at ${timeStr}.`,
    completed: false,
    nextDue: next,
  };
}

// Writes a single JournalEntry covering every pet in the group so the
// completion shows up in Recent Activity, feeds streaks / weekly
// summaries, and renders the right category icon. The `subtype:
// 'reminder'` marks the entry as a reminder completion (vs a Quick
// Log), in case future UI wants to badge or filter on that. We never
// fail the surrounding mark-done if the entry write fails — that
// would be confusing ("Reminder won't mark complete!"). Instead we
// log and swallow.
async function logCompletionEntry(args: {
  uid: string;
  reminderName: string;
  category: ReturnType<typeof getReminderCategory>;
  petIds: string[];
  isGrouped: boolean;
  actorName?: string | null;
  notes?: string;
}): Promise<void> {
  const { uid, reminderName, category, petIds, isGrouped, actorName, notes } = args;
  const journalType = journalTypeForCategory(category);
  if (!journalType) return; // vaccinations use their own flow
  if (petIds.length === 0) return;

  try {
    await createEntry(uid, {
      petId: petIds[0],
      ...(isGrouped ? { petIds } : {}),
      type: journalType,
      title: reminderName,
      timestamp: new Date().toISOString(),
      durationMin: null,
      amount: null,
      // `subtype: 'reminder'` tags this as a reminder completion so
      // future filters can pick it out from Quick Log entries.
      subtype: 'reminder',
      severity: null,
      photoUrl: null,
      note: notes?.trim() || undefined,
      actorUid: uid,
      actorName: actorName ?? null,
    });
  } catch (err) {
    console.warn('[reminderActions] failed to log completion entry', err);
  }
}
