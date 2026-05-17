import { format, isSameDay, isTomorrow, isYesterday } from 'date-fns';
import type {
  JournalEntry,
  Pet,
  Reminder,
  VaccineRecord,
} from '@/types/models';
import { entryCoversPet } from '@/types/models';
import { fmtDate, daysUntil, isOverdue } from './dates';
import { JOURNAL_META } from './petIcon';
import {
  getReminderCategory,
  getReminderConfig,
  getReminderName,
} from './reminderCategory';
import { canonicalizeReminderTitle, canonicalizeVaccineName } from './vaccineNames';

// Priority-ordered "what does this pet need next" preview that the
// Pets and Home cards both render. Replaces the old "Next: ..." strip
// that read as "next" even when the item was overdue.
//
// Priority (highest first):
//   1. Overdue task reminder        → red
//   2. Expired vaccine              → red
//   3. Reminder due today           → amber
//   4. Vaccine expiring in <= 60d   → amber
//   5. Future reminder (Next)       → neutral
//   6. Future vaccine renewal       → neutral
//   7. Recent activity log          → neutral
//   8. No upcoming care             → muted
//
// Returns null when nothing's relevant — callers can hide the strip.

export type PreviewTone = 'danger' | 'warning' | 'muted';

export interface PetPreview {
  prefix:
    | 'Overdue'
    | 'Expired'
    | 'Due today'
    | 'Expiring soon'
    | 'Next'
    | 'Last activity';
  title: string;
  whenLabel: string;
  tone: PreviewTone;
  iconName: string;
}

export function pickPetPreview(input: {
  pet: Pet;
  reminders: Reminder[];
  vaccines: VaccineRecord[];
  entries: JournalEntry[];
}): PetPreview | null {
  const { pet, reminders, vaccines, entries } = input;
  const petReminders = reminders.filter(
    r => r.petId === pet.id && !r.isCompleted,
  );
  const petVaccines = vaccines.filter(v => v.petId === pet.id);

  // 1. Overdue task reminder. Vaccination-type reminders are routed
  // to bucket 2 below so they read as "Expired: ... vaccine" instead
  // of "Overdue: ... vaccine" — vaccines aren't "overdue" the way a
  // morning walk is, and the polished wording matters.
  const overdueReminders = petReminders
    .filter(r => isOverdue(r.dueDate) && getReminderCategory(r) !== 'vaccination')
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  if (overdueReminders.length > 0) {
    const r = overdueReminders[0];
    const config = getReminderConfig(r);
    return {
      prefix: 'Overdue',
      title: getReminderName(r),
      whenLabel: relativePastLabel(new Date(r.dueDate)),
      tone: 'danger',
      iconName: config.icon,
    };
  }

  // 2. Expired vaccine — surface from real vaccine records first,
  // then fall back to overdue vaccination-type reminders so users on
  // older data (where renewals exist as reminders but no vaccine
  // record yet) still get the right label.
  const expired = petVaccines
    .filter(v => v.expirationDate && (daysUntil(v.expirationDate) ?? 999) < 0)
    .sort(
      (a, b) =>
        +new Date(b.expirationDate as string) -
        +new Date(a.expirationDate as string),
    );
  if (expired.length > 0) {
    const v = expired[0];
    return {
      prefix: 'Expired',
      title: `${canonicalizeVaccineName(v.vaccineName)} vaccine`,
      whenLabel: fmtDate(v.expirationDate),
      tone: 'danger',
      iconName: 'shield-checkmark-outline',
    };
  }

  const overdueVaccineReminders = petReminders
    .filter(r => getReminderCategory(r) === 'vaccination' && isOverdue(r.dueDate))
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  if (overdueVaccineReminders.length > 0) {
    const r = overdueVaccineReminders[0];
    const rawName = getReminderName(r);
    const cleanName =
      canonicalizeReminderTitle(rawName).replace(/\s+(vaccine|renewal)$/i, '').trim()
      || rawName;
    return {
      prefix: 'Expired',
      title: `${cleanName} vaccine`,
      whenLabel: fmtDate(r.dueDate),
      tone: 'danger',
      iconName: 'shield-checkmark-outline',
    };
  }

  // 3. Reminder due today — earliest first.
  const today = petReminders
    .filter(r => {
      if (isOverdue(r.dueDate)) return false;
      const d = daysUntil(r.dueDate);
      return d != null && d === 0;
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  if (today.length > 0) {
    const r = today[0];
    const config = getReminderConfig(r);
    return {
      prefix: 'Due today',
      title: getReminderName(r),
      whenLabel: format(new Date(r.dueDate), 'h:mm a'),
      tone: 'warning',
      iconName: config.icon,
    };
  }

  // 4. Vaccine expiring soon (within 60 days).
  const expiring = petVaccines
    .filter(v => {
      if (!v.expirationDate) return false;
      const d = daysUntil(v.expirationDate);
      return d != null && d >= 0 && d <= 60;
    })
    .sort(
      (a, b) =>
        +new Date(a.expirationDate as string) -
        +new Date(b.expirationDate as string),
    );
  if (expiring.length > 0) {
    const v = expiring[0];
    const days = daysUntil(v.expirationDate as string) ?? 0;
    const whenLabel =
      days === 0
        ? 'Today'
        : days === 1
          ? 'Tomorrow'
          : `In ${days} day${days === 1 ? '' : 's'}`;
    return {
      prefix: 'Expiring soon',
      title: `${canonicalizeVaccineName(v.vaccineName)} vaccine`,
      whenLabel,
      tone: 'warning',
      iconName: 'shield-checkmark-outline',
    };
  }

  // 5. Future reminder — soonest first.
  const future = petReminders
    .filter(r => {
      const d = daysUntil(r.dueDate);
      return d != null && d > 0;
    })
    .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate));
  if (future.length > 0) {
    const r = future[0];
    const config = getReminderConfig(r);
    return {
      prefix: 'Next',
      title: getReminderName(r),
      whenLabel: relativeFutureLabel(new Date(r.dueDate)),
      tone: 'muted',
      iconName: config.icon,
    };
  }

  // 6. Last logged activity — pets that have a journal entry on file
  // but no upcoming reminders still get a useful preview row.
  const petEntries = entries
    .filter(e => entryCoversPet(e, pet.id))
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  if (petEntries.length > 0) {
    const e = petEntries[0];
    const meta = JOURNAL_META[e.type] ?? JOURNAL_META.note;
    return {
      prefix: 'Last activity',
      title: e.title,
      whenLabel: relativePastLabel(new Date(e.timestamp), { withTime: true }),
      tone: 'muted',
      iconName: meta.icon as string,
    };
  }

  return null;
}

function relativePastLabel(
  d: Date,
  opts: { withTime?: boolean } = {},
): string {
  const now = new Date();
  if (isSameDay(d, now)) {
    return opts.withTime ? `Today, ${format(d, 'h:mm a')}` : 'Today';
  }
  if (isYesterday(d)) return 'Yesterday';
  const days = daysUntil(d.toISOString());
  if (days != null && days >= -7) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  }
  return fmtDate(d.toISOString());
}

function relativeFutureLabel(d: Date): string {
  const now = new Date();
  if (isSameDay(d, now)) return format(d, 'h:mm a');
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  const days = daysUntil(d.toISOString());
  if (days != null && days <= 7) {
    return `${format(d, 'EEEE')}, ${format(d, 'h:mm a')}`;
  }
  return fmtDate(d.toISOString());
}
