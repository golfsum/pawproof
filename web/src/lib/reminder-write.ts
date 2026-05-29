// Write path for reminders created on the web. Mirrors the mobile
// app's createReminder (app/reminder/add.tsx + src/lib/firestore.ts):
// writes to users/{uid}/reminders with both the legacy `type` and the
// canonical `category`, both `title` and `name`, ISO `dueDate` /
// `nextDueDate`, and `createdAt` via serverTimestamp(). Multi-pet
// reminders write one doc per pet sharing a single groupId.

import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { requireDb } from "./firebase";
import type { ReminderCategory, ReminderType, RepeatType } from "./types";

export interface ReminderCategoryOption {
  key: ReminderCategory;
  label: string;
  defaultName: string;
  placeholder: string;
}

// Compact mirror of REMINDER_CATEGORY_CONFIG from the mobile app
// (src/utils/reminderCategory.ts) — just the bits the web form needs.
export const REMINDER_CATEGORIES: ReminderCategoryOption[] = [
  { key: "feeding", label: "Feeding", defaultName: "Feeding reminder", placeholder: "e.g. Breakfast, Dinner, Lunch" },
  { key: "walk", label: "Walk", defaultName: "Walk reminder", placeholder: "e.g. Morning walk, Evening walk" },
  { key: "medication", label: "Medication", defaultName: "Medication reminder", placeholder: "e.g. Flea meds, Heartworm pill" },
  { key: "vaccination", label: "Vaccination", defaultName: "Vaccine reminder", placeholder: "e.g. Rabies vaccine, DHPP booster" },
  { key: "vet_visit", label: "Vet visit", defaultName: "Vet visit", placeholder: "e.g. Annual checkup, Follow-up visit" },
  { key: "grooming", label: "Grooming", defaultName: "Grooming reminder", placeholder: "e.g. Bath, Brush, Grooming appointment" },
  { key: "flea_tick", label: "Flea / Tick", defaultName: "Flea / tick reminder", placeholder: "e.g. Flea treatment, Tick prevention" },
  { key: "heartworm", label: "Heartworm", defaultName: "Heartworm reminder", placeholder: "e.g. Heartworm pill" },
  { key: "nail_trim", label: "Nail trim", defaultName: "Nail trim", placeholder: "e.g. Nail trim" },
  { key: "general", label: "Other", defaultName: "Reminder", placeholder: "e.g. Order food, Replace collar" },
];

// Inverse of the read-side mapping: stamp the legacy `type` field so
// older readers keep working. Matches CATEGORY_TO_TYPE in the app.
const CATEGORY_TO_TYPE: Record<ReminderCategory, ReminderType> = {
  feeding: "feeding",
  walk: "walking",
  medication: "medication",
  vet_visit: "vet_visit",
  vaccination: "vaccination",
  grooming: "grooming",
  flea_tick: "flea_tick",
  heartworm: "heartworm",
  nail_trim: "nail_trim",
  general: "custom",
};

// Suggested default repeat per category — the form applies this when
// the user picks a category and hasn't manually changed repeat.
export const DEFAULT_REPEAT_BY_CATEGORY: Record<ReminderCategory, RepeatType> = {
  feeding: "daily",
  walk: "daily",
  medication: "daily",
  vet_visit: "none",
  vaccination: "yearly",
  grooming: "monthly",
  flea_tick: "monthly",
  heartworm: "monthly",
  nail_trim: "monthly",
  general: "none",
};

export function defaultNameForCategory(category: ReminderCategory): string {
  return REMINDER_CATEGORIES.find((c) => c.key === category)?.defaultName ?? "Reminder";
}

export function placeholderForCategory(category: ReminderCategory): string {
  return REMINDER_CATEGORIES.find((c) => c.key === category)?.placeholder ?? "Reminder name";
}

// Matches newReminderGroupId() in src/utils/reminderGroups.ts.
function newReminderGroupId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

export interface NewReminderInput {
  petIds: string[];
  category: ReminderCategory;
  name: string;
  notes?: string;
  dueDate: Date;
  repeatType: RepeatType;
  repeatInterval?: number | null;
}

// Writes one reminder doc per selected pet. 2+ pets share a groupId so
// the mobile app's grouped "mark all done" flow recognises them as one.
export async function createReminders(uid: string, input: NewReminderInput): Promise<void> {
  const db = requireDb();
  const groupId = input.petIds.length > 1 ? newReminderGroupId() : undefined;
  const iso = input.dueDate.toISOString();
  const legacyType = CATEGORY_TO_TYPE[input.category];
  const name = input.name.trim() || defaultNameForCategory(input.category);
  const notes = input.notes?.trim();
  const repeatInterval =
    input.repeatType === "custom_days" ? Math.max(1, Number(input.repeatInterval) || 1) : null;

  await Promise.all(
    input.petIds.map((petId) => {
      const ref = doc(collection(db, "users", uid, "reminders"));
      return setDoc(ref, {
        petId,
        type: legacyType,
        category: input.category,
        title: name,
        name,
        ...(notes ? { notes } : {}),
        dueDate: iso,
        nextDueDate: iso,
        repeatType: input.repeatType,
        repeatInterval,
        isCompleted: false,
        notificationId: null,
        ...(groupId ? { groupId } : {}),
        createdAt: serverTimestamp(),
      });
    }),
  );
}
