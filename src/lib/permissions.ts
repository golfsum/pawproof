import { Alert, Linking } from 'react-native';

export function showSettingsPermissionAlert(accessLabel: string): void {
  Alert.alert(
    'Permission required',
    `Enable ${accessLabel} access in Settings to continue.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
    ],
  );
}
