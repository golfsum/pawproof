import type { UserProfile } from '@/types/models';

// Free tier — generous enough to actually use the app with a small
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
          reason: 'Managing a full pet household? Add unlimited pets with Plus.',
        };
      }
      return { allowed: true, gate };

    case 'upload_document':
      if ((args.documentCount ?? 0) >= FREE_LIMITS.documents) {
        return {
          allowed: false,
          gate,
          reason: `You've used your ${FREE_LIMITS.documents} free documents. Upgrade to keep unlimited records.`,
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
        reason: "You've used your free Smart Scan. Upgrade for unlimited scans of vaccine records and documents.",
      };

    case 'pdf_export':
      return {
        allowed: false,
        gate,
        reason: 'Create a shareable PDF for your vet, sitter, or boarding facility with PawProof Plus.',
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

// Paywall copy. Features are ordered by user-visible value — OCR + PDF
// exports lead because those are the two features people will hit on a
// real workflow. Advanced recurring is listed but never headlined.
export const PAYWALL_COPY = {
  title: 'PawProof Plus',
  tagline: "Keep every pet's care organized without the manual work.",
  primaryCta: 'Start PawProof Plus',
  secondaryCta: 'Continue with Free',
  features: [
    'Unlimited pets',
    'Unlimited document uploads',
    'Smart Scan for vaccine records and documents',
    'PDF exports for vets, pet sitters, boarding, and emergencies',
    'Advanced reminder schedules',
    'Family and caregiver sharing (coming soon)',
  ],
};
