import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import type { Reminder, RepeatType } from '@/types/models';

export function computeNextDueDate(
  base: Date,
  repeatType: RepeatType,
  repeatInterval?: number | null,
): Date | null {
  switch (repeatType) {
    case 'none':
      return null;
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addWeeks(base, 1);
    case 'monthly':
      return addMonths(base, 1);
    case 'yearly':
      return addYears(base, 1);
    case 'custom_days':
      return addDays(base, Math.max(1, repeatInterval ?? 1));
    default:
      return null;
  }
}

export function describeRepeat(reminder: Pick<Reminder, 'repeatType' | 'repeatInterval'>): string {
  switch (reminder.repeatType) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'yearly':
      return 'Every year';
    case 'custom_days':
      return `Every ${reminder.repeatInterval ?? 1} days`;
    case 'none':
    default:
      return 'One time';
  }
}
