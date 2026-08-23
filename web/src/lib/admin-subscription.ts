// Product identifiers are the only cadence signal currently mirrored into
// Firestore. Keep these values aligned with src/lib/premium.ts. Unknown
// products stay unknown so the admin never guesses at a billing interval.

export type PlanCadence = "monthly" | "yearly" | "unknown";

const MONTHLY_PRODUCT_ID = "plus_monthly_499";
const YEARLY_PRODUCT_ID = "plus_yearly_3999";

export function resolvePlanCadence(productId: unknown): PlanCadence {
  if (typeof productId !== "string") return "unknown";

  const normalized = productId.trim().toLowerCase();
  if (normalized === MONTHLY_PRODUCT_ID) return "monthly";
  if (normalized === YEARLY_PRODUCT_ID) return "yearly";
  return "unknown";
}

export function planLabel(isPremium: boolean, cadence: PlanCadence): string {
  if (!isPremium) return "Free";
  if (cadence === "monthly") return "Monthly";
  if (cadence === "yearly") return "Yearly";
  return "Plus";
}

export function premiumStoreLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    APP_STORE: "App Store",
    MAC_APP_STORE: "Mac App Store",
    PLAY_STORE: "Google Play",
    AMAZON: "Amazon",
    STRIPE: "Stripe",
    PROMOTIONAL: "Promotional",
    RC_BILLING: "RevenueCat",
  };
  return labels[normalized] ?? value;
}
