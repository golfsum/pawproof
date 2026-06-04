import React, { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/hooks/AuthProvider';
import { updateNotificationPrefs } from '@/lib/firestore';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotifPermissionStatus,
} from '@/lib/notifications';
import { colors, fonts, radius, spacing, typography } from '@/theme';

// Notification preferences. v1 covers the two settings users ask for
// most often:
//   - Group multi-pet reminders into a single notification
//   - How early to warn about vaccine expirations (14/30/60/90 days)
//
// More controls (quiet hours, "notify again if not completed",
// per-type sounds) deserve their own iteration once we know what
// people actually use.

const WINDOWS: Array<{ value: 14 | 30 | 60 | 90; label: string; description: string }> = [
  { value: 14, label: '2 weeks', description: 'Standard — same as scheduled renewal reminders.' },
  { value: 30, label: '30 days', description: 'A bit earlier. Good for clinics that book out.' },
  { value: 60, label: '60 days', description: 'Best if your vet schedules far in advance.' },
  { value: 90, label: '90 days', description: 'Maximum heads-up. Useful for international travel.' },
];

export default function NotificationPrefsScreen() {
  const { user, profile } = useAuth();
  const initialGroup = profile?.notificationPrefs?.groupMultiPet ?? true;
  const initialWindow = profile?.notificationPrefs?.vaccineWarnDays ?? 14;
  const [groupMultiPet, setGroupMultiPet] = useState(initialGroup);
  const [vaccineWarnDays, setVaccineWarnDays] = useState<14 | 30 | 60 | 90>(initialWindow);
  const [saving, setSaving] = useState(false);

  // System notification permission. Re-checked when the app returns to the
  // foreground so flipping the iOS toggle and coming back updates the card.
  const [permStatus, setPermStatus] = useState<NotifPermissionStatus>('undetermined');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = () => { getNotificationPermission().then(s => { if (mounted) setPermStatus(s); }); };
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { mounted = false; sub.remove(); };
  }, []);

  const handleEnable = async () => {
    if (permStatus === 'denied') {
      // Already asked and denied — iOS won't show the prompt again, so the
      // only path is the system Settings page (the app now appears there).
      Linking.openSettings();
      return;
    }
    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermStatus(result);
      if (result === 'denied') {
        Alert.alert(
          'Notifications are off',
          'You can turn them on anytime in iOS Settings → PawProof → Notifications.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } finally {
      setRequesting(false);
    }
  };

  const persist = async (next: { groupMultiPet?: boolean; vaccineWarnDays?: 14 | 30 | 60 | 90 }) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateNotificationPrefs(user.uid, next);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGroupChange = (v: boolean) => {
    setGroupMultiPet(v);
    void persist({ groupMultiPet: v });
  };
  const handleWindowChange = (v: 14 | 30 | 60 | 90) => {
    setVaccineWarnDays(v);
    void persist({ vaccineWarnDays: v });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={typography.h1}>Notifications</Text>
        <Text style={styles.intro}>
          Control how PawProof reminds you about care, vaccines, and shared
          tasks.
        </Text>

        {/* System permission status + in-app enable. */}
        {permStatus === 'granted' ? (
          <View style={[styles.permCard, styles.permOk]}>
            <Ionicons name="checkmark-circle" size={20} color="#1E6C80" />
            <Text style={styles.permOkText}>Notifications are on. You&apos;ll get reminders for care and vaccines.</Text>
          </View>
        ) : (
          <View style={[styles.permCard, styles.permWarn]}>
            <Ionicons name="notifications-off-outline" size={20} color="#92400e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.permWarnTitle}>Notifications are off</Text>
              <Text style={styles.permWarnBody}>
                {permStatus === 'denied'
                  ? 'Turn them on in iOS Settings so PawProof can remind you about feedings, meds, and vaccine renewals.'
                  : 'Enable notifications so PawProof can remind you about feedings, meds, and vaccine renewals.'}
              </Text>
              <Pressable
                onPress={handleEnable}
                disabled={requesting}
                style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.permBtnText}>
                  {requesting ? 'Requesting…' : permStatus === 'denied' ? 'Open iOS Settings' : 'Enable notifications'}
                </Text>
                <Ionicons name={permStatus === 'denied' ? 'open-outline' : 'notifications-outline'} size={15} color="#fff" />
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.toggleTitle}>Group multi-pet reminders</Text>
              <Text style={styles.toggleBody}>
                One notification for shared tasks like "Dinner time for Moqui,
                Yahzi, and Lovie." Turn off for separate banners per pet.
              </Text>
            </View>
            <Switch
              value={groupMultiPet}
              onValueChange={handleGroupChange}
              disabled={saving}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Vaccine expiration warning</Text>
        <View style={styles.card}>
          {WINDOWS.map((w, idx) => {
            const selected = vaccineWarnDays === w.value;
            return (
              <Pressable
                key={w.value}
                onPress={() => handleWindowChange(w.value)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.windowRow,
                  idx > 0 && styles.windowDivider,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <View style={[styles.radioOuter, selected && { borderColor: colors.primary }]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.windowLabel}>{w.label}</Text>
                  <Text style={styles.windowDescription}>{w.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.iosCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.iosCardText}>
              Sounds, banners, and focus filters are controlled in iOS Settings.
            </Text>
            <Pressable
              onPress={() => Linking.openSettings()}
              hitSlop={6}
              style={({ pressed }) => [styles.iosLink, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.iosLinkText}>Open iOS Settings</Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.sm },
  intro: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 4, marginBottom: spacing.md },

  permCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  permOk: { backgroundColor: colors.primarySoft },
  permOkText: { flex: 1, fontSize: 13, color: '#1E6C80', lineHeight: 18 },
  permWarn: { backgroundColor: colors.warningSoft },
  permWarnTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: '#92400e' },
  permWarnBody: { fontSize: 13, color: '#92400e', lineHeight: 18, marginTop: 2 },
  permBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  permBtnText: { color: '#fff', fontFamily: fonts.body.semibold, fontSize: 13 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleTitle: { fontSize: 15, fontFamily: fonts.body.semibold, color: colors.text },
  toggleBody: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },

  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  windowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  windowLabel: { fontSize: 14, fontFamily: fonts.body.semibold, color: colors.text },
  windowDescription: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },

  iosCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iosCardText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  iosLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  iosLinkText: { fontSize: 12, fontFamily: fonts.body.semibold, color: colors.primary },
});
