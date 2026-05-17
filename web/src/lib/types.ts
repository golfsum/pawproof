// Shared types that mirror the mobile app's Firestore documents. Web
// reads the same collections, so the shapes must agree. Timestamps are
// normalized to ISO strings at the data layer.
//
// Source of truth: `pawproof/src/types/models.ts`. Keep this file in
// lockstep so the web doesn't silently drop fields the mobile app
// writes (multi-pet entries, walk distance, reminder groups, etc).

export type Species =
  | "dog"
  | "cat"
  | "bird"
  | "rabbit"
  | "reptile"
  | "fish"
  | "small_mammal"
  | "other";

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  freeOcrScansUsed?: number;
  onboardingCompleted?: boolean;
  trackingInterests?: string[];
  notificationPrefs?: {
    groupMultiPet?: boolean;
    vaccineWarnDays?: 14 | 30 | 60 | 90;
  };
  /** 'mi' | 'km'. Distances stored as meters; UI converts. */
  distanceUnit?: "mi" | "km";
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed?: string;
  birthday?: string | null;
  approxAgeMonths?: number | null;
  weightKg?: number | null;
  photoUrl?: string | null;
  microchip?: string;
  vetName?: string;
  vetPhone?: string;
  vetWebsite?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
  insurance?: string;
  notes?: string;
  emergencyNotes?: string;
  // Care instructions surfaced in emergency cards + sitter PDFs.
  // Every field is optional; missing ones get skipped in generated
  // docs so a half-filled section doesn't read awkward.
  feedingInstructions?: string;
  walkRoutine?: string;
  behaviorNotes?: string;
  boardingInstructions?: string;
  favoriteThings?: string;
  createdAt: string;
  updatedAt: string;
}

// Legacy reminder type union — kept for back-compat with old docs.
// The newer `category` field uses 'walk' / 'general' instead of
// 'walking' / 'custom'. Renderers should prefer category over type.
export type ReminderType =
  | "feeding"
  | "walking"
  | "medication"
  | "vet_visit"
  | "vaccination"
  | "grooming"
  | "flea_tick"
  | "heartworm"
  | "nail_trim"
  | "custom"
  // Older builds occasionally wrote these — accept them on read so
  // the page doesn't crash; they're normalized via the category
  // resolver.
  | "training"
  | "other";

export type ReminderCategory =
  | "feeding"
  | "walk"
  | "medication"
  | "vet_visit"
  | "vaccination"
  | "grooming"
  | "flea_tick"
  | "heartworm"
  | "nail_trim"
  | "general";

export type RepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom_days";

export interface Reminder {
  id: string;
  petId: string;
  /** Legacy field, kept for back-compat. Prefer `category`. */
  type: ReminderType;
  /** New canonical category — 'walk' / 'general' instead of
   *  'walking' / 'custom'. Optional during the transition. */
  category?: ReminderCategory | string;
  /** Legacy field, kept for back-compat. Prefer `name`. */
  title: string;
  /** New user-facing reminder name. Mirrors `title` for old docs. */
  name?: string;
  notes?: string;
  dueDate: string;
  repeatType: RepeatType;
  repeatInterval?: number | null;
  isCompleted: boolean;
  nextDueDate?: string;
  lastCompletedAt?: string;
  notificationId?: string | null;
  /**
   * Multi-pet reminders share a single groupId across every doc the
   * form creates (one per pet). Single-pet reminders leave this unset.
   * The mobile app's "mark all done" flow uses it to complete every
   * pet in a single tap; the web side renders it for parity.
   */
  groupId?: string;
  createdAt: string;
}

export interface VaccineRecord {
  id: string;
  petId: string;
  vaccineName: string;
  dateGiven: string;
  expirationDate?: string | null;
  clinicName?: string;
  lotNumber?: string;
  notes?: string;
  documentId?: string | null;
  reminderId?: string | null;
  /**
   * Whether this dose has actually been administered. Defaults true
   * when missing so existing records read correctly.
   */
  isCompleted?: boolean;
  /**
   * True when expirationDate was derived from a schedule lookup
   * rather than read from the document or entered by the user.
   */
  expirationDerived?: boolean;
  /**
   * Source of the record. 'manual' = the user typed it. 'scan' = Smart
   * Scan extracted it. 'reminder' = the future Mark Done flow created
   * it from a fired renewal reminder.
   */
  source?: "manual" | "scan" | "reminder";
  createdAt: string;
}

export interface PetDocument {
  id: string;
  petId: string;
  fileUrl: string;
  fileType: string;
  kind: "vaccine" | "invoice" | "vet_record" | "insurance" | "other";
  title: string;
  ocrText?: string;
  extractedFields?: Record<string, unknown>;
  createdAt: string;
}

export type SymptomSeverity = "mild" | "medium" | "serious";

export interface JournalEntry {
  id: string;
  /**
   * Primary pet this entry is attached to. Kept for back-compat
   * with single-pet entries. New writes also populate `petIds` for
   * group entries.
   */
  petId: string;
  /**
   * All pets this entry covers. Multi-pet entries (group walks, a
   * shared dinner) write one doc with every pet ID here.
   */
  petIds?: string[];
  type: string;
  title: string;
  note?: string;
  timestamp: string;
  durationMin?: number | null;
  amount?: string | null;
  /** Subtype string used by the UI (meal name, walk type, etc.).
   *  Reminder completions stamp this with 'reminder'. */
  subtype?: string | null;
  severity?: SymptomSeverity | null;
  photoUrl?: string | null;
  /** Walk distance in meters (canonical). */
  distanceMeters?: number | null;
  /** Step count captured during a tracked walk. */
  stepCount?: number | null;
  /** Where the walk data came from. */
  walkSource?: "manual" | "motion" | "mixed" | "healthkit";
  /** Who logged it. Caregiver-logged entries get attribution. */
  actorUid?: string | null;
  actorName?: string | null;
  createdAt: string;
}

// ── Helpers shared by web pages ────────────────────────────────────

/**
 * Returns every pet this entry covers. Prefers the plural `petIds`
 * field, falls back to the singular `petId`. Mirrors the mobile
 * helper so multi-pet entries render under each pet's view.
 */
export function getEntryPetIds(
  entry: Pick<JournalEntry, "petId" | "petIds">,
): string[] {
  if (entry.petIds && entry.petIds.length > 0) return entry.petIds;
  return entry.petId ? [entry.petId] : [];
}

/** True when this entry covers the given pet. */
export function entryCoversPet(
  entry: Pick<JournalEntry, "petId" | "petIds">,
  petId: string,
): boolean {
  if (entry.petIds && entry.petIds.length > 0)
    return entry.petIds.includes(petId);
  return entry.petId === petId;
}
