// Mirrors a small subset of the mobile date helpers — just enough for
// the dashboard counters and badges. ISO strings in, numbers/booleans
// out.

const MS_DAY = 24 * 60 * 60 * 1000;

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / MS_DAY);
}

export function isOverdue(iso: string | null | undefined): boolean {
  const days = daysUntil(iso);
  return days != null && days < 0;
}
