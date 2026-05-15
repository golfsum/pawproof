import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Pet,
  JournalEntry,
  Reminder,
  VaccineRecord,
  PetDocument,
  UserProfile,
  WeightLog,
  Medication,
} from '@/types/models';

// All user-scoped data lives at /users/{uid}/{collection}/{docId}. Firestore
// rules should pin reads/writes to request.auth.uid.

const usersCol = () => collection(db, 'users');
const petsCol = (uid: string) => collection(db, 'users', uid, 'pets');
const entriesCol = (uid: string) => collection(db, 'users', uid, 'journalEntries');
const remindersCol = (uid: string) => collection(db, 'users', uid, 'reminders');
const vaccinesCol = (uid: string) => collection(db, 'users', uid, 'vaccines');
const docsCol = (uid: string) => collection(db, 'users', uid, 'documents');
const weightsCol = (uid: string) => collection(db, 'users', uid, 'weights');
const medsCol = (uid: string) => collection(db, 'users', uid, 'medications');
// Top-level — the same collection the web admin dashboard reads. Each
// doc carries the author's uid so Firestore rules can enforce
// "user can only write their own" + "any auth user can read their own".
const supportIssuesCol = () => collection(db, 'support_issues');

function nowIso(): string {
  return new Date().toISOString();
}

function fromDoc<T>(snap: { id: string; data: () => any }): T {
  const raw = snap.data() as any;
  const out: any = { id: snap.id };
  for (const [k, v] of Object.entries(raw)) {
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// --- User profile ---

export async function ensureUserProfile(uid: string, email: string | null): Promise<UserProfile> {
  const ref = doc(usersCol(), uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return fromDoc<UserProfile>({ id: snap.id, data: () => snap.data() });
  }
  const profile: UserProfile = {
    id: uid,
    email,
    displayName: null,
    isPremium: false,
    freeOcrScansUsed: 0,
    createdAt: nowIso(),
  };
  await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
  return profile;
}

export function watchUserProfile(uid: string, cb: (p: UserProfile | null) => void): Unsubscribe {
  return onSnapshot(doc(usersCol(), uid), snap => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    cb(fromDoc<UserProfile>({ id: snap.id, data: () => snap.data() }));
  });
}

export async function setPremium(uid: string, isPremium: boolean): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { isPremium });
}

// Called from the scan flow after a successful Smart Scan run. Uses
// Firestore's atomic increment so concurrent scans (e.g. user taps
// twice quickly) still produce the correct total.
export async function incrementFreeOcrScanCount(uid: string): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { freeOcrScansUsed: increment(1) });
}

// --- Support tickets ---

export interface CreateSupportIssueInput {
  uid: string;
  email: string | null;
  displayName: string | null;
  category: string;
  message: string;
  source: string;
  platform: string;
  appVersion: string | null;
  buildNumber: string | number | null;
  deviceModel: string | null;
  context: Record<string, any> | null;
}

// Submit a support ticket from the mobile app. Writes the same shape
// the web admin queue expects so /admin/tickets renders it without any
// translation. Mirrors billsplit's support_issues collection.
export async function createSupportIssue(input: CreateSupportIssueInput): Promise<string> {
  const ref = doc(supportIssuesCol());
  await setDoc(ref, {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    status: 'open',
    category: input.category,
    source: input.source,
    message: input.message,
    adminNote: null,
    thread: [],
    context: input.context,
    platform: input.platform,
    appVersion: input.appVersion,
    buildNumber: input.buildNumber,
    deviceModel: input.deviceModel,
    lastLoginAt: null,
    lastError: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
    completedBy: null,
    completedByEmail: null,
    lastAdminUpdateAt: null,
  });
  return ref.id;
}

// --- Pets ---

export function watchPets(uid: string, cb: (pets: Pet[]) => void): Unsubscribe {
  const q = query(petsCol(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Pet>(d)));
  });
}

export async function getPet(uid: string, petId: string): Promise<Pet | null> {
  const snap = await getDoc(doc(petsCol(uid), petId));
  if (!snap.exists()) return null;
  return fromDoc<Pet>({ id: snap.id, data: () => snap.data() });
}

export async function createPet(uid: string, data: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = doc(petsCol(uid));
  console.log('[firestore] createPet → setDoc', { path: ref.path, uid });
  const now = new Date().toISOString();
  await withTimeout(
    setDoc(ref, {
      ...data,
      // Use client-side ISO timestamps. serverTimestamp() relies on the write
      // being ack'd by the server before the promise resolves; if the
      // transport is wedged the promise hangs forever. ISO strings let the
      // write complete locally and replicate when the connection wakes up.
      createdAt: now,
      updatedAt: now,
    }),
    15_000,
    'createPet',
  );
  console.log('[firestore] createPet ✓', ref.id);
  return ref.id;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let to: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    to = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s — Firestore is not reaching the server. Check console for [firebase] logs and your network.`)),
      ms,
    );
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (to) clearTimeout(to);
  }
}

export async function updatePet(uid: string, petId: string, data: Partial<Pet>): Promise<void> {
  await updateDoc(doc(petsCol(uid), petId), { ...data, updatedAt: serverTimestamp() });
}

export async function deletePet(uid: string, petId: string): Promise<void> {
  await deleteDoc(doc(petsCol(uid), petId));
}

export async function countPets(uid: string): Promise<number> {
  const snap = await getDocs(petsCol(uid));
  return snap.size;
}

// --- Journal entries ---

export function watchEntries(uid: string, cb: (entries: JournalEntry[]) => void, max = 200): Unsubscribe {
  const q = query(entriesCol(uid), orderBy('timestamp', 'desc'), limit(max));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<JournalEntry>(d)));
  });
}

export function watchEntriesForPet(uid: string, petId: string, cb: (entries: JournalEntry[]) => void, max = 200): Unsubscribe {
  const q = query(
    entriesCol(uid),
    where('petId', '==', petId),
    orderBy('timestamp', 'desc'),
    limit(max),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<JournalEntry>(d)));
  });
}

export async function createEntry(uid: string, data: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(entriesCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(entriesCol(uid), entryId));
}

// --- Reminders ---

export function watchReminders(uid: string, cb: (reminders: Reminder[]) => void): Unsubscribe {
  const q = query(remindersCol(uid), orderBy('dueDate', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Reminder>(d)));
  });
}

export function watchRemindersForPet(uid: string, petId: string, cb: (reminders: Reminder[]) => void): Unsubscribe {
  const q = query(remindersCol(uid), where('petId', '==', petId), orderBy('dueDate', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Reminder>(d)));
  });
}

export async function createReminder(uid: string, data: Omit<Reminder, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(remindersCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateReminder(uid: string, reminderId: string, data: Partial<Reminder>): Promise<void> {
  await updateDoc(doc(remindersCol(uid), reminderId), data);
}

export async function deleteReminder(uid: string, reminderId: string): Promise<void> {
  await deleteDoc(doc(remindersCol(uid), reminderId));
}

// --- Vaccines ---

export function watchVaccines(uid: string, cb: (records: VaccineRecord[]) => void): Unsubscribe {
  const q = query(vaccinesCol(uid), orderBy('dateGiven', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<VaccineRecord>(d)));
  });
}

export function watchVaccinesForPet(uid: string, petId: string, cb: (records: VaccineRecord[]) => void): Unsubscribe {
  const q = query(vaccinesCol(uid), where('petId', '==', petId), orderBy('dateGiven', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<VaccineRecord>(d)));
  });
}

export async function createVaccine(uid: string, data: Omit<VaccineRecord, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(vaccinesCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateVaccine(uid: string, vaccineId: string, data: Partial<VaccineRecord>): Promise<void> {
  await updateDoc(doc(vaccinesCol(uid), vaccineId), data);
}

export async function deleteVaccine(uid: string, vaccineId: string): Promise<void> {
  await deleteDoc(doc(vaccinesCol(uid), vaccineId));
}

// --- Documents ---

export function watchDocuments(uid: string, cb: (docs: PetDocument[]) => void): Unsubscribe {
  const q = query(docsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<PetDocument>(d)));
  });
}

export function watchDocumentsForPet(uid: string, petId: string, cb: (docs: PetDocument[]) => void): Unsubscribe {
  const q = query(docsCol(uid), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<PetDocument>(d)));
  });
}

export async function createDocument(uid: string, data: Omit<PetDocument, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(docsCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteDocument(uid: string, documentId: string): Promise<void> {
  await deleteDoc(doc(docsCol(uid), documentId));
}

export async function countDocuments(uid: string): Promise<number> {
  const snap = await getDocs(docsCol(uid));
  return snap.size;
}

// --- Weight logs ---

export function watchWeightsForPet(uid: string, petId: string, cb: (logs: WeightLog[]) => void): Unsubscribe {
  const q = query(weightsCol(uid), where('petId', '==', petId), orderBy('recordedAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<WeightLog>(d)));
  });
}

export async function createWeightLog(uid: string, data: Omit<WeightLog, 'id'>): Promise<string> {
  const ref = doc(weightsCol(uid));
  await setDoc(ref, data);
  return ref.id;
}

// --- Medications ---

export function watchMedications(uid: string, cb: (meds: Medication[]) => void): Unsubscribe {
  const q = query(medsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Medication>(d)));
  });
}

export function watchMedicationsForPet(uid: string, petId: string, cb: (meds: Medication[]) => void): Unsubscribe {
  const q = query(medsCol(uid), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Medication>(d)));
  });
}

export async function createMedication(uid: string, data: Omit<Medication, 'id' | 'createdAt'>): Promise<string> {
  const ref = doc(medsCol(uid));
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateMedication(uid: string, medId: string, data: Partial<Medication>): Promise<void> {
  await updateDoc(doc(medsCol(uid), medId), data);
}

export async function deleteMedication(uid: string, medId: string): Promise<void> {
  await deleteDoc(doc(medsCol(uid), medId));
}
