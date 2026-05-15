import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

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
