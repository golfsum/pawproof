import type { Reminder, ReminderType } from '@/types/models';
import {
  REMINDER_CATEGORY_CONFIG,
  formatPetNames,
  getReminderCategory,
  getReminderConfig,
  getReminderName,
  normalizeReminderCategory,
  possessive,
  type ReminderCategory,
} from '@/utils/reminderCategory';

// Builds the title + body strings that show up in the OS notification
// banner. Centralized so every code path that schedules a reminder
// produces consistent, pet-aware copy. Previously each scheduler did
// its own thing and a couple of them passed `title === body`, which
// renders as "Walk Walk" on the lock screen — no more.
//
// The reminder NAME is the notification title (so users see what they
// typed: "Walky", "Breakfast", "Flea meds"). The notification BODY is
// pet + category aware ("Yahzi's walk is due now."). For grouped multi-
// pet reminders, the body inlines the reminder name where it reads
// naturally ("Dinner is due for Yahzi and Moqui.").

export interface NotificationCopy {
  title: string;
  body: string;
}

export interface SingleReminderInput {
  petName: string;
  reminderType: ReminderType;
  /** Display name the user typed on the form ("Walky", "Breakfast"). */
  reminderTitle: string;
  /**
   * 'due' = firing now. 'overdue' = the original due time has passed
   * and we're catching up with a late nudge. The system rarely uses
   * 'overdue' since expo-notifications fires at the scheduled time,
   * but the helper supports it for explicit late-nudge schedules.
   */
  state?: 'due' | 'overdue';
}

/**
 * Build the notification for a single-pet reminder. Title is the
 * reminder name; body is "{Pet}'s {noun} is due now."
 */
export function buildReminderCopy(input: SingleReminderInput): NotificationCopy {
  const { petName, reminderType, reminderTitle, state = 'due' } = input;
  const category = normalizeReminderCategory(reminderType);
  const config = REMINDER_CATEGORY_CONFIG[category];

  const title = reminderTitle.trim() || config.defaultName;

  if (state === 'overdue') {
    return {
      title: `${title} overdue`,
      body: `${petName} still has a ${config.noun} reminder due.`,
    };
  }

  return {
    title,
    body: config.notificationBodySingle(petName),
  };
}

export interface VaccineNotificationInput {
  petName: string;
  vaccineName: string;
  // 'soon' fires N days out; 'today' fires on the expiration date;
  // 'expired' fires after it's lapsed.
  state: 'soon' | 'today' | 'expired';
  daysOut?: number; // only used for 'soon'
}

/**
 * Vaccine records use "Expired" / "Expiring soon" vocabulary
 * (distinct from task reminders, which use "Overdue"). Title leads
 * with the vaccine name so the lock screen reads cleanly even when
 * the user has multiple vaccines about to lapse.
 */
export function buildVaccineCopy(input: VaccineNotificationInput): NotificationCopy {
  const { petName, vaccineName, state, daysOut } = input;
  if (state === 'expired') {
    return {
      title: 'Vaccine expired',
      body: `${possessive(petName)} ${vaccineName} vaccine is expired.`,
    };
  }
  if (state === 'today') {
    return {
      title: 'Vaccine expiring today',
      body: `${possessive(petName)} ${vaccineName} vaccine expires today.`,
    };
  }
  const dayCount = typeof daysOut === 'number' && daysOut > 0 ? daysOut : 30;
  return {
    title: 'Vaccine expiring soon',
    body: `${possessive(petName)} ${vaccineName} vaccine expires in ${dayCount} day${dayCount === 1 ? '' : 's'}.`,
  };
}

export interface GroupedReminderInput {
  petNames: string[];
  reminderType: ReminderType;
  /** Display name the user typed on the form. */
  reminderTitle: string;
}

/**
 * Group several pets into one notification when the same reminder
 * fires at the same time for them. Falls back to the single-pet
 * helper when the list has one entry. Body wording varies by
 * category — medication gets a dose-safety nudge, feeding/walk/
 * grooming inline the reminder name for natural sentences.
 */
export function buildGroupedReminderCopy(input: GroupedReminderInput): NotificationCopy {
  const { petNames, reminderType, reminderTitle } = input;
  if (petNames.length <= 1) {
    return buildReminderCopy({
      petName: petNames[0] ?? '',
      reminderType,
      reminderTitle,
    });
  }

  const category = normalizeReminderCategory(reminderType);
  const config = REMINDER_CATEGORY_CONFIG[category];
  const name = reminderTitle.trim() || config.defaultName;
  const list = formatPetNames(petNames);

  return {
    title: name,
    body: config.notificationBodyMultiple(list, name),
  };
}

/**
 * Convenience: build copy straight off a Reminder doc. The new path
 * everywhere — schedulers should funnel through this so we keep one
 * source of truth.
 */
export function buildReminderNotification(
  reminder: Pick<Reminder, 'category' | 'type' | 'name' | 'title'>,
  pets: Array<{ name: string }>,
): NotificationCopy {
  const config = getReminderConfig(reminder);
  const name = getReminderName(reminder);
  const cleanNames = pets.map(p => p.name);

  if (cleanNames.length > 1) {
    const list = formatPetNames(cleanNames);
    return {
      title: name,
      body: config.notificationBodyMultiple(list, name),
    };
  }

  const petName = cleanNames[0] ?? 'Your pet';
  return {
    title: name,
    body: config.notificationBodySingle(petName),
  };
}

// Re-export the canonical category type so callers don't need to
// remember which module owns it.
export type { ReminderCategory };
