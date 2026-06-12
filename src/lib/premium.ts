import type { UserProfile } from '@/types/models';

// Free tier: generous enough to actually use the app with a small
// household (2 pets, a handful of records) and try the Smart Scan
// magic once before deciding to upgrade. Anything more starts paying
// off the work Plus does for you (OCR, exports, multi-pet management).
export const FREE_LIMITS = {
  pets: 2,
  documents: 3,
  ocrScans: 1,
} as const;

export type PremiumGate =
  | 'add_pet'
  | 'upload_document'
  | 'ocr_scan'
  | 'pdf_export'
  | 'advanced_recurring';

export interface GateCheckArgs {
  profile: UserProfile | null;
  petCount?: number;
  documentCount?: number;
  ocrScansUsed?: number;
}

export interface GateResult {
  allowed: boolean;
  reason?: string;
  gate: PremiumGate;
}

export function checkGate(gate: PremiumGate, args: GateCheckArgs): GateResult {
  if (args.profile?.isPremium) {
    return { allowed: true, gate };
  }
  switch (gate) {
    case 'add_pet':
      if ((args.petCount ?? 0) >= FREE_LIMITS.pets) {
        return {
          allowed: false,
          gate,
          reason: 'Managing multiple pets? Upgrade for unlimited pets.',
        };
      }
      return { allowed: true, gate };

    case 'upload_document':
      if ((args.documentCount ?? 0) >= FREE_LIMITS.documents) {
        return {
          allowed: false,
          gate,
          reason: `You've used your ${FREE_LIMITS.documents} free documents. Upgrade for unlimited storage.`,
        };
      }
      return { allowed: true, gate };

    case 'ocr_scan':
      // First scan is free so the user gets one "wow moment" before
      // hitting the paywall. After that, Smart Scan is Plus-only.
      if ((args.ocrScansUsed ?? 0) < FREE_LIMITS.ocrScans) {
        return { allowed: true, gate };
      }
      return {
        allowed: false,
        gate,
        reason: 'Try Smart Scan free. Save vaccine records in seconds.',
      };

    case 'pdf_export':
      return {
        allowed: false,
        gate,
        reason: 'Create a shareable PDF for your vet, sitter, or boarding facility.',
      };

    case 'advanced_recurring':
      return {
        allowed: false,
        gate,
        reason: 'Advanced reminder schedules are a PawProof Plus feature.',
      };
  }
}

/**
 * Whether the user is on their free Smart Scan trial. Used by the scan
 * screen to render a subtle one-time banner so the user knows they're
 * sampling a Plus feature (without forcing a paywall detour first).
 */
export function isOcrTrialAvailable(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.isPremium) return false;
  return (profile.freeOcrScansUsed ?? 0) < FREE_LIMITS.ocrScans;
}

// Plan catalog. The IDs match the StoreKit / Google Play product IDs
// you'll set up in App Store Connect / Play Console before launch.
// Trial flag drives the "Start 7-day free trial" CTA and the small
// "Then $X" subline.
export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  /** App Store product identifier (used for display/reference). */
  productId: string;
  /** RevenueCat package identifier — stable across Test Store and App Store
   *  (e.g. '$rc_monthly'). This is what we match offerings on. */
  packageId: string;
  label: string;
  price: string;
  perMonth?: string;
  trialDays: number | null;
  badge?: string;
  description: string;
  // The exact line under the main CTA when this plan is selected.
  ctaSubline: string;
}

export const PLANS: Record<PlanId, Plan> = {
  yearly: {
    id: 'yearly',
    productId: 'plus_yearly_3999',
    packageId: '$rc_annual',
    label: 'Yearly',
    price: '$39.99/year',
    perMonth: '$3.33/month',
    trialDays: 7,
    badge: 'Save 33%',
    description: 'Best value',
    ctaSubline: 'Then $39.99/year. Cancel anytime.',
  },
  monthly: {
    id: 'monthly',
    productId: 'plus_monthly_499',
    packageId: '$rc_monthly',
    label: 'Monthly',
    price: '$4.99/month',
    trialDays: 7,
    description: 'Try it month to month',
    ctaSubline: 'Then $4.99/month. Cancel anytime.',
  },
};

// Default plan to highlight on the paywall. Yearly because it pushes
// the better-margin SKU and unlocks the 7-day trial framing.
export const DEFAULT_PLAN: PlanId = 'yearly';

// Paywall copy. The lead pitch is the time-saving OCR magic, not
// "premium." Feature list keeps OCR + PDF exports at the top because
// those are the two features people will hit on a real workflow.
export const PAYWALL_COPY = {
  title: 'PawProof Plus',
  tagline: 'Scan vaccine records in seconds.',
  pitch:
    'PawProof Plus reads vaccine names, dates, clinics, and expiration info so you don\'t have to enter everything by hand.',
  trialCta: 'Start 7-day free trial',
  buyCta: 'Unlock PawProof Plus',
  secondaryCta: 'Continue with Free',
  features: [
    'Unlimited pets',
    'Unlimited document storage',
    'Smart Scan for vaccine records and documents',
    'PDF exports for vets, sitters, boarding, and emergencies',
    'Advanced reminder schedules',
    'Family and caregiver sharing (coming soon)',
  ],
};

// Per-gate paywall overrides. The headline + sub adapt to what the
// user was trying to do, so a paywall fired from "tap Scan Document"
// reads differently from one fired by "add 3rd pet." Falls back to
// the default tagline/pitch when no gate is supplied.
export const GATE_COPY: Record<
  PremiumGate,
  { headline: string; sub: string }
> = {
  ocr_scan: {
    headline: 'Save vaccine records in seconds',
    sub: 'Smart Scan is included with PawProof Plus. Scan vaccine records and vet documents and let PawProof pull out the dates, names, and expirations for you.',
  },
  add_pet: {
    headline: 'Managing a full pet household?',
    sub: 'Upgrade to PawProof Plus to add unlimited pets and keep every profile organized.',
  },
  upload_document: {
    headline: "You've used your 3 free documents",
    sub: 'Upgrade to PawProof Plus to keep unlimited records for your pets.',
  },
  pdf_export: {
    headline: 'Create a shareable PDF',
    sub: 'Export records for your vet, pet sitter, boarding facility, or emergency contact with PawProof Plus.',
  },
  advanced_recurring: {
    headline: 'Reminders, your schedule',
    sub: 'Advanced recurring schedules (every N days, custom intervals) are part of PawProof Plus.',
  },
};
