import { differenceInDays, startOfDay, subDays } from 'date-fns';
import type { JournalEntry, Pet, SymptomSeverity } from '@/types/models';

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
 * No ML, no diagnosis — just counts, streaks, and "missing for N days" checks
 * that surface things worth a glance:
 *   - Symptom recurrence (3+ of the same in 14 days)
 *   - Missed meal streak (no fed log in 24h+)
 *   - Walk streak (no walks in 3+ days for dogs)
 *   - Recent activity counters (7-day rollups)
 */
export function generateInsights(pet: Pet, entries: JournalEntry[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const last7 = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) < 7);
  const last14 = entries.filter(e => differenceInDays(now, new Date(e.timestamp)) < 14);

  // ── Symptom recurrence ──
  const symptoms = last14.filter(e => e.type === 'symptom');
  if (symptoms.length >= 3) {
    // Find the most-common subtype
    const counts: Record<string, number> = {};
    for (const s of symptoms) {
      const k = s.subtype || 'symptom';
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const [topSub, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
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
 * Aggregate counts for a date range — used by both insights and the
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
  const filtered = entries.filter(e => {
    const t = new Date(e.timestamp);
    return t >= from && t <= to;
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
