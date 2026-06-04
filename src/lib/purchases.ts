import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

// RevenueCat integration. The public SDK key is NOT a secret (safe in the
// client). The "plus" entitlement is the single source of truth for premium —
// granted by Apple's receipt via RevenueCat, so it survives reinstalls and
// reflects real renewals/cancellations (which powers downgrade detection).

export const PLUS_ENTITLEMENT = 'plus';

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
    console.log('[purchases] EXPO_PUBLIC_REVENUECAT_IOS_KEY not set — billing disabled.');
    return;
  }
  if (Platform.OS !== 'ios') {
    // Android key/setup not configured yet; iOS-only for v1.
    return;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: IOS_KEY, appUserID: uid ?? undefined });
  configured = true;
}

/** Whether a CustomerInfo grants the Plus entitlement. */
export function hasPlus(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  return info.entitlements.active[PLUS_ENTITLEMENT] != null;
}

// The productIdentifier backing the active Plus entitlement (e.g.
// 'plus_yearly_3999'), or null if not subscribed / not configured. Lets the
// paywall show "You're on Yearly" and offer the other billing periods.
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

/** Subscribe to entitlement changes (purchase, renewal, expiry, restore). */
export function addPremiumListener(cb: (isPremium: boolean) => void): () => void {
  if (!configured) return () => {};
  const handler = (info: CustomerInfo) => cb(hasPlus(info));
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => Purchases.removeCustomerInfoUpdateListener(handler);
}

/** Fetch the current offering's purchasable packages, keyed by productId. */
export async function getPackages(): Promise<Record<string, PurchasesPackage>> {
  if (!configured) return {};
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const out: Record<string, PurchasesPackage> = {};
  if (current) {
    for (const pkg of current.availablePackages) {
      out[pkg.product.identifier] = pkg;
    }
  }
  return out;
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
