import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInMonths,
  parseISO,
} from 'date-fns';

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtRelative(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  if (isToday(d)) return `Today, ${format(d, 'p')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'p')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'p')}`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  // For future-year dates (e.g. an annual vaccine reminder a year out), drop
  // the time and surface the year so "Mar 14" doesn't read ambiguously.
  return format(d, sameYear ? 'MMM d, p' : 'MMM d, yyyy');
}

export function fmtDay(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, sameYear ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
}

export function fmtDate(value: string | Date | null | undefined): string {
  const d = toDate(value ?? null);
  if (!d) return '-';
  return format(d, 'MMM d, yyyy');
}

export function fmtTime(value: string | Date | null | undefined): string {
  const d = toDate(value ?? null);
  if (!d) return '';
  return format(d, 'p');
}

export function fmtFromNow(value: string | Date): string {
  const d = toDate(value);
  if (!d) return '';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

export function fmtPetAge(birthday?: string | null, approxMonths?: number | null): string {
  if (birthday) {
    const d = toDate(birthday);
    if (d) {
      return fmtMonths(differenceInMonths(new Date(), d));
    }
  }
  if (approxMonths != null) {
    const formatted = fmtMonths(approxMonths);
    return formatted ? `~${formatted}` : '';
  }
  return '';
}

/**
 * Compact age formatter. Pets under 2 years show in months, older pets in
 * years (+ remaining months when non-zero).
 *   3   → "3 mo"
 *   23  → "23 mo"
 *   24  → "2 yrs"
 *   30  → "2 yrs 6 mo"
 */
export function fmtMonths(months: number): string {
  if (months < 0 || Number.isNaN(months)) return '';
  if (months < 1) return 'New';
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
  return `${years} ${years === 1 ? 'yr' : 'yrs'} ${remMonths} mo`;
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  const d = toDate(dueDate ?? null);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export function daysUntil(dueDate: string | Date | null | undefined): number | null {
  const d = toDate(dueDate ?? null);
  if (!d) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
