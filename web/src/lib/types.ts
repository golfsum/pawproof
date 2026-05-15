// Shared types that mirror the mobile app's Firestore documents. Web
// reads the same collections, so the shapes must agree. Timestamps are
// normalized to ISO strings at the data layer.

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
  createdAt: string;
  updatedAt: string;
}

export type ReminderType =
  | "feeding"
  | "medication"
  | "vet_visit"
  | "vaccination"
  | "grooming"
  | "training"
  | "other";

export interface Reminder {
  id: string;
  petId: string;
  type: ReminderType;
  title: string;
  notes?: string;
  dueDate: string;
  repeatType: "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom_days";
  repeatInterval?: number | null;
  isCompleted: boolean;
  nextDueDate?: string;
  lastCompletedAt?: string;
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
  notes?: string;
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

export interface JournalEntry {
  id: string;
  petId: string;
  type: string;
  title: string;
  note?: string;
  timestamp: string;
  durationMin?: number | null;
  amount?: string | null;
  subtype?: string | null;
  severity?: "mild" | "medium" | "serious" | null;
  photoUrl?: string | null;
  createdAt: string;
}
