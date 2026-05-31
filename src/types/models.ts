// Centralised data models for PawProof. Firestore documents mirror these
// shapes; Timestamps are normalised to ISO strings at the data layer so the
// rest of the app can treat them as plain `Date | string`.

// Caregiver sharing: lets a pet owner grant another user access to a
// specific pet's records. Stored as a top-level collection so both the
// owner and the invited user can read it. Pet docs themselves stay
// under /users/{ownerUid}/pets/{petId}; consumers join the two via
// `petId` + `ownerUid`.
export type ShareRole = 'caregiver' | 'view_only';
export type ShareStatus = 'pending' | 'accepted' | 'revoked';

export interface PetShare {
  id: string;
  petId: string;
  petName: string; // denormalized for display before the share is accepted
  ownerUid: string;
  ownerEmail: string | null;
  ownerName: string | null;
  inviteeEmail: string; // lowercased
  inviteeUid: string | null; // null until accepted
  role: ShareRole;
  status: ShareStatus;
  inviteCode: string; // short, used for "accept by code" flow
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export type Species =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'rabbit'
  | 'reptile'
  | 'fish'
  | 'small_mammal'
  | 'other';

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  isPremium: boolean;
  /**
   * Lifetime count of Smart Scan / OCR runs the user has consumed under
   * the free tier. Compared against FREE_LIMITS.ocrScans by the gate so
   * the first scan is free (the "wow moment") and subsequent ones route
   * to the paywall.
   */
  freeOcrScansUsed?: number;
  /**
   * Set to true once the user finishes (or skips) the 4-step onboarding
   * wizard. The root layout uses this to decide whether to detour to
   * /onboarding after sign-in.
   */
  onboardingCompleted?: boolean;
  /**
   * Tracking interests captured in onboarding step 2. Pure UX hint:
   * powers default Quick Log surfaces and reminder suggestions, never
   * gates anything. Strings match QuickLog kinds + a few extras.
   */
  trackingInterests?: string[];
  /**
   * Per-user notification preferences. Optional so existing users
   * fall back to sensible defaults: group multi-pet reminders on,
   * 14-day vaccine expiration warning window.
   */
  notificationPrefs?: {
    groupMultiPet?: boolean;
    vaccineWarnDays?: 14 | 30 | 60 | 90;
  };
  /**
   * Preferred distance unit for walks and other movement stats. We store
   * canonical distances in meters; the UI converts on read. Defaults to
   * the locale's metric/imperial bias on first sign-in.
   */
  distanceUnit?: 'mi' | 'km';
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed?: string;
  birthday?: string | null;
  /**
   * Approximate age in months (canonical). Used when the user doesn't know
   * the exact birthday. Stored in months because pets are usually tracked
   * by month for the first 2 years.
   */
  approxAgeMonths?: number | null;
  /** Weight in kilograms (canonical). UI converts to/from lb. */
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
  // Care instructions, populated via the Care Instructions screen
  // and surfaced in the Pet Sitter PDF and the emergency-card share
  // text. Every field is optional; missing ones get skipped in
  // generated docs so a half-filled section doesn't read awkward.
  feedingInstructions?: string;
  walkRoutine?: string;
  behaviorNotes?: string;
  boardingInstructions?: string;
  favoriteThings?: string;
  createdAt: string;
  updatedAt: string;
}

export type JournalEntryType =
  | 'fed'
  | 'walk'
  | 'medication'
  | 'training'
  | 'grooming'
  | 'vet_visit'
  | 'symptom'
  | 'bathroom'
  | 'accident'
  | 'note'
  | 'photo';

export type SymptomSeverity = 'mild' | 'medium' | 'serious';

export interface JournalEntry {
  id: string;
  /**
   * Primary pet this entry is attached to. Kept for back-compat with
   * existing single-pet entries and as the "anchor" pet in the rare
   * code path that still expects exactly one pet. New writes always
   * populate `petIds` as well; readers should prefer `petIds` and
   * fall back to `[petId]`. Use `getEntryPetIds(entry)` to abstract.
   */
  petId: string;
  /**
   * All pets this entry covers. Multi-pet entries (e.g. a group walk
   * or dinner for the whole household) write one document with every
   * pet ID in this array. Older single-pet entries don't have it; the
   * helper falls back to `[petId]` for those.
   */
  petIds?: string[];
  type: JournalEntryType;
  title: string;
  note?: string;
  timestamp: string;
  durationMin?: number | null;
  amount?: string | null;     // e.g. "1 cup", "5mg", meal label
  subtype?: string | null;    // e.g. "breakfast", "vomiting"
  severity?: SymptomSeverity | null;
  photoUrl?: string | null;
  /**
   * Walk distance in meters. Canonical storage so unit prefs can change
   * without touching the data. UI reads via `formatDistance` with the
   * user's `distanceUnit`. Only set on walk entries (and only when the
   * user logged or estimated a distance — duration-only walks leave it
   * unset).
   */
  distanceMeters?: number | null;
  /**
   * Step count captured during the walk. Optional; usually only present
   * when the device pedometer was available. UI shows it as secondary
   * info, never as the headline number.
   */
  stepCount?: number | null;
  /**
   * How the walk's distance/steps were captured. Helps us label entries
   * accurately and decide whether to trust the value. Only set on walk
   * entries.
   *   'manual'   — user typed the distance
   *   'motion'   — captured live from CMPedometer / expo-sensors
   *   'mixed'    — motion captured it but the user corrected the number
   *   'healthkit'— pulled from HealthKit (future)
   */
  walkSource?: 'manual' | 'motion' | 'mixed' | 'healthkit';
  // Who logged this. Defaults to the pet owner; populated explicitly
  // when a caregiver (shared-access user) writes the entry so the
  // timeline can credit them ("Fed by Noel at 7:42 AM").
  actorUid?: string | null;
  actorName?: string | null;
  createdAt: string;
}

/**
 * Returns every pet this entry is associated with. Prefers the plural
 * `petIds` field when present; otherwise falls back to the singular
 * `petId`. Always returns at least one ID for valid entries.
 */
export function getEntryPetIds(entry: Pick<JournalEntry, 'petId' | 'petIds'>): string[] {
  if (entry.petIds && entry.petIds.length > 0) return entry.petIds;
  return entry.petId ? [entry.petId] : [];
}

/**
 * True when this entry covers the given pet. Use this anywhere you
 * used to write `entry.petId === pet.id` so multi-pet entries are
 * counted for every pet they cover.
 */
export function entryCoversPet(entry: Pick<JournalEntry, 'petId' | 'petIds'>, petId: string): boolean {
  if (entry.petIds && entry.petIds.length > 0) return entry.petIds.includes(petId);
  return entry.petId === petId;
}

export type ReminderType =
  | 'feeding'
  | 'walking'
  | 'medication'
  | 'vet_visit'
  | 'vaccination'
  | 'grooming'
  | 'flea_tick'
  | 'heartworm'
  | 'nail_trim'
  | 'custom';

export type RepeatType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom_days';

export interface Reminder {
  id: string;
  petId: string;
  /**
   * Legacy field, kept for back-compat. New writes also set `category`
   * (in `ReminderCategory` vocabulary — 'walk' instead of 'walking',
   * 'general' instead of 'custom'). Renderers should prefer
   * `getReminderCategory(reminder)` from `@/utils/reminderCategory`,
   * which falls back to `type` cleanly.
   */
  type: ReminderType;
  /**
   * New, user-facing category name (uses 'walk' / 'general' instead
   * of 'walking' / 'custom'). Optional during the transition — old
   * docs only have `type`, normalize via `getReminderCategory()`.
   */
  category?: string;
  /**
   * Legacy field, kept for back-compat. New writes also set `name`.
   * Renderers should prefer `getReminderName(reminder)` which falls
   * back to `title` and then to the category default name.
   */
  title: string;
  /**
   * New, user-facing reminder name. Mirrors `title` for old docs;
   * new docs write both fields so the web dashboard (which still
   * reads `title`) keeps working.
   */
  name?: string;
  dueDate: string;
  repeatType: RepeatType;
  /** When repeatType === 'custom_days', repeat every N days. */
  repeatInterval?: number | null;
  notes?: string;
  isCompleted: boolean;
  lastCompletedAt?: string | null;
  nextDueDate?: string | null;
  /** Local notification id from expo-notifications, so we can cancel it. */
  notificationId?: string | null;
  /**
   * Multi-pet reminders share a single groupId across every doc the
   * form creates (one per pet). The UI uses it to collapse N rows into
   * one card and to mark every pet done in a single tap. Single-pet
   * reminders leave this unset. Legacy multi-pet reminders (created
   * before this field existed) fall back to grouping by the shared
   * `notificationId` — see `groupReminders()` for the resolution
   * order.
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
   * when missing so existing records read correctly. Set to false for
   * "this is a planned future dose" rows — currently only used by the
   * future Mark Done flow.
   */
  isCompleted?: boolean;
  /**
   * True when expirationDate was derived from a schedule lookup
   * (vaccineSchedules) rather than read from the document or entered
   * by the user. Surfaces "Estimated" badges so users know to verify.
   */
  expirationDerived?: boolean;
  /**
   * Source of the record. 'manual' = the user typed it. 'scan' = Smart
   * Scan extracted it from an uploaded document. 'reminder' = a future
   * Mark Done flow created it from a fired renewal reminder.
   */
  source?: 'manual' | 'scan' | 'reminder';
  createdAt: string;
}

export type DocumentKind = 'vaccine' | 'vet_record' | 'invoice' | 'insurance' | 'other';

export interface PetDocument {
  id: string;
  petId: string;
  fileUrl: string;
  fileType: string;             // mime
  kind: DocumentKind;
  title: string;
  ocrText?: string;
  extractedFields?: Record<string, string | null>;
  createdAt: string;
}

export interface WeightLog {
  id: string;
  petId: string;
  weightKg: number;
  recordedAt: string;
  note?: string;
}

// Spending categories for scanned/added receipts (food, grooming, toys, …).
// 'medical' covers vet/meds/pharmacy purchases that aren't a full vet
// invoice. Keep in sync with RECEIPT_CATEGORY_META in src/utils/receiptCategory.ts.
export type ReceiptCategory =
  | 'food'
  | 'treats'
  | 'grooming'
  | 'toys'
  | 'supplies'
  | 'medical'
  | 'boarding'
  | 'training'
  | 'insurance'
  | 'other';

export interface ReceiptLineItem {
  name: string;
  /** Parsed price in dollars, or null if not confidently read. */
  price?: number | null;
}

/**
 * A purchase receipt (food, grooming, toys, supplies, etc.). Distinct from
 * PetDocument(kind:'invoice'), which is specifically a vet invoice tied to
 * vaccine extraction. Receipts power the spending view. `petId` is nullable
 * so household-wide purchases (e.g. a shared bag of food) don't force a pet.
 */
export interface Receipt {
  id: string;
  petId: string | null;
  category: ReceiptCategory;
  /** Store / merchant name, e.g. "Chewy", "PetSmart". */
  vendor: string;
  /** Total in dollars (parsed). Null when it couldn't be read. */
  amount: number | null;
  /** Original total string as printed, e.g. "$42.99". Preserves fidelity. */
  amountText: string;
  /** Purchase date, ISO yyyy-mm-dd. */
  date: string;
  notes?: string;
  /** Photo of the receipt in Storage, if one was attached. */
  fileUrl?: string | null;
  items?: ReceiptLineItem[];
  ocrText?: string;
  /** How it was created. */
  source: 'scan' | 'manual';
  createdAt: string;
}

export type MedicationFrequency =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'every_other_day'
  | 'weekly'
  | 'monthly'
  | 'as_needed';

/**
 * Long-running medication regimen. Distinct from the one-off journal entry
 * "medication" type. This captures the SCHEDULE (dose, frequency, dates,
 * instructions). Each administered dose becomes a JournalEntry of type
 * "medication" linked via medicationId so we can count missed doses later.
 */
export interface Medication {
  id: string;
  petId: string;
  name: string;                        // e.g. "Apoquel"
  dosage?: string;                     // e.g. "5 mg", "1 tablet"
  frequency: MedicationFrequency;
  instructions?: string;               // e.g. "Give with food"
  startDate: string;                   // ISO
  endDate?: string | null;             // ISO; null = ongoing
  reminderId?: string | null;          // linked daily/scheduled reminder
  isActive: boolean;                   // false = stopped / completed
  createdAt: string;
}
