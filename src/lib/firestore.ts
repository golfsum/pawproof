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
  waitForPendingWrites,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { cancelReminder } from './notifications';
import type { PremiumStatusSnapshot } from './purchases';
import type {
  Pet,
  JournalEntry,
  Reminder,
  VaccineRecord,
  PetDocument,
  UserProfile,
  WeightLog,
  Medication,
  PetShare,
  ShareRole,
  Receipt,
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
const receiptsCol = (uid: string) => collection(db, 'users', uid, 'receipts');
// Top-level: the same collection the web admin dashboard reads. Each
// doc carries the author's uid so Firestore rules can enforce
// "user can only write their own" + "any auth user can read their own".
const supportIssuesCol = () => collection(db, 'support_issues');
// Top-level caregiver shares. Owners read by ownerUid, invitees read
// by inviteeEmail or inviteeUid. Acceptance flips status + sets uid.
const petSharesCol = () => collection(db, 'pet_shares');

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
    onboardingCompleted: false,
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

export async function setPremium(
  uid: string,
  premium: boolean | PremiumStatusSnapshot,
): Promise<void> {
  if (typeof premium === 'boolean') {
    await updateDoc(doc(usersCol(), uid), { isPremium: premium });
    return;
  }
  await updateDoc(doc(usersCol(), uid), {
    isPremium: premium.isPremium,
    premiumOriginalPurchaseAt: premium.premiumOriginalPurchaseAt,
    premiumLatestPurchaseAt: premium.premiumLatestPurchaseAt,
    premiumExpiresAt: premium.premiumExpiresAt,
    premiumProductId: premium.premiumProductId,
    premiumWillRenew: premium.premiumWillRenew,
    premiumPeriodType: premium.premiumPeriodType,
    premiumStore: premium.premiumStore,
  });
}

// Called from the scan flow after a successful Smart Scan run. Uses
// Firestore's atomic increment so concurrent scans (e.g. user taps
// twice quickly) still produce the correct total.
export async function incrementFreeOcrScanCount(uid: string): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { freeOcrScansUsed: increment(1) });
}

// Mark the onboarding wizard as done so the root layout stops
// detouring this user to /onboarding on sign-in. trackingInterests is
// optional and persisted for later use (defaults on Quick Log, etc).
export async function markOnboardingComplete(
  uid: string,
  trackingInterests?: string[],
): Promise<void> {
  const update: Record<string, unknown> = { onboardingCompleted: true };
  if (trackingInterests && trackingInterests.length > 0) {
    update.trackingInterests = trackingInterests;
  }
  await updateDoc(doc(usersCol(), uid), update);
}

// Partial update to the user's notification preferences. Reads what's
// already there and merges so callers can update one field without
// clobbering the others.
export async function updateNotificationPrefs(
  uid: string,
  patch: { groupMultiPet?: boolean; vaccineWarnDays?: 14 | 30 | 60 | 90 },
): Promise<void> {
  const snap = await getDoc(doc(usersCol(), uid));
  const existing = (snap.data()?.notificationPrefs ?? {}) as Record<string, unknown>;
  await updateDoc(doc(usersCol(), uid), {
    notificationPrefs: { ...existing, ...patch },
  });
}

// Update the user's preferred distance unit. Used by the Settings →
// Units row. We accept null to clear back to the locale default, but
// most callers pass 'mi' or 'km' directly.
export async function setDistanceUnit(
  uid: string,
  unit: 'mi' | 'km',
): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { distanceUnit: unit });
}

// Update the user's preferred date order ('mdy' US / 'dmy' European).
export async function setDateFormat(
  uid: string,
  fmt: 'mdy' | 'dmy',
): Promise<void> {
  await updateDoc(doc(usersCol(), uid), { dateFormat: fmt });
}

// One-shot backup of everything under /users/{uid}. Used by the
// data-export flow to produce a single JSON file the user can save
// or share. Reads each subcollection in parallel; doesn't follow
// document fileUrls (those stay as URLs in the payload, since
// re-downloading the binary would explode the export size).
export interface UserBackup {
  exportedAt: string;
  schemaVersion: 1;
  profile: UserProfile | null;
  pets: Pet[];
  vaccines: VaccineRecord[];
  documents: PetDocument[];
  reminders: Reminder[];
  journalEntries: JournalEntry[];
  medications: Medication[];
  weights: WeightLog[];
}

// Wipe every doc under /users/{uid}/... plus the profile itself. Used
// by the "Delete my data" flow in Settings. Does NOT touch Firebase
// Auth — the user stays signed in (and can re-create records) until
// they explicitly delete the auth account, which has different
// reauth requirements. Done in batches because Firestore caps writes
// per batch at 500.
export async function deleteAllUserData(uid: string): Promise<void> {
  const subcollections = [
    petsCol(uid),
    entriesCol(uid),
    remindersCol(uid),
    vaccinesCol(uid),
    docsCol(uid),
    weightsCol(uid),
    medsCol(uid),
    receiptsCol(uid),
  ];
  for (const col of subcollections) {
    const snap = await getDocs(col);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  // Tickets the user owns get archived (marked deleted) rather than
  // hard-removed so we keep our support history. Skipped here.

  // Outgoing pet_shares should be revoked so invitees stop seeing
  // ghosts of pets that no longer exist.
  const myShares = await getDocs(
    query(petSharesCol(), where('ownerUid', '==', uid)),
  );
  for (const d of myShares.docs) {
    await deleteDoc(d.ref);
  }

  // Finally, drop the profile doc itself.
  await deleteDoc(doc(usersCol(), uid));
}

export async function fetchAllUserData(uid: string): Promise<UserBackup> {
  const profileSnap = await getDoc(doc(usersCol(), uid));
  const profile = profileSnap.exists()
    ? fromDoc<UserProfile>({ id: profileSnap.id, data: () => profileSnap.data() })
    : null;
  const [petsSnap, vaccSnap, docSnap, remSnap, entriesSnap, medsSnap, weightsSnap] =
    await Promise.all([
      getDocs(petsCol(uid)),
      getDocs(vaccinesCol(uid)),
      getDocs(docsCol(uid)),
      getDocs(remindersCol(uid)),
      getDocs(entriesCol(uid)),
      getDocs(medsCol(uid)),
      getDocs(weightsCol(uid)),
    ]);
  return {
    exportedAt: nowIso(),
    schemaVersion: 1,
    profile,
    pets: petsSnap.docs.map(d => fromDoc<Pet>(d)),
    vaccines: vaccSnap.docs.map(d => fromDoc<VaccineRecord>(d)),
    documents: docSnap.docs.map(d => fromDoc<PetDocument>(d)),
    reminders: remSnap.docs.map(d => fromDoc<Reminder>(d)),
    journalEntries: entriesSnap.docs.map(d => fromDoc<JournalEntry>(d)),
    medications: medsSnap.docs.map(d => fromDoc<Medication>(d)),
    weights: weightsSnap.docs.map(d => fromDoc<WeightLog>(d)),
  };
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

export interface SupportThreadMessage {
  from: 'user' | 'admin';
  message: string;
  createdAt: string;
  byUid?: string;
  byEmail?: string;
}

export interface SupportIssueDoc {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  status: 'open' | 'in_review' | 'completed';
  category: string;
  message: string;
  thread: SupportThreadMessage[];
  createdAt: string;
  updatedAt: string;
  lastAdminUpdateAt: string | null;
}

function shapeSupportIssue(id: string, raw: any): SupportIssueDoc {
  const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
    return null;
  };
  const thread: SupportThreadMessage[] = Array.isArray(raw.thread)
    ? raw.thread.map((m: any) => ({
        from: m.from === 'admin' ? 'admin' : 'user',
        message: typeof m.message === 'string' ? m.message : '',
        createdAt: toIso(m.createdAt) ?? new Date().toISOString(),
        byUid: typeof m.byUid === 'string' ? m.byUid : undefined,
        byEmail: typeof m.byEmail === 'string' ? m.byEmail : undefined,
      }))
    : [];
  return {
    id,
    uid: raw.uid ?? '',
    email: raw.email ?? null,
    displayName: raw.displayName ?? null,
    status: raw.status === 'completed' || raw.status === 'in_review' ? raw.status : 'open',
    category: raw.category ?? 'other',
    message: raw.message ?? '',
    thread,
    createdAt: toIso(raw.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(raw.updatedAt) ?? new Date().toISOString(),
    lastAdminUpdateAt: toIso(raw.lastAdminUpdateAt),
  };
}

// Live stream of the signed-in user's own tickets. Sorted newest update
// first so a reply from the admin bumps the ticket to the top.
export function watchSupportIssuesForUser(
  uid: string,
  cb: (issues: SupportIssueDoc[]) => void,
): Unsubscribe {
  const q = query(
    supportIssuesCol(),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => shapeSupportIssue(d.id, d.data())));
  });
}

export function watchSupportIssue(
  issueId: string,
  cb: (issue: SupportIssueDoc | null) => void,
): Unsubscribe {
  return onSnapshot(doc(supportIssuesCol(), issueId), snap => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    cb(shapeSupportIssue(snap.id, snap.data()));
  });
}

// --- Caregiver sharing ---

// 6-character invite code, lowercase alpha. Short enough to type or
// paste, long enough that brute-forcing the pet_shares collection is
// pointless (Firestore rules still scope reads to the inviter and
// invitee anyway).
function generateInviteCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function shapeShare(id: string, raw: any): PetShare {
  const toIso = (v: any): string | null => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
    return null;
  };
  return {
    id,
    petId: raw.petId ?? '',
    petName: raw.petName ?? '',
    ownerUid: raw.ownerUid ?? '',
    ownerEmail: raw.ownerEmail ?? null,
    ownerName: raw.ownerName ?? null,
    inviteeEmail: (raw.inviteeEmail ?? '').toLowerCase(),
    inviteeUid: raw.inviteeUid ?? null,
    role: raw.role === 'view_only' ? 'view_only' : 'caregiver',
    status:
      raw.status === 'accepted' || raw.status === 'revoked' ? raw.status : 'pending',
    inviteCode: raw.inviteCode ?? '',
    createdAt: toIso(raw.createdAt) ?? new Date().toISOString(),
    acceptedAt: toIso(raw.acceptedAt),
    revokedAt: toIso(raw.revokedAt),
  };
}

export interface CreateShareInput {
  petId: string;
  petName: string;
  ownerUid: string;
  ownerEmail: string | null;
  ownerName: string | null;
  inviteeEmail: string;
  role: ShareRole;
}

export async function createShareInvite(input: CreateShareInput): Promise<PetShare> {
  const ref = doc(petSharesCol());
  const inviteCode = generateInviteCode();
  const payload = {
    petId: input.petId,
    petName: input.petName,
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    ownerName: input.ownerName,
    inviteeEmail: input.inviteeEmail.trim().toLowerCase(),
    inviteeUid: null,
    role: input.role,
    status: 'pending',
    inviteCode,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    revokedAt: null,
  };
  await setDoc(ref, payload);
  const snap = await getDoc(ref);
  return shapeShare(ref.id, snap.data() ?? {});
}

export async function revokeShareInvite(shareId: string): Promise<void> {
  await updateDoc(doc(petSharesCol(), shareId), {
    status: 'revoked',
    revokedAt: serverTimestamp(),
  });
}

// Accept an invite by 6-char code. Looks up the pending share, asserts
// the email matches the accepting user (case-insensitive), and stamps
// the invitee's uid so future reads know it belongs to them. Throws
// with a UI-friendly message on each failure mode.
export async function acceptShareInvite(input: {
  uid: string;
  email: string | null;
  inviteCode: string;
}): Promise<PetShare> {
  const code = input.inviteCode.trim().toLowerCase();
  if (code.length !== 6) {
    throw new Error('Invite codes are 6 characters. Double-check what was sent.');
  }
  const q = query(
    petSharesCol(),
    where('inviteCode', '==', code),
    where('status', '==', 'pending'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('No pending invite with that code. Ask the sender for a fresh link.');
  }
  const shareDoc = snap.docs[0];
  const data = shareDoc.data();
  const inviteeEmail = (data.inviteeEmail ?? '').toLowerCase();
  if (input.email && inviteeEmail && inviteeEmail !== input.email.toLowerCase()) {
    throw new Error(
      `This invite was sent to ${inviteeEmail}. Sign in with that account to accept.`,
    );
  }
  await updateDoc(doc(petSharesCol(), shareDoc.id), {
    inviteeUid: input.uid,
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });
  const after = await getDoc(doc(petSharesCol(), shareDoc.id));
  return shapeShare(after.id, after.data() ?? {});
}

// Live stream of shares the user OWNS for a given pet. Used by the
// pet profile to show who has access.
export function watchSharesForPet(
  petId: string,
  cb: (shares: PetShare[]) => void,
): Unsubscribe {
  const q = query(
    petSharesCol(),
    where('petId', '==', petId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => shapeShare(d.id, d.data())));
  });
}

// Live stream of shares the user RECEIVED (i.e. they're the invitee).
// Used by useData() to surface shared pets in the user's home.
export function watchSharesReceived(uid: string, cb: (shares: PetShare[]) => void): Unsubscribe {
  const q = query(
    petSharesCol(),
    where('inviteeUid', '==', uid),
    where('status', '==', 'accepted'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => shapeShare(d.id, d.data())));
  });
}

// Live stream of every share the user OWNS — across every pet. Used
// by the Settings → Manage people screen so the user has a single
// place to see who has access to what.
export function watchOutgoingShares(
  ownerUid: string,
  cb: (shares: PetShare[]) => void,
): Unsubscribe {
  const q = query(
    petSharesCol(),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => shapeShare(d.id, d.data())));
  });
}

// --- Pets ---

export function watchPets(uid: string, cb: (pets: Pet[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(petsCol(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Pet>(d)));
  }, onError);
}

export async function getPet(uid: string, petId: string): Promise<Pet | null> {
  const snap = await getDoc(doc(petsCol(uid), petId));
  if (!snap.exists()) return null;
  return fromDoc<Pet>({ id: snap.id, data: () => snap.data() });
}

// Park/unpark a pet (downgrade read-only handling). Data is preserved either
// way; `inactive` just controls whether the pet can be logged to.
export async function setPetActive(uid: string, petId: string, active: boolean): Promise<void> {
  await updateDoc(doc(petsCol(uid), petId), { inactive: !active, updatedAt: serverTimestamp() });
}

export async function createPet(uid: string, data: Omit<Pet, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  return createDoc(doc(petsCol(uid)), { ...data, createdAt: now, updatedAt: now }, 'createPet');
}

// Durable create. CRITICAL: setDoc()'s promise resolves once the write hits
// the LOCAL cache, NOT when the server acknowledges. In React Native the
// Firebase JS SDK uses an in-memory cache only (on-disk persistence needs
// IndexedDB, absent in RN/Hermes), so a write that's only in cache is LOST
// when the app closes — pets vanished on relaunch. To make the write durable
// we await waitForPendingWrites(), which resolves only after the backend has
// acknowledged ALL pending writes. A timeout converts a stalled connection
// into a visible, retryable error instead of a silent loss. `createdAt` is a
// client ISO string so orderBy('createdAt') lists sort correctly immediately.
async function createDoc(
  ref: ReturnType<typeof doc>,
  data: Record<string, unknown>,
  label: string,
): Promise<string> {
  let to: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    to = setTimeout(
      () => reject(new Error(`${label} timed out. Check your connection and try again.`)),
      20_000,
    );
  });
  try {
    // Commit to cache (fast) then wait for the server to actually persist it.
    await setDoc(ref, data);
    await Promise.race([waitForPendingWrites(db), timeout]);
    console.log(`[firestore] ${label} ✓ acknowledged by server`, ref.path);
    return ref.id;
  } catch (err) {
    console.error(`[firestore] ${label} ✗ failed to persist`, ref.path, err);
    throw err;
  } finally {
    if (to) clearTimeout(to);
  }
}

export async function updatePet(uid: string, petId: string, data: Partial<Pet>): Promise<void> {
  await updateDoc(doc(petsCol(uid), petId), { ...data, updatedAt: serverTimestamp() });
}

export async function deletePet(uid: string, petId: string): Promise<void> {
  // Cascade delete every child record that references this pet so we don't
  // leave orphaned reminders/vaccines/etc. behind. Child docs are removed
  // BEFORE the pet doc so a mid-way failure leaves the pet visible and the
  // operation is safely re-runnable.

  // Reminders: cancel each scheduled notification, then delete the doc.
  const reminderSnap = await getDocs(query(remindersCol(uid), where('petId', '==', petId)));
  await Promise.all(
    reminderSnap.docs.map(async (d) => {
      const notifId = (d.data() as { notificationId?: string | null }).notificationId;
      await cancelReminder(notifId);
      await deleteDoc(d.ref);
    }),
  );

  // Remaining single-pet child collections. (Multi-pet journal entries that
  // also cover other pets via `petIds` are intentionally left intact.)
  // Receipts are deleted by petId too, but household receipts (petId null)
  // are left alone — the query below only matches this pet's own receipts.
  const childCols = [vaccinesCol(uid), docsCol(uid), medsCol(uid), weightsCol(uid), entriesCol(uid), receiptsCol(uid)];
  for (const col of childCols) {
    const snap = await getDocs(query(col, where('petId', '==', petId)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }

  // Revoke any caregiver shares for this pet.
  const shareSnap = await getDocs(
    query(petSharesCol(), where('ownerUid', '==', uid), where('petId', '==', petId)),
  );
  await Promise.all(shareSnap.docs.map((d) => deleteDoc(d.ref)));

  await deleteDoc(doc(petsCol(uid), petId));
}

export async function countPets(uid: string): Promise<number> {
  const snap = await getDocs(petsCol(uid));
  return snap.size;
}

// --- Journal entries ---

export function watchEntries(uid: string, cb: (entries: JournalEntry[]) => void, onError?: (e: Error) => void, max = 200): Unsubscribe {
  const q = query(entriesCol(uid), orderBy('timestamp', 'desc'), limit(max));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<JournalEntry>(d)));
  }, onError);
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
  return createDoc(doc(entriesCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createEntry');
}

export async function deleteEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(entriesCol(uid), entryId));
}

// --- Reminders ---

export function watchReminders(uid: string, cb: (reminders: Reminder[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(remindersCol(uid), orderBy('dueDate', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Reminder>(d)));
  }, onError);
}

export function watchRemindersForPet(uid: string, petId: string, cb: (reminders: Reminder[]) => void): Unsubscribe {
  const q = query(remindersCol(uid), where('petId', '==', petId), orderBy('dueDate', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Reminder>(d)));
  });
}

export async function createReminder(uid: string, data: Omit<Reminder, 'id' | 'createdAt'>): Promise<string> {
  return createDoc(doc(remindersCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createReminder');
}

export async function updateReminder(uid: string, reminderId: string, data: Partial<Reminder>): Promise<void> {
  await updateDoc(doc(remindersCol(uid), reminderId), data);
}

export async function deleteReminder(uid: string, reminderId: string): Promise<void> {
  await deleteDoc(doc(remindersCol(uid), reminderId));
}

// --- Vaccines ---

export function watchVaccines(uid: string, cb: (records: VaccineRecord[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(vaccinesCol(uid), orderBy('dateGiven', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<VaccineRecord>(d)));
  }, onError);
}

export function watchVaccinesForPet(uid: string, petId: string, cb: (records: VaccineRecord[]) => void): Unsubscribe {
  const q = query(vaccinesCol(uid), where('petId', '==', petId), orderBy('dateGiven', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<VaccineRecord>(d)));
  });
}

export async function createVaccine(uid: string, data: Omit<VaccineRecord, 'id' | 'createdAt'>): Promise<string> {
  return createDoc(doc(vaccinesCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createVaccine');
}

export async function updateVaccine(uid: string, vaccineId: string, data: Partial<VaccineRecord>): Promise<void> {
  await updateDoc(doc(vaccinesCol(uid), vaccineId), data);
}

export async function deleteVaccine(uid: string, vaccineId: string): Promise<void> {
  // Vaccines may have an auto-created renewal reminder (reminderId). Cancel
  // its notification and delete it so we don't orphan a reminder for a
  // vaccine that no longer exists.
  const vSnap = await getDoc(doc(vaccinesCol(uid), vaccineId));
  const reminderId = vSnap.exists()
    ? (vSnap.data() as { reminderId?: string | null }).reminderId
    : null;
  if (reminderId) {
    const rSnap = await getDoc(doc(remindersCol(uid), reminderId));
    if (rSnap.exists()) {
      await cancelReminder((rSnap.data() as { notificationId?: string | null }).notificationId);
      await deleteDoc(doc(remindersCol(uid), reminderId));
    }
  }
  await deleteDoc(doc(vaccinesCol(uid), vaccineId));
}

// --- Documents ---

export function watchDocuments(uid: string, cb: (docs: PetDocument[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(docsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<PetDocument>(d)));
  }, onError);
}

export function watchDocumentsForPet(uid: string, petId: string, cb: (docs: PetDocument[]) => void): Unsubscribe {
  const q = query(docsCol(uid), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<PetDocument>(d)));
  });
}

export async function createDocument(uid: string, data: Omit<PetDocument, 'id' | 'createdAt'>): Promise<string> {
  return createDoc(doc(docsCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createDocument');
}

export async function deleteDocument(uid: string, documentId: string): Promise<void> {
  await deleteDoc(doc(docsCol(uid), documentId));
}

export async function countDocuments(uid: string): Promise<number> {
  const snap = await getDocs(docsCol(uid));
  return snap.size;
}

// --- Receipts (spending) ---

export function watchReceipts(uid: string, cb: (receipts: Receipt[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(receiptsCol(uid), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Receipt>(d)));
  }, onError);
}

export async function createReceipt(uid: string, data: Omit<Receipt, 'id' | 'createdAt'>): Promise<string> {
  return createDoc(doc(receiptsCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createReceipt');
}

export async function updateReceipt(uid: string, receiptId: string, data: Partial<Receipt>): Promise<void> {
  await updateDoc(doc(receiptsCol(uid), receiptId), data);
}

export async function deleteReceipt(uid: string, receiptId: string): Promise<void> {
  await deleteDoc(doc(receiptsCol(uid), receiptId));
}

// --- Weight logs ---

export function watchWeightsForPet(uid: string, petId: string, cb: (logs: WeightLog[]) => void): Unsubscribe {
  const q = query(weightsCol(uid), where('petId', '==', petId), orderBy('recordedAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<WeightLog>(d)));
  });
}

export async function createWeightLog(uid: string, data: Omit<WeightLog, 'id'>): Promise<string> {
  return createDoc(doc(weightsCol(uid)), { ...data }, 'createWeightLog');
}

// --- Medications ---

export function watchMedications(uid: string, cb: (meds: Medication[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(medsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Medication>(d)));
  }, onError);
}

export function watchMedicationsForPet(uid: string, petId: string, cb: (meds: Medication[]) => void): Unsubscribe {
  const q = query(medsCol(uid), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => fromDoc<Medication>(d)));
  });
}

export async function createMedication(uid: string, data: Omit<Medication, 'id' | 'createdAt'>): Promise<string> {
  return createDoc(doc(medsCol(uid)), { ...data, createdAt: new Date().toISOString() }, 'createMedication');
}

export async function updateMedication(uid: string, medId: string, data: Partial<Medication>): Promise<void> {
  await updateDoc(doc(medsCol(uid), medId), data);
}

export async function deleteMedication(uid: string, medId: string): Promise<void> {
  await deleteDoc(doc(medsCol(uid), medId));
}
