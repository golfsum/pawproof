import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useData } from '@/hooks/useData';
import { colors, fonts, radius, spacing } from '@/theme';

// The app icon — bundled at build time so it renders instantly without
// hitting the asset cache and matches what the user sees on their home screen.
const APP_ICON = require('../../assets/icon.png');

/**
 * Persistent header that sits at the top of every tab screen. Left side
 * carries the brand identity (paw + PawProof wordmark) so the user always
 * knows where they are; right side carries the two cross-cutting shortcuts:
 * Emergency card and Settings/profile.
 *
 * Self-contained — pulls pets from useData() and routes to /pet/emergency
 * or /settings on its own, so callers just drop it in.
 */
export function TabsHeader() {
  const router = useRouter();
  const { pets } = useData();

  // Emergency button visual: stays subdued (outlined) until the user has
  // actually entered emergency contact info on at least one pet. Once
  // there's something to show in the emergency card, the pill switches
  // to the filled red treatment — turning the badge into a payoff rather
  // than a permanent attention-grabber.
  const hasEmergencyInfo = pets.some(
    p => (p.emergencyContactName && p.emergencyContactPhone) || p.vetPhone,
  );

  const openEmergency = () => {
    if (pets.length === 0) return;
    if (pets.length === 1) {
      router.push({ pathname: '/pet/emergency/[id]', params: { id: pets[0].id } });
      return;
    }
    const labels = pets.map(p => p.name);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Emergency card for…',
          options: [...labels, 'Cancel'],
          cancelButtonIndex: labels.length,
        },
        idx => {
          if (idx >= 0 && idx < pets.length) {
            router.push({ pathname: '/pet/emergency/[id]', params: { id: pets[idx].id } });
          }
        },
      );
    } else {
      Alert.alert('Emergency card', 'Pick a pet', [
        ...pets.map(p => ({
          text: p.name,
          onPress: () => router.push({ pathname: '/pet/emergency/[id]' as const, params: { id: p.id } }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.push('/(tabs)')}
        hitSlop={6}
        style={({ pressed }) => [styles.brand, pressed && { opacity: 0.85 }]}
      >
        <Image source={APP_ICON} style={styles.brandIcon} contentFit="cover" />
        <Text style={styles.brandName}>PawProof</Text>
      </Pressable>

      <View style={styles.actions}>
        {pets.length > 0 ? (
          <Pressable
            onPress={openEmergency}
            hitSlop={6}
            style={({ pressed }) => [
              styles.emergencyBtn,
              hasEmergencyInfo ? styles.emergencyBtnFilled : styles.emergencyBtnOutlined,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="medkit-outline" size={13} color={colors.danger} />
            <Text style={styles.emergencyBtnText}>Emergency</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={styles.profileBtn}>
          <Ionicons name="person-circle-outline" size={28} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  brandIcon: {
    // 28×28 keeps the brand recognizable without stealing vertical space
    // from the screen content below — important on smaller phones.
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandName: {
    fontFamily: fonts.display.bold,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.3,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  // Filled — only when the user has set up emergency contact info, so the
  // colour pays off real data instead of always shouting.
  emergencyBtnFilled: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  // Outlined default — same shape and tap target, much quieter visual
  // weight when there's no emergency info to show yet.
  emergencyBtnOutlined: {
    backgroundColor: 'transparent',
    borderColor: colors.danger + '55',
  },
  emergencyBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    color: colors.danger,
    letterSpacing: 0.1,
  },
  profileBtn: { padding: 2 },
});
