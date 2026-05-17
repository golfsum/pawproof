// Central source of truth for reminder categories. Every surface that
// renders a reminder — the form, list, notifications, home, pet
// previews — pulls labels, icons, notification copy, placeholders, and
// repeat defaults from here so the vocabulary stays consistent.
//
// Naming history: the original schema used `type` (with 'walking',
// 'custom') and `title`. This file calls the same thing `category`
// (with 'walk', 'general') and `name`. Old docs still load — the
// `getReminderCategory()` / `getReminderName()` helpers handle the
// alias. Old `type` values that aren't in the new union ('training',
// 'other') get mapped to 'general' so legacy data never crashes
// the renderer.

import type { JournalEntryType, Reminder, ReminderType, RepeatType } from '@/types/models';

export type ReminderCategory =
  | 'feeding'
  | 'walk'
  | 'medication'
  | 'vet_visit'
  | 'vaccination'
  | 'grooming'
  | 'flea_tick'
  | 'heartworm'
  | 'nail_trim'
  | 'general';

/**
 * Per-category UI + notification config. `label` is the chip/badge
 * label. `noun` is the lower-case word we sprinkle into notification
 * sentences ("Yahzi's walk is due now"). `defaultName` is the title
 * we fall back to when the user didn't type one (we always write
 * something so the lock screen isn't empty).
 */
export interface ReminderCategoryConfig {
  label: string;
  noun: string;
  defaultName: string;
  icon: string;
  tint: string;
  placeholder: string;
  /** Notification body for a single pet. Title is the reminder name. */
  notificationBodySingle: (petName: string) => string;
  /**
   * Notification body for a grouped multi-pet reminder. Receives the
   * comma-joined pet list and the reminder name so we can inline it
   * ("Dinner is due for Yahzi and Moqui.") for feeding/walk/etc.
   */
  notificationBodyMultiple: (petNames: string, reminderName: string) => string;
}

// Tint values live here so the config covers visual identity end-to-
// end and nobody has to dig through theme constants. Hex picked to
// match existing colors.primary / colors.danger / etc.
const TINT = {
  amber: '#f59e0b',
  teal: '#2a8fa8',
  red: '#d54545',
  purple: '#9b7bbf',
  green: '#3fa68c',
  blue: '#5ea3c4',
  orange: '#ff8a4c',
  pink: '#e07a99',
  textMuted: '#6b7480',
} as const;

export const REMINDER_CATEGORY_CONFIG: Record<ReminderCategory, ReminderCategoryConfig> = {
  feeding: {
    label: 'Feeding',
    noun: 'meal',
    defaultName: 'Feeding reminder',
    icon: 'restaurant-outline',
    tint: TINT.amber,
    placeholder: 'e.g. Breakfast, Dinner, Lunch',
    notificationBodySingle: (pet) => `${possessive(pet)} meal is due now.`,
    notificationBodyMultiple: (pets, name) => `${name} is due for ${pets}.`,
  },
  walk: {
    label: 'Walk',
    noun: 'walk',
    defaultName: 'Walk reminder',
    icon: 'walk-outline',
    tint: TINT.teal,
    placeholder: 'e.g. Morning walk, Evening walk',
    notificationBodySingle: (pet) => `${possessive(pet)} walk is due now.`,
    notificationBodyMultiple: (pets, name) => `${name} is due for ${pets}.`,
  },
  medication: {
    label: 'Medication',
    noun: 'medication',
    defaultName: 'Medication reminder',
    icon: 'medkit-outline',
    tint: TINT.red,
    placeholder: 'e.g. Flea meds, Heartworm pill',
    notificationBodySingle: (pet) =>
      `${possessive(pet)} medication is due now. Check the dose before giving.`,
    notificationBodyMultiple: (pets) =>
      `Medication is due for ${pets}. Check each pet's dose.`,
  },
  vet_visit: {
    label: 'Vet visit',
    noun: 'vet visit',
    defaultName: 'Vet visit',
    icon: 'pulse-outline',
    tint: TINT.red,
    placeholder: 'e.g. Annual checkup, Follow-up visit',
    notificationBodySingle: (pet) => `${pet} has a vet visit reminder.`,
    notificationBodyMultiple: (pets) => `Vet visit reminder for ${pets}.`,
  },
  vaccination: {
    label: 'Vaccination',
    noun: 'vaccine',
    defaultName: 'Vaccine reminder',
    icon: 'shield-checkmark-outline',
    tint: TINT.green,
    placeholder: 'e.g. Rabies vaccine, DHPP booster',
    notificationBodySingle: (pet) => `${possessive(pet)} vaccine reminder is due now.`,
    notificationBodyMultiple: (pets) => `Vaccine reminder is due for ${pets}.`,
  },
  grooming: {
    label: 'Grooming',
    noun: 'grooming',
    defaultName: 'Grooming reminder',
    icon: 'cut-outline',
    tint: TINT.blue,
    placeholder: 'e.g. Bath, Brush, Grooming appointment',
    notificationBodySingle: (pet) => `${possessive(pet)} grooming reminder is due now.`,
    notificationBodyMultiple: (pets, name) => `${name} is due for ${pets}.`,
  },
  flea_tick: {
    label: 'Flea / Tick',
    noun: 'flea and tick prevention',
    defaultName: 'Flea / tick reminder',
    icon: 'bug-outline',
    tint: TINT.orange,
    placeholder: 'e.g. Flea treatment, Tick prevention',
    notificationBodySingle: (pet) =>
      `${possessive(pet)} flea and tick prevention is due now.`,
    notificationBodyMultiple: (pets) =>
      `Flea and tick prevention is due for ${pets}.`,
  },
  heartworm: {
    label: 'Heartworm',
    noun: 'heartworm prevention',
    defaultName: 'Heartworm reminder',
    icon: 'heart-outline',
    tint: TINT.pink,
    placeholder: 'e.g. Heartworm pill',
    notificationBodySingle: (pet) =>
      `${possessive(pet)} heartworm prevention is due now.`,
    notificationBodyMultiple: (pets) =>
      `Heartworm prevention is due for ${pets}.`,
  },
  nail_trim: {
    label: 'Nail trim',
    noun: 'nail trim',
    defaultName: 'Nail trim',
    icon: 'hand-left-outline',
    tint: TINT.purple,
    placeholder: 'e.g. Nail trim',
    notificationBodySingle: (pet) => `${possessive(pet)} nail trim reminder is due now.`,
    notificationBodyMultiple: (pets) => `Nail trim reminder is due for ${pets}.`,
  },
  general: {
    label: 'Reminder',
    noun: 'reminder',
    defaultName: 'Reminder',
    icon: 'bookmark-outline',
    tint: TINT.textMuted,
    placeholder: 'e.g. Order food, Replace collar',
    notificationBodySingle: (pet) => `${possessive(pet)} reminder is due now.`,
    notificationBodyMultiple: (pets, name) => `${name} is due for ${pets}.`,
  },
};

/**
 * Suggested default repeat per category. The reminder form applies
 * this when the user picks a category UNLESS they've already edited
 * the repeat field. Vet visits stay one-shot; vaccines/preventatives
 * default to monthly/yearly so the form does the right thing without
 * extra taps.
 */
export const DEFAULT_REPEAT_BY_CATEGORY: Record<ReminderCategory, RepeatType> = {
  feeding: 'daily',
  walk: 'daily',
  medication: 'daily',
  vet_visit: 'none',
  vaccination: 'yearly',
  grooming: 'monthly',
  flea_tick: 'monthly',
  heartworm: 'monthly',
  nail_trim: 'monthly',
  general: 'none',
};

// ── Normalization ──────────────────────────────────────────────────
//
// Old reminders use `type` (with values 'walking' / 'custom') and
// `title`. New reminders use `category` (with 'walk' / 'general')
// and `name`. The helpers below accept either shape and return the
// new canonical form. Every renderer should funnel through these.

const TYPE_TO_CATEGORY: Record<string, ReminderCategory> = {
  feeding: 'feeding',
  walking: 'walk',
  walk: 'walk',
  medication: 'medication',
  vet_visit: 'vet_visit',
  vaccination: 'vaccination',
  grooming: 'grooming',
  flea_tick: 'flea_tick',
  heartworm: 'heartworm',
  nail_trim: 'nail_trim',
  custom: 'general',
  general: 'general',
};

const CATEGORY_TO_TYPE: Record<ReminderCategory, ReminderType> = {
  feeding: 'feeding',
  walk: 'walking',
  medication: 'medication',
  vet_visit: 'vet_visit',
  vaccination: 'vaccination',
  grooming: 'grooming',
  flea_tick: 'flea_tick',
  heartworm: 'heartworm',
  nail_trim: 'nail_trim',
  general: 'custom',
};

/** Map a legacy ReminderType (or unknown string) to a canonical ReminderCategory. */
export function normalizeReminderCategory(value: string | undefined | null): ReminderCategory {
  if (!value) return 'general';
  return TYPE_TO_CATEGORY[value] ?? 'general';
}

/**
 * Inverse mapping for write paths. When the form writes a new doc we
 * also stamp the legacy `type` field so the web dashboard (which
 * still reads `type`) keeps working until it's updated.
 */
export function categoryToLegacyType(category: ReminderCategory): ReminderType {
  return CATEGORY_TO_TYPE[category];
}

/**
 * Pull the canonical category off a reminder doc. Prefers the new
 * `category` field, falls back to `type`. Unknown values collapse
 * to 'general'.
 */
export function getReminderCategory(
  reminder: Pick<Reminder, 'category' | 'type'>,
): ReminderCategory {
  return normalizeReminderCategory(reminder.category ?? reminder.type);
}

/**
 * Pull the user-facing reminder name. Prefers `name`, falls back to
 * `title`, and finally to the category default ("Walk reminder")
 * so the lock screen / list never shows an empty string.
 */
export function getReminderName(
  reminder: Pick<Reminder, 'category' | 'type' | 'name' | 'title'>,
): string {
  const fromUser = (reminder.name ?? reminder.title ?? '').trim();
  if (fromUser) return fromUser;
  const cat = getReminderCategory(reminder);
  return REMINDER_CATEGORY_CONFIG[cat].defaultName;
}

/** Convenience: full config for a reminder. */
export function getReminderConfig(
  reminder: Pick<Reminder, 'category' | 'type'>,
): ReminderCategoryConfig {
  return REMINDER_CATEGORY_CONFIG[getReminderCategory(reminder)];
}

/** Convenience: placeholder for the reminder-name input on the form. */
export function getReminderNamePlaceholder(category: ReminderCategory): string {
  return REMINDER_CATEGORY_CONFIG[category].placeholder;
}

/** Convenience: default name suggestion when category changes and user hasn't typed yet. */
export function getReminderDefaultName(category: ReminderCategory): string {
  return REMINDER_CATEGORY_CONFIG[category].defaultName;
}

// ── Possessive helper ──────────────────────────────────────────────
//
// Handles names ending in "s" correctly. "Moqui" → "Moqui's",
// "Charles" → "Charles'". Used by the notification body builders so
// we don't sound robotic.

export function possessive(name: string): string {
  if (!name) return '';
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

// ── Pet name formatting ────────────────────────────────────────────
//
// One canonical pet-list formatter used by both notification copy and
// in-app strings. Two pets → "X and Y". Three+ → "X, Y, and Z".

export function formatPetNames(names: string[]): string {
  const clean = names.filter(Boolean);
  if (clean.length === 0) return 'your pets';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
}

// ── Journal entry mapping (for "mark reminder done" → activity log) ─
//
// When a reminder is completed we also write a JournalEntry so the
// completion appears in Recent Activity and feeds streaks / weekly
// summaries. The mapping is mostly 1:1 with a few sensible coercions
// (flea/tick + heartworm are preventative meds, nail trim is a kind
// of grooming). Vaccination intentionally returns `null` because that
// flow has its own MarkVaccineDoneSheet which creates a VaccineRecord
// instead — we shouldn't double-log it.

const CATEGORY_TO_JOURNAL: Record<ReminderCategory, JournalEntryType | null> = {
  feeding: 'fed',
  walk: 'walk',
  medication: 'medication',
  vet_visit: 'vet_visit',
  vaccination: null,
  grooming: 'grooming',
  flea_tick: 'medication',
  heartworm: 'medication',
  nail_trim: 'grooming',
  general: 'note',
};

/**
 * The JournalEntry type to write when a reminder of this category is
 * marked done. Returns null for categories that have a dedicated flow
 * (vaccinations) so the caller skips the journal write.
 */
export function journalTypeForCategory(category: ReminderCategory): JournalEntryType | null {
  return CATEGORY_TO_JOURNAL[category];
}

// ── Category filter labels (for the reminders tab pill row) ────────
//
// The reminders tab groups categories into a smaller pill row so the
// filter doesn't overflow on narrow phones. Mapping is intentional
// (Meds covers medication, Vet covers vet_visit).

export interface CategoryFilterOption {
  key: 'all' | ReminderCategory;
  label: string;
}

export const REMINDER_CATEGORY_FILTERS: CategoryFilterOption[] = [
  { key: 'all', label: 'All' },
  { key: 'feeding', label: 'Feeding' },
  { key: 'walk', label: 'Walk' },
  { key: 'medication', label: 'Meds' },
  { key: 'vaccination', label: 'Vaccines' },
  { key: 'vet_visit', label: 'Vet' },
  { key: 'grooming', label: 'Grooming' },
];
