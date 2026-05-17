import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { DEFAULT_PLAN, GATE_COPY, PAYWALL_COPY, PLANS, type Plan, type PlanId, type PremiumGate } from '@/lib/premium';
import { colors, fonts, radius, spacing, typography } from '@/theme';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gate?: string; reason?: string }>();
  const { togglePremium } = useAuth();
  const [busy, setBusy] = useState(false);
  // Yearly highlighted by default. We list it first in the UI so the
  // Best Value framing is the user's anchor — monthly and lifetime feel
  // like alternatives instead of the primary choice.
  const [selected, setSelected] = useState<PlanId>(DEFAULT_PLAN);

  const plan = PLANS[selected];

  // Per-gate headline override. When the paywall is fired by a specific
  // gate (Scan, Add pet, Upload, PDF, Advanced reminders), the top of
  // the sheet reads in that gate's voice. The generic OCR pitch is the
  // fallback for organic upgrade taps.
  const gateKey = (params.gate as PremiumGate | undefined) ?? null;
  const gateCopy = gateKey && GATE_COPY[gateKey] ? GATE_COPY[gateKey] : null;
  const headline = gateCopy?.headline ?? PAYWALL_COPY.tagline;
  const pitch = gateCopy?.sub ?? PAYWALL_COPY.pitch;

  const handleStart = async () => {
    setBusy(true);
    try {
      await togglePremium(true);
      Alert.alert(
        'You\'re in!',
        `PawProof Plus features are now unlocked. Replace this stub with RevenueCat or StoreKit before launching (selected product: ${plan.productId}).`,
      );
      router.back();
    } finally {
      setBusy(false);
    }
  };

  // CTA changes based on plan: trial framing for subscriptions, direct
  // purchase for lifetime. Apple's trial UX kicks in automatically when
  // the product has an introductory offer configured.
  const primaryCta = plan.trialDays ? PAYWALL_COPY.trialCta : PAYWALL_COPY.buyCta;

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
          <Ionicons name="scan-outline" size={36} color={colors.primary} />
        </View>

        <Text style={[typography.display, { textAlign: 'center' }]}>{PAYWALL_COPY.title}</Text>
        <Text style={styles.tagline}>{headline}</Text>
        <Text style={styles.pitch}>{pitch}</Text>

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

        <View style={styles.planList}>
          <PlanCard
            plan={PLANS.yearly}
            selected={selected === 'yearly'}
            highlighted
            onPress={() => setSelected('yearly')}
          />
          <PlanCard
            plan={PLANS.monthly}
            selected={selected === 'monthly'}
            onPress={() => setSelected('monthly')}
          />
          <PlanCard
            plan={PLANS.lifetime}
            selected={selected === 'lifetime'}
            onPress={() => setSelected('lifetime')}
          />
        </View>

        <PrimaryButton
          title={primaryCta}
          onPress={handleStart}
          loading={busy}
          icon={plan.trialDays ? 'sparkles-outline' : 'cart-outline'}
        />
        <Text style={styles.ctaSubline}>{plan.ctaSubline}</Text>

        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.maybeLaterBtn}>
          <Text style={styles.maybeLater}>{PAYWALL_COPY.secondaryCta}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew until cancelled. Manage in your Apple ID
          settings. Stub paywall, wire to RevenueCat / StoreKit before
          launch.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  selected,
  highlighted,
  onPress,
}: {
  plan: Plan;
  selected: boolean;
  highlighted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        highlighted && styles.planCardHighlighted,
        selected && styles.planCardSelected,
        pressed && { opacity: 0.92 },
      ]}
    >
      {plan.badge ? (
        <View style={[styles.planBadge, highlighted ? styles.planBadgePrimary : styles.planBadgeNeutral]}>
          <Text style={[styles.planBadgeText, highlighted ? { color: '#fff' } : { color: colors.primaryDark }]}>
            {plan.badge}
          </Text>
        </View>
      ) : null}

      <View style={styles.planRadio}>
        <View style={[styles.planRadioOuter, selected && { borderColor: colors.primary }]}>
          {selected ? <View style={styles.planRadioInner} /> : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.planLabel}>{plan.label}</Text>
        <Text style={styles.planPrice}>
          {plan.price}
          {plan.perMonth ? <Text style={styles.planPerMonth}>  ·  {plan.perMonth}</Text> : null}
        </Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardSubtle, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing['3xl'] },
  iconWrap: {
    alignSelf: 'center',
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  tagline: {
    fontSize: 18,
    fontFamily: fonts.display.bold,
    color: colors.primaryDark,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: -0.2,
  },
  pitch: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  reasonBox: {
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  reasonText: { color: '#92400e', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  features: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, color: colors.text, flex: 1 },

  planList: { gap: spacing.sm, marginTop: spacing.md },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingRight: spacing.base,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  planCardHighlighted: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + '55',
  },
  planCardSelected: {
    borderColor: colors.primary,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  planBadgePrimary: { backgroundColor: colors.primary },
  planBadgeNeutral: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary + '55' },
  planBadgeText: { fontSize: 10, fontFamily: fonts.body.semibold, letterSpacing: 0.6, textTransform: 'uppercase' },

  planRadio: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  planRadioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.primary,
  },

  planLabel: {
    fontSize: 15,
    fontFamily: fonts.body.semibold,
    color: colors.text,
  },
  planPrice: {
    fontSize: 16,
    fontFamily: fonts.display.bold,
    color: colors.text,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  planPerMonth: {
    fontSize: 13,
    fontFamily: fonts.body.semibold,
    color: colors.textMuted,
    letterSpacing: 0,
  },
  planDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  ctaSubline: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  maybeLaterBtn: { alignSelf: 'center', padding: spacing.md, marginTop: spacing.xs },
  maybeLater: { color: colors.textMuted, fontWeight: '600' },
  disclaimer: { color: colors.textFaint, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: spacing.md },
});
