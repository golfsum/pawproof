import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuth } from './AuthProvider';
import { useData } from './useData';
import { checkGate, isOcrTrialAvailable, type PremiumGate } from '@/lib/premium';

/** Check a premium gate and, if blocked, route the user to the paywall. */
export function useGate() {
  const { profile } = useAuth();
  const { pets, documents } = useData();

  const check = useCallback(
    (gate: PremiumGate): boolean => {
      const result = checkGate(gate, {
        profile,
        petCount: pets.length,
        documentCount: documents.length,
        ocrScansUsed: profile?.freeOcrScansUsed ?? 0,
      });
      if (!result.allowed) {
        router.push({ pathname: '/paywall', params: { gate, reason: result.reason ?? '' } });
        return false;
      }
      return true;
    },
    [profile, pets.length, documents.length],
  );

  return {
    check,
    isPremium: !!profile?.isPremium,
    ocrTrialAvailable: isOcrTrialAvailable(profile),
    freeOcrScansUsed: profile?.freeOcrScansUsed ?? 0,
  };
}
