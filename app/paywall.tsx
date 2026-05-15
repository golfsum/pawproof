import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { PAYWALL_COPY } from '@/lib/premium';
import { colors, radius, spacing, typography } from '@/theme';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gate?: string; reason?: string }>();
  const { togglePremium } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      await togglePremium(true);
      Alert.alert(
        'You\'re in!',
        'PawProof Plus features are now unlocked. Replace this stub with RevenueCat or StoreKit before launching.',
      );
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={36} color={colors.primary} />
        </View>

        <Text style={[typography.display, { textAlign: 'center' }]}>{PAYWALL_COPY.title}</Text>
        <Text style={[typography.h3, { textAlign: 'center', color: colors.primaryDark, marginTop: 4 }]}>
          {PAYWALL_COPY.tagline}
        </Text>

        {params.reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>{params.reason}</Text>
          </View>
        ) : null}

        <View style={styles.features}>
          {PAYWALL_COPY.features.map(f => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceBox}>
          <Text style={styles.priceLine}>7-day free trial</Text>
          <Text style={styles.price}>$4.99<Text style={{ fontSize: 14 }}>/month</Text></Text>
          <Text style={styles.priceFine}>Cancel anytime. Or $39.99/yr (save 33%).</Text>
        </View>

        <PrimaryButton title={PAYWALL_COPY.primaryCta} onPress={handleStart} loading={busy} icon="sparkles-outline" />
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'center', padding: spacing.md }}>
          <Text style={styles.maybeLater}>{PAYWALL_COPY.secondaryCta}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Stub paywall — for production, wire this button up to RevenueCat / StoreKit. The current implementation
          just flips an `isPremium` flag on your Firestore user doc.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardSubtle, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md },
  iconWrap: {
    alignSelf: 'center',
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.md,
  },
  reasonBox: {
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  reasonText: { color: '#92400e', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  features: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 15, color: colors.text, flex: 1 },
  priceBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  priceLine: { color: '#fff', opacity: 0.9, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  price: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  priceFine: { color: '#fff', opacity: 0.9, fontSize: 12, marginTop: 4 },
  maybeLater: { color: colors.textMuted, fontWeight: '600' },
  disclaimer: { color: colors.textFaint, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
