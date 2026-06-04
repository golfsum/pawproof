import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { Pet, Reminder, ReminderType } from '@/types/models';
import {
  buildGroupedReminderCopy,
  buildReminderCopy,
  buildVaccineCopy,
  type NotificationCopy,
} from './notificationCopy';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  } as any),
});

let permissionRequested = false;

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    return false;
  }
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  if (permissionRequested) {
    return false;
  }
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return req.granted;
}

// Live permission status for the Settings UI. 'granted' | 'denied' |
// 'undetermined' — undetermined means we've never asked, so we can still show
// the native prompt (rather than dead-ending the user in iOS Settings, where
// the app won't even appear until it has requested once).
export type NotifPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<NotifPermissionStatus> {
  if (!Device.isDevice) return 'denied';
  const s = await Notifications.getPermissionsAsync();
  if (s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  // canAskAgain === true with not-granted means the prompt hasn't been shown
  // (or is still allowed). Treat that as 'undetermined' so the UI offers the
  // in-app prompt; a hard denial (canAskAgain false) routes to iOS Settings.
  return s.canAskAgain ? 'undetermined' : 'denied';
}

// Explicitly request permission from a button tap. Unlike
// ensureNotificationPermission, this has no once-per-session guard — the user
// asked for it, so always surface the native prompt when allowed.
export async function requestNotificationPermission(): Promise<NotifPermissionStatus> {
  if (!Device.isDevice) return 'denied';
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return req.canAskAgain ? 'undetermined' : 'denied';
}

export async function scheduleReminder(title: string, body: string, when: Date): Promise<string | null> {
  const ok = await ensureNotificationPermission();
  if (!ok) return null;
  if (when.getTime() <= Date.now()) {
    // Schedule for 1 minute out if the requested date is in the past so the
    // user still sees something rather than silently dropping it.
    when = new Date(Date.now() + 60_000);
  }
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    } as Notifications.DateTriggerInput,
  });
  return id;
}

export async function cancelReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // notification may have already fired or been cancelled
  }
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'PawProof reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2A8FA8',
  });
}

// ─── Pet-aware schedule helpers ──────────────────────────────────────
// These build proper notification copy via notificationCopy and then
// hand off to scheduleReminder. Use these in app code instead of
// scheduleReminder(title, body, when) so the body always reads as
// "Yahzi's morning walk is due now." rather than the reminder title
// echoed twice.

export async function scheduleReminderForPet(input: {
  pet: Pick<Pet, 'name'> | null | undefined;
  reminderType: ReminderType;
  reminderTitle: string;
  when: Date;
}): Promise<string | null> {
  const { pet, reminderType, reminderTitle, when } = input;
  const copy: NotificationCopy = pet?.name
    ? buildReminderCopy({
        petName: pet.name,
        reminderType,
        reminderTitle,
      })
    : { title: 'PawProof reminder', body: reminderTitle };
  return scheduleReminder(copy.title, copy.body, when);
}

export async function scheduleVaccineExpirationReminder(input: {
  pet: Pick<Pet, 'name'> | null | undefined;
  vaccineName: string;
  // The actual expiration date — the helper schedules the
  // notification to fire `daysBefore` ahead so the user has time to
  // book a renewal appointment.
  expiresAt: Date;
  daysBefore?: number;
}): Promise<string | null> {
  const { pet, vaccineName, expiresAt, daysBefore = 14 } = input;
  const fireAt = new Date(expiresAt.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  const when = fireAt.getTime() > Date.now() ? fireAt : expiresAt;
  const copy = pet?.name
    ? buildVaccineCopy({
        petName: pet.name,
        vaccineName,
        state: 'soon',
        daysOut: daysBefore,
      })
    : { title: 'PawProof reminder', body: `${vaccineName} vaccine expires soon.` };
  return scheduleReminder(copy.title, copy.body, when);
}

export async function scheduleGroupedReminder(input: {
  petNames: string[];
  reminderType: ReminderType;
  reminderTitle: string;
  when: Date;
}): Promise<string | null> {
  const copy = buildGroupedReminderCopy({
    petNames: input.petNames,
    reminderType: input.reminderType,
    reminderTitle: input.reminderTitle,
  });
  return scheduleReminder(copy.title, copy.body, input.when);
}
