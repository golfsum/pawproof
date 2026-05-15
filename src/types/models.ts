// Centralised data models for PawProof. Firestore documents mirror these
// shapes; Timestamps are normalised to ISO strings at the data layer so the
// rest of the app can treat them as plain `Date | string`.

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
  petId: string;
  type: JournalEntryType;
  title: string;
  note?: string;
  timestamp: string;
  durationMin?: number | null;
  amount?: string | null;     // e.g. "1 cup", "5mg", meal label
  subtype?: string | null;    // e.g. "breakfast", "vomiting"
  severity?: SymptomSeverity | null;
  photoUrl?: string | null;
  createdAt: string;
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
  type: ReminderType;
  title: string;
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
 * "medication" type — this captures the SCHEDULE (dose, frequency, dates,
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
