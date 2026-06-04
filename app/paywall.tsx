import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
import { Screen } from '@/components/Screen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/AuthProvider';
import { DEFAULT_PLAN, GATE_COPY, PAYWALL_COPY, PLANS, type Plan, type PlanId, type PremiumGate } from '@/lib/premium';
import {
  isPurchasesConfigured,
  getActivePlanProductId,
  getPackages,
  purchasePackage,
  restorePurchases,
} from '@/lib/purchases';
import { colors, fonts, radius, spacing, typography } from '@/theme';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gate?: string; reason?: string }>();
  const { togglePremium } = useAuth();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // Live RevenueCat packages keyed by productId. Empty until loaded (or if
  // billing isn't configured yet, in which case we degrade gracefully).
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const billingReady = isPurchasesConfigured();
  // Yearly highlighted by default. We list it first in the UI so the
  // Best Value framing is the user's anchor — monthly and lifetime feel
  // like alternatives instead of the primary choice.
  const [selected, setSelected] = useState<PlanId>(DEFAULT_PLAN);

  const plan = PLANS[selected];

  // The plan the user is already subscribed to (if any), so we can show
  // "Current plan" and frame the others as a switch rather than a new buy.
  const [currentPlanId, setCurrentPlanId] = useState<PlanId | null>(null);
  const isSubscribed = currentPlanId != null;

  useEffect(() => {
    if (!billingReady) return;
    getPackages().then(setPackages).catch(() => {});
    getActivePlanProductId().then(pid => {
      if (!pid) return;
      const match = (Object.values(PLANS) as Plan[]).find(p => p.productId === pid);
      if (match) {
        setCurrentPlanId(match.id);
        setSelected(match.id); // highlight their current plan by default
      }
    }).catch(() => {});
  }, [billingReady]);

  // Per-gate headline override. When the paywall is fired by a specific
  // gate (Scan, Add pet, Upload, PDF, Advanced reminders), the top of
  // the sheet reads in that gate's voice. The generic OCR pitch is the
  // fallback for organic upgrade taps.
  const gateKey = (params.gate as PremiumGate | undefined) ?? null;
  const gateCopy = gateKey && GATE_COPY[gateKey] ? GATE_COPY[gateKey] : null;
  const headline = gateCopy?.headline ?? PAYWALL_COPY.tagline;
  const pitch = gateCopy?.sub ?? PAYWALL_COPY.pitch;

  const handleStart = async () => {
    if (!billingReady) {
      // In DEV builds, fall back to the manual flag so the flow is testable
      // before RevenueCat is configured. In production this NEVER grants Plus
      // for free — it just reports that purchases aren't available yet.
      if (__DEV__) {
        setBusy(true);
        try {
          await togglePremium(true);
          Alert.alert('Plus unlocked (dev mode)', 'Dev-only. Real purchases activate once billing is configured on a device build.');
          router.back();
        } finally {
          setBusy(false);
        }
      } else {
        Alert.alert('Purchases unavailable', 'In-app purchases aren\'t available right now. Please try again later.');
      }
      return;
    }

    const pkg = packages[plan.productId];
    if (!pkg) {
      Alert.alert('Unavailable', 'This plan isn\'t available right now. Please try again later.');
      return;
    }
    setBusy(true);
    try {
      const res = await purchasePackage(pkg);
      if (res.outcome === 'purchased') {
        // Entitlement (and isPremium) updates via the AuthProvider listener.
        router.back();
      } else if (res.outcome === 'error') {
        Alert.alert('Purchase failed', res.message ?? 'Please try again.');
      }
      // 'cancelled' → silently stay on the paywall.
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!billingReady) {
      Alert.alert('Restore', 'Purchases restore automatically on a device build signed into your Apple ID.');
      return;
    }
    setRestoring(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(
        ok ? 'Restored' : 'Nothing to restore',
        ok ? 'Your PawProof Plus access is active again.' : 'No previous PawProof Plus purchase was found for this Apple ID.',
      );
      if (ok) router.back();
    } finally {
      setRestoring(false);
    }
  };

  // CTA adapts: already on this plan → disabled "Current plan"; subscribed to a
  // different one → "Switch to X"; otherwise trial/buy framing.
  const onSelectedPlan = currentPlanId === selected;
  const primaryCta = onSelectedPlan
    ? 'Your current plan'
    : isSubscribed
      ? `Switch to ${plan.label}`
      : plan.trialDays ? PAYWALL_COPY.trialCta : PAYWALL_COPY.buyCta;

  return (
    <Screen edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={[typography.display, { textAlign: 'center' }]}>{PAYWALL_COPY.title}</Text>
        {isSubscribed ? (
          <View style={styles.subscribedPill}>
            <Ionicons name="checkmark-circle" size={15} color="#1E6C80" />
            <Text style={styles.subscribedText}>
              You&apos;re subscribed · {currentPlanId ? PLANS[currentPlanId].label : 'Plus'}
            </Text>
          </View>
        ) : (
          <Text style={styles.tagline}>{headline}</Text>
        )}
        <Text style={styles.pitch}>
          {isSubscribed ? 'Manage or switch your billing period below.' : pitch}
        </Text>

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
            isCurrent={currentPlanId === 'yearly'}
            highlighted
            onPress={() => setSelected('yearly')}
          />
          <PlanCard
            plan={PLANS.monthly}
            selected={selected === 'monthly'}
            isCurrent={currentPlanId === 'monthly'}
            onPress={() => setSelected('monthly')}
          />
          <PlanCard
            plan={PLANS.lifetime}
            selected={selected === 'lifetime'}
            isCurrent={currentPlanId === 'lifetime'}
            onPress={() => setSelected('lifetime')}
          />
        </View>

        <PrimaryButton
          title={primaryCta}
          onPress={handleStart}
          loading={busy}
          disabled={onSelectedPlan}
          icon={onSelectedPlan ? 'checkmark-outline' : plan.trialDays ? 'sparkles-outline' : 'cart-outline'}
        />
        {!onSelectedPlan ? <Text style={styles.ctaSubline}>{plan.ctaSubline}</Text> : null}

        <Pressable onPress={handleRestore} hitSlop={10} disabled={restoring} style={styles.maybeLaterBtn}>
          <Text style={styles.maybeLater}>{restoring ? 'Restoring…' : 'Restore purchases'}</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.maybeLaterBtn}>
          <Text style={styles.maybeLater}>{PAYWALL_COPY.secondaryCta}</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew until cancelled. Manage or cancel anytime in
          your Apple ID settings.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  selected,
  highlighted,
  isCurrent,
  onPress,
}: {
  plan: Plan;
  selected: boolean;
  highlighted?: boolean;
  isCurrent?: boolean;
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
      {isCurrent ? (
        <View style={[styles.planBadge, styles.planBadgeCurrent]}>
          <Text style={[styles.planBadgeText, { color: '#fff' }]}>Current plan</Text>
        </View>
      ) : plan.badge ? (
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
  logoWrap: {
    alignSelf: 'center',
    width: 84, height: 84, borderRadius: 22,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  logo: { width: '100%', height: '100%' },
  subscribedPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  subscribedText: { fontSize: 13, fontFamily: fonts.body.semibold, color: '#1E6C80' },
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
  planBadgeCurrent: { backgroundColor: '#1E6C80' },
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
