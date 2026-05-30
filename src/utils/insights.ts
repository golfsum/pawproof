import { differenceInDays, formatDistanceToNowStrict, startOfDay, subDays } from 'date-fns';
import type { JournalEntry, Pet, Reminder, SymptomSeverity, VaccineRecord } from '@/types/models';

export interface Insight {
  /** Unique key for React. */
  id: string;
  tone: 'info' | 'warning' | 'danger' | 'success';
  icon: string;
  title: string;
  body: string;
}

/**
 * Generate lightweight care insights from a pet's recent journal entries.
 *
 * No ML, no diagnosis. Just counts, streaks, and "missing for N days" checks
 * that surface things worth a glance:
 *   - Symptom recurrence (3+ of the same in 14 days)
 *   - Missed meal streak (no fed log in 24h+)
 *   - Walk streak (no walks in 3+ days for dogs)
 *   - Recent activity counters (7-day rollups)
 */
export function generateInsights(
  pet: Pet,
  entries: JournalEntry[],
  vaccines: VaccineRecord[] = [],
  reminders: Reminder[] = [],
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const last7 = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) < 7);
  const last14 = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) < 14);
  const last30 = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) < 30);
  const petVaccines = vaccines.filter(v => v.petId === pet.id);
  const petReminders = reminders.filter(r => r.petId === pet.id);

  // ── Symptom recurrence ──
  const symptoms = last14.filter(e => e.type === 'symptom');
  if (symptoms.length >= 3) {
    // Find the most-common subtype
    const counts: Record<string, number> = {};
    for (const s of symptoms) {
      const k = s.subtype || 'symptom';
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const [topSub, topCount] = top ?? ['symptom', 0];
    if (topCount >= 3) {
      insights.push({
        id: 'sym-recurrence',
        tone: 'warning',
        icon: 'alert-circle-outline',
        title: 'Symptom pattern',
        body: `${pet.name} has had ${topSub.toLowerCase()} logged ${topCount} times in 14 days. Consider mentioning to your vet.`,
      });
    }
  }

  // Severe symptoms in the last 7 days deserve their own callout
  const severe = last7.filter(e => e.type === 'symptom' && e.severity === 'serious');
  if (severe.length > 0) {
    insights.push({
      id: 'severe-sym',
      tone: 'danger',
      icon: 'warning-outline',
      title: 'Severe symptom logged',
      body: `${severe.length} serious symptom${severe.length === 1 ? '' : 's'} logged this week. If unresolved, contact your vet.`,
    });
  }

  // ── Meal frequency ──
  const meals = entries.filter(e => e.type === 'fed');
  const lastMeal = meals[0]; // entries already sorted desc by timestamp
  if (lastMeal) {
    const hours = (now.getTime() - new Date(lastMeal.timestamp).getTime()) / 36e5;
    if (hours > 24) {
      insights.push({
        id: 'no-meal',
        tone: 'warning',
        icon: 'restaurant-outline',
        title: 'No meal logged recently',
        body: `Last meal for ${pet.name} was ${Math.round(hours)} hours ago. Log a meal to keep the streak going.`,
      });
    }
  }

  // ── Walk streak (dogs only) ──
  if (pet.species === 'dog') {
    const walks = last7.filter(e => e.type === 'walk');
    const lastWalk = walks[0];
    if (!lastWalk) {
      insights.push({
        id: 'no-walks',
        tone: 'info',
        icon: 'walk-outline',
        title: 'No walks logged this week',
        body: `Capture walks with Quick Log to spot exercise patterns over time.`,
      });
    } else {
      const days = differenceInDays(now, new Date(lastWalk.timestamp));
      if (days >= 3) {
        insights.push({
          id: 'walk-gap',
          tone: 'warning',
          icon: 'walk-outline',
          title: 'Walk gap',
          body: `It's been ${days} days since ${pet.name}'s last logged walk.`,
        });
      }
    }
  }

  // ── Meal count this week ──
  // If the user is actively logging meals (>= 3 in the last 7 days)
  // but the count is well below the typical 2/day, flag it. Avoids
  // false positives for users who only log meals occasionally.
  const fedCount = last7.filter(e => e.type === 'fed').length;
  if (fedCount >= 3 && fedCount < 10) {
    const expected = 14; // 2 meals/day
    const missed = expected - fedCount;
    if (missed >= 3) {
      insights.push({
        id: 'meal-gap',
        tone: 'info',
        icon: 'restaurant-outline',
        title: 'Meal logging gap',
        body: `${pet.name} has ${fedCount} meals logged this week. If you usually log 2/day, ${missed} may be missing.`,
      });
    }
  }

  // ── Medication adherence ──
  // For each medication reminder on this pet, check whether a med
  // entry was logged at roughly the expected times. Simple v1: if the
  // reminder is daily and there's no med log in the last 36h, flag.
  const medReminders = petReminders.filter(
    r => r.type === 'medication' && !r.isCompleted && r.repeatType === 'daily',
  );
  if (medReminders.length > 0) {
    const lastMed = entries.find(e => e.type === 'medication');
    const hoursSince = lastMed
      ? (now.getTime() - new Date(lastMed.timestamp).getTime()) / 36e5
      : Infinity;
    if (hoursSince > 36) {
      insights.push({
        id: 'med-gap',
        tone: 'warning',
        icon: 'medkit-outline',
        title: 'Medication not logged recently',
        body: `${pet.name} has a daily medication reminder but no medication log in the last day and a half. This may be worth watching.`,
      });
    }
  }

  // Missed dose count this month (cheap check, doesn't try to know
  // which med). If they have any daily med reminder and < 20 med logs
  // in last 30 days, surface it.
  if (medReminders.length > 0) {
    const medsThisMonth = last30.filter(e => e.type === 'medication').length;
    if (medsThisMonth > 0 && medsThisMonth < 20) {
      const expected = 30;
      const gap = expected - medsThisMonth;
      if (gap >= 5) {
        insights.push({
          id: 'med-month-gap',
          tone: 'info',
          icon: 'medkit-outline',
          title: 'Medication coverage',
          body: `${gap} days of medication logs may be missing this month. Use Quick Log → Meds to keep the record up to date.`,
        });
      }
    }
  }

  // ── Vaccine expiration windows ──
  for (const v of petVaccines) {
    if (!v.expirationDate) continue;
    const expDate = new Date(v.expirationDate);
    if (Number.isNaN(expDate.getTime())) continue; // skip malformed dates
    const days = differenceInDays(expDate, now);
    if (days < 0) {
      insights.push({
        id: `vax-expired-${v.id}`,
        tone: 'danger',
        icon: 'shield-checkmark-outline',
        title: `${v.vaccineName} expired`,
        body: `${pet.name}'s ${v.vaccineName} vaccine expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. Schedule a renewal with your vet.`,
      });
    } else if (days <= 60) {
      insights.push({
        id: `vax-soon-${v.id}`,
        tone: days <= 30 ? 'warning' : 'info',
        icon: 'shield-checkmark-outline',
        title: `${v.vaccineName} expires soon`,
        body: `${pet.name}'s ${v.vaccineName} vaccine expires in ${days} day${days === 1 ? '' : 's'}.`,
      });
    }
  }

  // ── Grooming gap ──
  const groomings = entries.filter(e => e.type === 'grooming');
  if (groomings.length > 0) {
    const lastGroom = groomings[0];
    const days = differenceInDays(now, new Date(lastGroom.timestamp));
    if (days >= 45) {
      insights.push({
        id: 'groom-gap',
        tone: 'info',
        icon: 'cut-outline',
        title: 'Grooming overdue',
        body: `No grooming logged for ${pet.name} in ${days} days. Time for a bath, brush, or nail trim?`,
      });
    }
  }

  // ── Positive streak ──
  const fedThisWeek = last7.filter(e => e.type === 'fed').length;
  const walkedThisWeek = last7.filter(e => e.type === 'walk').length;
  if (fedThisWeek >= 7 && walkedThisWeek >= 3) {
    insights.push({
      id: 'good-week',
      tone: 'success',
      icon: 'sparkles-outline',
      title: 'Great week',
      body: `${pet.name} logged ${fedThisWeek} meals and ${walkedThisWeek} walks in the last 7 days. Keep it up.`,
    });
  }

  return insights;
}

/**
 * Aggregate counts for a date range, used by both insights and the
 * monthly summary screen.
 */
export interface ActivitySummary {
  meals: number;
  walks: number;
  medications: number;
  symptoms: number;
  vetVisits: number;
  groomings: number;
  totalEntries: number;
  symptomBreakdown: Record<string, number>;
  severityBreakdown: Record<SymptomSeverity, number>;
}

export function summarizeActivity(entries: JournalEntry[], fromIso: string, toIso?: string): ActivitySummary {
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : new Date();
  // If the range itself is invalid, fall back to an all-time summary rather
  // than silently returning zero counts (NaN comparisons exclude every row).
  const fromValid = !Number.isNaN(from.getTime());
  const toValid = !Number.isNaN(to.getTime());
  const filtered = entries.filter(e => {
    const t = new Date(e.timestamp);
    if (Number.isNaN(t.getTime())) return false; // skip malformed entry timestamps
    if (fromValid && t < from) return false;
    if (toValid && t > to) return false;
    return true;
  });
  const summary: ActivitySummary = {
    meals: 0,
    walks: 0,
    medications: 0,
    symptoms: 0,
    vetVisits: 0,
    groomings: 0,
    totalEntries: filtered.length,
    symptomBreakdown: {},
    severityBreakdown: { mild: 0, medium: 0, serious: 0 },
  };
  for (const e of filtered) {
    if (e.type === 'fed') summary.meals++;
    else if (e.type === 'walk') summary.walks++;
    else if (e.type === 'medication') summary.medications++;
    else if (e.type === 'symptom') {
      summary.symptoms++;
      if (e.subtype) summary.symptomBreakdown[e.subtype] = (summary.symptomBreakdown[e.subtype] ?? 0) + 1;
      if (e.severity) summary.severityBreakdown[e.severity]++;
    }
    else if (e.type === 'vet_visit') summary.vetVisits++;
    else if (e.type === 'grooming') summary.groomings++;
  }
  return summary;
}

export function startOfNDaysAgo(n: number): string {
  return startOfDay(subDays(new Date(), n)).toISOString();
}

// ── Vet report ───────────────────────────────────────────────────────
// Aggregates a pet's logged symptoms into a vet-ready summary: per-symptom
// frequency, first/last occurrence, severity mix, and a chronological log
// of every symptom entry (with the owner's note). Drives the Vet report
// screen and PDF.

export interface SymptomOccurrence {
  timestamp: string;        // ISO
  severity: SymptomSeverity | null;
  note: string | null;
}

export interface SymptomGroup {
  /** The symptom name (subtype), e.g. "Not eating", "Vomiting". */
  name: string;
  count: number;
  firstSeen: string;        // ISO of earliest occurrence in range
  lastSeen: string;         // ISO of most recent occurrence in range
  severityBreakdown: Record<SymptomSeverity, number>;
  /** Every occurrence, newest first. */
  occurrences: SymptomOccurrence[];
}

export interface SymptomReport {
  fromIso: string;
  toIso: string;
  totalSymptomEntries: number;
  /** Per-symptom groups, sorted by count desc then most-recent. */
  groups: SymptomGroup[];
  /** Flat chronological log (newest first) across all symptoms. */
  timeline: (SymptomOccurrence & { name: string })[];
}

/** Subtypes treated as "appetite / not eating" for the headline callout. */
const APPETITE_SUBTYPES = ['not eating', 'loss of appetite', 'not eating well', 'appetite', 'inappetence'];

export function isAppetiteSymptom(name: string | null | undefined): boolean {
  if (!name) return false;
  return APPETITE_SUBTYPES.includes(name.trim().toLowerCase());
}

/**
 * Build a symptom report for a pet over a date range. Pass the pet's
 * journal entries (already filtered to that pet). Malformed timestamps are
 * skipped. Defaults `to` to now when omitted.
 */
export function buildSymptomReport(
  entries: JournalEntry[],
  fromIso: string,
  toIso?: string,
): SymptomReport {
  const from = new Date(fromIso);
  const to = toIso ? new Date(toIso) : new Date();
  const fromValid = !Number.isNaN(from.getTime());
  const toValid = !Number.isNaN(to.getTime());

  const symptomEntries = entries.filter(e => {
    if (e.type !== 'symptom') return false;
    const t = new Date(e.timestamp);
    if (Number.isNaN(t.getTime())) return false;
    if (fromValid && t < from) return false;
    if (toValid && t > to) return false;
    return true;
  });

  const byName = new Map<string, SymptomGroup>();
  const timeline: (SymptomOccurrence & { name: string })[] = [];

  for (const e of symptomEntries) {
    const name = (e.subtype ?? '').trim() || 'Other';
    const occ: SymptomOccurrence = {
      timestamp: e.timestamp,
      severity: e.severity ?? null,
      note: (e.note ?? '').trim() || null,
    };
    timeline.push({ ...occ, name });

    let g = byName.get(name);
    if (!g) {
      g = {
        name,
        count: 0,
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
        severityBreakdown: { mild: 0, medium: 0, serious: 0 },
        occurrences: [],
      };
      byName.set(name, g);
    }
    g.count++;
    g.occurrences.push(occ);
    if (e.severity) g.severityBreakdown[e.severity]++;
    if (new Date(e.timestamp) < new Date(g.firstSeen)) g.firstSeen = e.timestamp;
    if (new Date(e.timestamp) > new Date(g.lastSeen)) g.lastSeen = e.timestamp;
  }

  // Newest-first within each group and the flat timeline.
  for (const g of byName.values()) {
    g.occurrences.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }
  timeline.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  const groups = [...byName.values()].sort(
    (a, b) => b.count - a.count || +new Date(b.lastSeen) - +new Date(a.lastSeen),
  );

  return {
    fromIso: fromValid ? from.toISOString() : new Date(0).toISOString(),
    toIso: toValid ? to.toISOString() : new Date().toISOString(),
    totalSymptomEntries: symptomEntries.length,
    groups,
    timeline,
  };
}
