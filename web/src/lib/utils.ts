import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard cn() helper. Composes Tailwind classes with proper conflict
// resolution. Identical signature to what shadcn ships, so any pattern
// from those docs drops in cleanly.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normalize any of the date shapes we might see in this codebase into
// a plain Date. Useful because Firestore docs occasionally slip
// through without being converted to ISO strings (Timestamp objects,
// raw {seconds, nanoseconds} payloads from cached snapshots, or
// values that have already become Date instances). Centralizing the
// coercion here keeps fmtDate / fmtDateTime / relativeTime resilient
// to whatever the caller hands them.
type DateInput =
  | string
  | number
  | Date
  | { toDate: () => Date }
  | { seconds: number; nanoseconds: number }
  | null
  | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return input;
  if (typeof input === "string" || typeof input === "number") {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === "object") {
    if (typeof (input as { toDate?: unknown }).toDate === "function") {
      try {
        const d = (input as { toDate: () => Date }).toDate();
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    }
    if (
      "seconds" in input &&
      "nanoseconds" in input &&
      typeof (input as { seconds: unknown }).seconds === "number"
    ) {
      const ts = input as { seconds: number; nanoseconds: number };
      const d = new Date(ts.seconds * 1000 + ts.nanoseconds / 1_000_000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function fmtDate(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "-";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "-";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Compact relative time: "5m ago", "2h ago", "3d ago", falling back to
// an absolute date for anything older than a week.
export function relativeTime(input: DateInput): string {
  const d = toDate(input);
  if (!d) return "-";
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(d);
}
