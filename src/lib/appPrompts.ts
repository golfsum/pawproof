import AsyncStorage from '@react-native-async-storage/async-storage';

// Local (device-only) bookkeeping for engagement prompts: the first-run
// notification ask, the occasional notification nudge when adding reminders,
// and the occasional start-up paywall for free users. Stored in AsyncStorage
// (not Firestore) because it's per-device pacing, not account data.

const K = {
  openCount: 'pp.appOpenCount',
  notifFirstPrompted: 'pp.notifFirstPrompted',
  paywallNextAt: 'pp.paywallNextAt',
  reminderCount: 'pp.reminderCreateCount',
  notifNudgeLastAt: 'pp.notifNudgeLastAt',
} as const;

async function getNum(key: string, def = 0): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return def;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  } catch {
    return def;
  }
}

async function setNum(key: string, n: number): Promise<void> {
  try {
    await AsyncStorage.setItem(key, String(n));
  } catch {
    // best-effort; pacing is non-critical
  }
}

async function getBool(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}

async function setBool(key: string, b: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, b ? '1' : '0');
  } catch {
    // best-effort
  }
}

// Random integer in [min, max] inclusive. (App runtime — Math.random is fine.)
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Count this app launch and return the new total number of launches. */
export async function recordAppOpen(): Promise<number> {
  const n = (await getNum(K.openCount)) + 1;
  await setNum(K.openCount, n);
  return n;
}

/** True the very first time the app reaches the main screens (so we ask for
 *  notification permission once on first run). Marks itself done. */
export async function shouldRequestNotifFirstRun(): Promise<boolean> {
  if (await getBool(K.notifFirstPrompted)) return false;
  await setBool(K.notifFirstPrompted, true);
  return true;
}

// Paywall cadence: never on the first run; first appearance around launch
// 10–15, then every 10–15 launches after. Pass the current launch count.
const PAYWALL_MIN_GAP = 10;
const PAYWALL_MAX_GAP = 15;

export async function shouldShowStartupPaywall(openCount: number): Promise<boolean> {
  let nextAt = await getNum(K.paywallNextAt, 0);
  if (nextAt === 0) {
    // First scheduling — pick the first trigger 10–15 launches in. On a fresh
    // install openCount is small, so this guarantees it never hits on run 1.
    nextAt = randInt(PAYWALL_MIN_GAP, PAYWALL_MAX_GAP);
    await setNum(K.paywallNextAt, nextAt);
  }
  if (openCount >= nextAt) {
    // Schedule the next appearance 10–15 launches from now and fire this one.
    await setNum(K.paywallNextAt, openCount + randInt(PAYWALL_MIN_GAP, PAYWALL_MAX_GAP));
    return true;
  }
  return false;
}

// Notification nudge when adding reminders: nudge on the 1st reminder, then at
// most once every few reminders, so it's a gentle reminder and not nagging.
// Caller should only act on `true` when permission isn't already granted.
const NOTIF_NUDGE_GAP = 4;

export async function shouldNudgeNotifOnReminder(): Promise<boolean> {
  const count = (await getNum(K.reminderCount)) + 1;
  await setNum(K.reminderCount, count);
  const lastAt = await getNum(K.notifNudgeLastAt, -NOTIF_NUDGE_GAP);
  const due = count === 1 || count - lastAt >= NOTIF_NUDGE_GAP;
  if (due) await setNum(K.notifNudgeLastAt, count);
  return due;
}
