import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
  type IntroEligibility,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

// RevenueCat integration. The public SDK key is NOT a secret (safe in the
// client). The "plus" entitlement is the single source of truth for premium —
// granted by Apple's receipt via RevenueCat, so it survives reinstalls and
// reflects real renewals/cancellations (which powers downgrade detection).

export const PLUS_ENTITLEMENT = 'plus';

export interface PremiumStatusSnapshot {
  isPremium: boolean;
  premiumOriginalPurchaseAt: string | null;
  premiumLatestPurchaseAt: string | null;
  premiumExpiresAt: string | null;
  premiumProductId: string | null;
  premiumWillRenew: boolean;
  premiumPeriodType: string | null;
  premiumStore: string | null;
}

// Prefer the EXPO_PUBLIC_ env var; fall back to app.json -> extra.revenueCatIosKey
// so a misconfigured EAS env can't silently disable billing in a build.
const IOS_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
  ((Constants.expoConfig?.extra as { revenueCatIosKey?: string } | undefined)?.revenueCatIosKey ?? '');

let configured = false;

/** True once RevenueCat is configured with a real key. */
export function isPurchasesConfigured(): boolean {
  return configured;
}

/**
 * Configure RevenueCat once at app start. Safe no-op if the key is absent
 * (e.g. local dev without billing set up) so the app still runs. Pass the
 * Firebase uid so RevenueCat ties purchases to the same identity.
 */
export function configurePurchases(uid: string | null): void {
  if (configured) {
    if (uid) Purchases.logIn(uid).catch(() => {});
    return;
  }
  if (!IOS_KEY) {
    console.log('[purchases] RevenueCat key not set — billing disabled.');
    return;
  }
  if (Platform.OS !== 'ios') {
    // Android key/setup not configured yet; iOS-only for v1.
    return;
  }
  // Wrap EVERYTHING: a malformed/wrong-type key (or any native init failure)
  // can throw synchronously here. An unhandled throw on app start = launch
  // crash. Billing is non-essential to running the app, so on any failure we
  // log and leave `configured` false — the paywall falls back gracefully and
  // the rest of the app works normally.
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: IOS_KEY, appUserID: uid ?? undefined });
    configured = true;
  } catch (e) {
    console.warn('[purchases] configure failed — billing disabled for this session:', e);
    configured = false;
  }
}

/** Whether a CustomerInfo grants the Plus entitlement. */
export function hasPlus(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return info.entitlements.active[PLUS_ENTITLEMENT] != null;
}

// The product identifier backing the active Plus entitlement, or null if not
// subscribed / not configured. Lets the paywall show "You're on Yearly".
export async function getActivePlanProductId(): Promise<string | null> {
  if (!configured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[PLUS_ENTITLEMENT];
    return ent?.productIdentifier ?? null;
  } catch {
    return null;
  }
}

// Map the active entitlement's product back to the package identifier
// ($rc_monthly/$rc_annual/$rc_lifetime) by matching it against the current
// offering — robust across Test Store and App Store, where product ids differ.
export async function getActivePackageId(): Promise<string | null> {
  if (!configured) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[PLUS_ENTITLEMENT];
    if (!ent) return null;
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const match = pkgs.find(p => p.product.identifier === ent.productIdentifier);
    return match?.identifier ?? null;
  } catch {
    return null;
  }
}

/** Current premium state from RevenueCat. Returns false if not configured. */
export async function fetchIsPremium(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return hasPlus(info);
  } catch (e) {
    console.warn('[purchases] getCustomerInfo failed:', e);
    return false;
  }
}

export async function fetchPremiumStatus(): Promise<PremiumStatusSnapshot> {
  if (!configured) return emptyPremiumStatus();
  try {
    const info = await Purchases.getCustomerInfo();
    return statusFromCustomerInfo(info);
  } catch (e) {
    console.warn('[purchases] getCustomerInfo failed:', e);
    return emptyPremiumStatus();
  }
}

/** Subscribe to entitlement changes (purchase, renewal, expiry, restore). */
export function addPremiumListener(cb: (status: PremiumStatusSnapshot) => void): () => void {
  if (!configured) return () => {};
  const handler = (info: CustomerInfo) => cb(statusFromCustomerInfo(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => Purchases.removeCustomerInfoUpdateListener(handler);
}

function statusFromCustomerInfo(info: CustomerInfo | null | undefined): PremiumStatusSnapshot {
  const ent = info?.entitlements.active[PLUS_ENTITLEMENT] ?? null;
  return statusFromEntitlement(ent);
}

function statusFromEntitlement(ent: PurchasesEntitlementInfo | null): PremiumStatusSnapshot {
  if (!ent) return emptyPremiumStatus();
  return {
    isPremium: true,
    premiumOriginalPurchaseAt: ent.originalPurchaseDate ?? null,
    premiumLatestPurchaseAt: ent.latestPurchaseDate ?? null,
    premiumExpiresAt: ent.expirationDate ?? null,
    premiumProductId: ent.productIdentifier ?? null,
    premiumWillRenew: ent.willRenew,
    premiumPeriodType: ent.periodType ?? null,
    premiumStore: ent.store ?? null,
  };
}

function emptyPremiumStatus(): PremiumStatusSnapshot {
  return {
    isPremium: false,
    premiumOriginalPurchaseAt: null,
    premiumLatestPurchaseAt: null,
    premiumExpiresAt: null,
    premiumProductId: null,
    premiumWillRenew: false,
    premiumPeriodType: null,
    premiumStore: null,
  };
}

/**
 * Fetch the current offering's purchasable packages, keyed by the RevenueCat
 * PACKAGE identifier ($rc_monthly / $rc_annual / $rc_lifetime). We key on the
 * package id — not pkg.product.identifier — because the product id differs
 * between the Test Store and the real App Store, whereas the package id is
 * stable across both. The paywall looks plans up by plan.packageId.
 */
export async function getPackages(): Promise<Record<string, PurchasesPackage>> {
  if (!configured) return {};
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    const out: Record<string, PurchasesPackage> = {};
    if (current) {
      for (const pkg of current.availablePackages) {
        out[pkg.identifier] = pkg;
      }
    }
    // Diagnostics (dev only): surfaces what RevenueCat returned so an empty
    // offering / missing products are easy to spot during setup.
    if (__DEV__) {
      console.log('[purchases] offerings →', {
        currentOffering: current?.identifier ?? '(none)',
        packageIds: Object.keys(out),
        productIds: current?.availablePackages.map(p => p.product.identifier) ?? [],
        allOfferings: Object.keys(offerings.all ?? {}),
      });
    }
    return out;
  } catch (e) {
    console.warn('[purchases] getOfferings failed:', e);
    return {};
  }
}

/**
 * Return intro/trial eligibility by App Store product identifier.
 * Unknown and ineligible both map to false so the UI never promises a trial
 * that Apple may not actually grant.
 */
export async function getTrialEligibility(
  productIds: string[],
): Promise<Record<string, boolean>> {
  if (!configured || Platform.OS !== 'ios' || productIds.length === 0) return {};
  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    const out: Record<string, boolean> = {};
    for (const [productId, result] of Object.entries(eligibility as Record<string, IntroEligibility>)) {
      out[productId] =
        result.status === Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
    }
    return out;
  } catch (e) {
    console.warn('[purchases] intro eligibility check failed:', e);
    return {};
  }
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'error';

/** Purchase a package. Returns the outcome; entitlement updates via listener. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<{ outcome: PurchaseOutcome; isPremium: boolean; message?: string }> {
  if (!configured) return { outcome: 'error', isPremium: false, message: 'Purchases are not available right now.' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { outcome: 'purchased', isPremium: hasPlus(customerInfo) };
  } catch (e: any) {
    if (e?.userCancelled) return { outcome: 'cancelled', isPremium: false };
    console.warn('[purchases] purchase failed:', e);
    return { outcome: 'error', isPremium: false, message: e?.message ?? 'Purchase failed.' };
  }
}

/** Restore prior purchases (App Store reinstall path). */
export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    const info = await Purchases.restorePurchases();
    return hasPlus(info);
  } catch (e) {
    console.warn('[purchases] restore failed:', e);
    return false;
  }
}

/**
 * Open the native iOS "Manage Subscriptions" sheet, where the user can switch
 * plans or cancel. Apple requires cancellation to happen here (apps can't
 * cancel directly). Returns false if it couldn't be opened so the caller can
 * fall back to a deep link.
 */
export async function manageSubscriptions(): Promise<boolean> {
  if (!configured) return false;
  try {
    await Purchases.showManageSubscriptions();
    return true;
  } catch (e) {
    console.warn('[purchases] showManageSubscriptions failed:', e);
    return false;
  }
}
