import type { ReminderType, Species } from '@/types/models';

// Pre-canned training routines for puppies and kittens. Each routine
// is a bundle of suggested reminders the user can apply with one tap.
// Schedules use simple repeat types so they slot into the existing
// reminder model — no custom intervals needed.
//
// Editing these is safe: removing or adding entries doesn't break
// already-scheduled user reminders, since each tap creates fresh
// Firestore docs based on what's in this file at the moment of save.

export type RoutineAudience = 'puppy_young' | 'puppy_older' | 'kitten' | 'adult_dog' | 'adult_cat';

export interface RoutineItem {
  title: string;
  type: ReminderType;
  // Suggested time-of-day hour in 24h. The repeat type and offset
  // determine when the first occurrence fires.
  hourOfDay: number;
  repeatType: 'daily' | 'weekly' | 'monthly';
  notes?: string;
}

export interface Routine {
  id: string;
  audience: RoutineAudience;
  title: string;
  summary: string;
  items: RoutineItem[];
}

export const ROUTINES: Routine[] = [
  {
    id: 'puppy_basics',
    audience: 'puppy_young',
    title: 'Puppy basics (8–16 weeks)',
    summary: 'Crate, potty, leash, and short training sessions. Tuned for early socialization.',
    items: [
      { title: 'Potty break', type: 'custom', hourOfDay: 7, repeatType: 'daily', notes: 'Take outside first thing in the morning.' },
      { title: 'Potty break', type: 'custom', hourOfDay: 12, repeatType: 'daily', notes: 'Midday outdoor break.' },
      { title: 'Potty break', type: 'custom', hourOfDay: 18, repeatType: 'daily', notes: 'Evening break before settling.' },
      { title: 'Crate practice', type: 'custom', hourOfDay: 10, repeatType: 'daily', notes: 'Short, positive crate session (5–10 min).' },
      { title: 'Sit / stay session', type: 'custom', hourOfDay: 16, repeatType: 'daily', notes: 'Two or three 2-minute reps with treats.' },
      { title: 'Socialization outing', type: 'custom', hourOfDay: 15, repeatType: 'weekly', notes: 'New place, person, or surface this week.' },
    ],
  },
  {
    id: 'puppy_growing',
    audience: 'puppy_older',
    title: 'Growing puppy (4–12 months)',
    summary: 'Recall, leash manners, "wait", and impulse control. Reinforces puppy basics.',
    items: [
      { title: 'Loose-leash walk', type: 'walking', hourOfDay: 8, repeatType: 'daily', notes: 'Reward calm walking, redirect pulling.' },
      { title: 'Recall practice', type: 'custom', hourOfDay: 11, repeatType: 'daily', notes: 'Call from a short distance with treats.' },
      { title: '"Wait" at the door', type: 'custom', hourOfDay: 17, repeatType: 'daily', notes: 'Practice impulse control before going outside.' },
      { title: 'Chew toy rotation', type: 'custom', hourOfDay: 9, repeatType: 'weekly', notes: 'Swap chew toys to keep them novel.' },
      { title: 'Grooming handling', type: 'grooming', hourOfDay: 19, repeatType: 'weekly', notes: 'Brush, touch paws, look in ears.' },
    ],
  },
  {
    id: 'kitten_basics',
    audience: 'kitten',
    title: 'Kitten basics (8 weeks–6 months)',
    summary: 'Litter habits, scratching post, carrier prep, and gentle handling.',
    items: [
      { title: 'Litter box check', type: 'custom', hourOfDay: 8, repeatType: 'daily', notes: 'Scoop and refresh.' },
      { title: 'Play session', type: 'custom', hourOfDay: 17, repeatType: 'daily', notes: 'Wand or feather toy, 10 minutes.' },
      { title: 'Scratching post training', type: 'custom', hourOfDay: 11, repeatType: 'daily', notes: 'Reward when they use it.' },
      { title: 'Carrier desensitization', type: 'custom', hourOfDay: 14, repeatType: 'weekly', notes: 'Leave carrier out, drop treats inside.' },
      { title: 'Brush + paw handling', type: 'grooming', hourOfDay: 20, repeatType: 'weekly', notes: 'Short, positive grooming session.' },
    ],
  },
  {
    id: 'adult_dog_daily',
    audience: 'adult_dog',
    title: 'Adult dog daily care',
    summary: 'Exercise, training reinforcement, and weekly grooming check.',
    items: [
      { title: 'Morning walk', type: 'walking', hourOfDay: 7, repeatType: 'daily' },
      { title: 'Evening walk', type: 'walking', hourOfDay: 18, repeatType: 'daily' },
      { title: 'Brush teeth', type: 'grooming', hourOfDay: 21, repeatType: 'weekly', notes: 'A few times a week prevents dental issues.' },
      { title: 'Nail check', type: 'grooming', hourOfDay: 19, repeatType: 'weekly', notes: 'Trim if clicking on hard floors.' },
    ],
  },
  {
    id: 'adult_cat_daily',
    audience: 'adult_cat',
    title: 'Adult cat daily care',
    summary: 'Play, litter, grooming, and weekly health check.',
    items: [
      { title: 'Litter box', type: 'custom', hourOfDay: 9, repeatType: 'daily', notes: 'Scoop daily.' },
      { title: 'Play session', type: 'custom', hourOfDay: 19, repeatType: 'daily', notes: 'Interactive play helps prevent boredom.' },
      { title: 'Brush', type: 'grooming', hourOfDay: 20, repeatType: 'weekly', notes: 'Reduces shedding and hairballs.' },
      { title: 'Weight + body check', type: 'custom', hourOfDay: 10, repeatType: 'monthly', notes: 'Run hands along ribs and spine, log weight.' },
    ],
  },
];

// Choose which routines to show for a given pet based on species +
// approximate age. Falls back to the adult-care routine when age is
// unknown so users always have at least one suggestion.
export function routinesForPet(input: {
  species: Species;
  approxAgeMonths?: number | null;
  birthday?: string | null;
}): Routine[] {
  const months = ageMonths(input);
  if (input.species === 'dog') {
    if (months != null && months < 4) {
      return ROUTINES.filter(r => r.audience === 'puppy_young');
    }
    if (months != null && months < 12) {
      return ROUTINES.filter(
        r => r.audience === 'puppy_young' || r.audience === 'puppy_older',
      );
    }
    return ROUTINES.filter(r => r.audience === 'adult_dog');
  }
  if (input.species === 'cat') {
    if (months != null && months < 6) {
      return ROUTINES.filter(r => r.audience === 'kitten');
    }
    return ROUTINES.filter(r => r.audience === 'adult_cat');
  }
  return [];
}

function ageMonths(input: {
  approxAgeMonths?: number | null;
  birthday?: string | null;
}): number | null {
  if (typeof input.approxAgeMonths === 'number' && input.approxAgeMonths >= 0) {
    return input.approxAgeMonths;
  }
  if (input.birthday) {
    const d = new Date(input.birthday);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
  }
  return null;
}

// Compute the first firing time for a routine item given today's date.
// daily/weekly/monthly all use the same hour-of-day; the next-occurrence
// math just bumps the date forward to keep the first hit in the future.
export function nextOccurrenceForRoutineItem(item: RoutineItem): Date {
  const d = new Date();
  d.setHours(item.hourOfDay, 0, 0, 0);
  if (item.repeatType === 'daily') {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (item.repeatType === 'weekly') {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 7);
  } else {
    if (d.getTime() <= Date.now()) d.setMonth(d.getMonth() + 1);
  }
  return d;
}
