import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  ensureUserProfile,
  watchUserProfile,
  setPremium as fsSetPremium,
  markOnboardingComplete as fsMarkOnboardingComplete,
} from '@/lib/firestore';
import {
  signInWithGoogle as nativeSignInWithGoogle,
  signInWithApple as nativeSignInWithApple,
} from '@/lib/socialAuth';
import {
  configurePurchases,
  fetchIsPremium,
  addPremiumListener,
  isPurchasesConfigured,
} from '@/lib/purchases';
import { setDateOrder } from '@/utils/dates';
import { resolveDateFormat } from '@/utils/units';
import type { UserProfile } from '@/types/models';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Mark onboarding complete. Optimistically flips the local profile flag so
   * the root nav guard doesn't bounce the user back to onboarding while the
   * Firestore write is still in flight (the cause of the "skip flashes back"
   * bug). The write runs in the background.
   */
  completeOnboarding: (interests?: string[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Premium from RevenueCat's "plus" entitlement (null = unknown/not yet
  // configured, so we fall back to the Firestore flag below).
  const [entitlementPremium, setEntitlementPremium] = useState<boolean | null>(null);

  // Effective profile: RevenueCat entitlement is the source of truth for
  // isPremium when billing is configured; otherwise use the Firestore flag
  // (keeps the dev toggle + web admin grants working before billing exists).
  const profile: UserProfile | null = rawProfile
    ? { ...rawProfile, isPremium: entitlementPremium ?? rawProfile.isPremium }
    : rawProfile;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      // Flip initializing immediately so the splash can dismiss. Don't block
      // on the Firestore round-trip. `watchUserProfile` below will populate
      // `profile` once the doc exists; `ensureUserProfile` runs in the
      // background to create it for new users.
      setInitializing(false);
      if (u) {
        ensureUserProfile(u.uid, u.email).catch(err => {
          console.error('[auth] ensureUserProfile failed', err);
        });
        // Tie RevenueCat to this Firebase user so purchases follow identity.
        // Never let a billing init problem break auth/app startup.
        try { configurePurchases(u.uid); } catch (e) { console.warn('[auth] configurePurchases threw', e); }
      } else {
        setRawProfile(null);
        setEntitlementPremium(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setRawProfile(null);
      return;
    }
    const unsub = watchUserProfile(user.uid, setRawProfile);
    return unsub;
  }, [user?.uid]);

  // Apply the user's date-order preference globally so every fmtDate/fmtDay
  // reflects mdy vs dmy without threading the pref through call sites.
  useEffect(() => {
    setDateOrder(resolveDateFormat(rawProfile?.dateFormat));
  }, [rawProfile?.dateFormat]);

  // Sync premium state from RevenueCat: initial fetch + live listener for
  // purchases/renewals/expiries. Mirror the result into Firestore so the web
  // dashboard and the (future) downgrade trigger see the same truth.
  useEffect(() => {
    if (!user || !isPurchasesConfigured()) return;
    let mounted = true;
    fetchIsPremium().then(p => {
      if (mounted) setEntitlementPremium(p);
    });
    const remove = addPremiumListener(p => {
      if (!mounted) return;
      setEntitlementPremium(p);
      // Best-effort mirror; ignore failures (entitlement stays source of truth).
      fsSetPremium(user.uid, p).catch(() => {});
    });
    return () => { mounted = false; remove(); };
  }, [user?.uid]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      initializing,
      signIn: async (email, password) => {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      signUp: async (email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserProfile(cred.user.uid, cred.user.email);
      },
      signInWithGoogle: async () => {
        const cred = await nativeSignInWithGoogle();
        await ensureUserProfile(cred.user.uid, cred.user.email);
      },
      signInWithApple: async () => {
        const cred = await nativeSignInWithApple();
        await ensureUserProfile(cred.user.uid, cred.user.email);
      },
      signOut: async () => {
        await fbSignOut(auth);
      },
      completeOnboarding: (interests?: string[]) => {
        // Optimistic local flip so the guard sees onboardingCompleted=true
        // immediately (no flash back to the wizard).
        setRawProfile(prev => (prev ? { ...prev, onboardingCompleted: true } : prev));
        if (user) {
          fsMarkOnboardingComplete(user.uid, interests).catch(err => {
            console.warn('[auth] markOnboardingComplete failed (will retry next launch)', err);
          });
        }
      },
    }),
    [user, profile, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
