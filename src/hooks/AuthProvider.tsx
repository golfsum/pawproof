import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
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
  linkWithGoogle as nativeLinkGoogle,
  linkWithApple as nativeLinkApple,
  CredentialInUseError,
} from '@/lib/socialAuth';
import {
  configurePurchases,
  fetchPremiumStatus,
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
  /** True when the current session is an anonymous "guest" account. */
  isGuest: boolean;
  /** Start a no-account guest session (Firebase anonymous auth). */
  continueAsGuest: () => Promise<void>;
  /**
   * Convert (link) the current guest account to a permanent one, KEEPING the
   * same uid and all data. Throw CredentialInUseError if the credential is
   * already attached to another account.
   */
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  linkGoogle: () => Promise<void>;
  linkApple: () => Promise<void>;
  /**
   * Mark onboarding complete. Optimistically flips the local profile flag so
   * the root nav guard doesn't bounce the user back to onboarding while the
   * Firestore write is still in flight (the cause of the "skip flashes back"
   * bug). The write runs in the background.
   */
  completeOnboarding: (interests?: string[]) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// App Store / Play review accounts that always get Plus, regardless of
// RevenueCat. Reviewers can't make real sandbox purchases reliably, so we
// guarantee full-feature access for these specific demo logins. Compared
// lower-cased; only grants premium (no other privileges).
const REVIEW_EMAILS = ['apple_test@pawproof.app'];

function isReviewAccount(email: string | null | undefined): boolean {
  return !!email && REVIEW_EMAILS.includes(email.toLowerCase());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rawProfile, setRawProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Premium from RevenueCat's "plus" entitlement (null = unknown/not yet
  // configured, so we fall back to the Firestore flag below).
  const [entitlementPremium, setEntitlementPremium] = useState<boolean | null>(null);
  // Flips true once RevenueCat is actually configured. Drives the premium-sync
  // effect so it can't run-and-bail before billing is ready (which left
  // entitlementPremium stuck at null and gated paying users — the
  // "subscribed but can't add a 3rd pet" bug).
  const [purchasesReady, setPurchasesReady] = useState(false);
  // Bumped on token changes (e.g. linking a guest account to a real one, which
  // mutates the user in place without firing onAuthStateChanged). Forces the
  // context value to recompute isGuest etc.
  const [authTick, setAuthTick] = useState(0);

  // Effective profile: RevenueCat entitlement is the source of truth for
  // isPremium when billing is configured; otherwise use the Firestore flag
  // (keeps the dev toggle + web admin grants working before billing exists).
  const profile: UserProfile | null = rawProfile
    ? {
        ...rawProfile,
        isPremium: isReviewAccount(user?.email)
          ? true
          : entitlementPremium ?? rawProfile.isPremium,
      }
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
        // Signal readiness so the premium-sync effect runs AFTER configure
        // (not before), regardless of effect/callback ordering.
        setPurchasesReady(isPurchasesConfigured());
      } else {
        setRawProfile(null);
        setEntitlementPremium(null);
        setPurchasesReady(false);
      }
    });
    // Linking a guest → real account mutates the current user without firing
    // onAuthStateChanged; onIdTokenChanged does fire, so use it to refresh.
    const unsubToken = onIdTokenChanged(auth, () => setAuthTick(t => t + 1));
    return () => {
      unsub();
      unsubToken();
    };
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
    if (!user || !purchasesReady) return;
    let mounted = true;
    const refresh = () => {
      fetchPremiumStatus().then(status => {
        if (!mounted) return;
        setEntitlementPremium(status.isPremium);
        fsSetPremium(user.uid, status).catch(() => {});
      });
    };
    // Initial fetch + live listener for purchases/renewals/expiries.
    refresh();
    const remove = addPremiumListener(status => {
      if (!mounted) return;
      setEntitlementPremium(status.isPremium);
      fsSetPremium(user.uid, status).catch(() => {});
    });
    // Re-check whenever the app returns to the foreground, so a purchase,
    // renewal, or expiry that happened elsewhere is reflected promptly.
    const appStateSub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    return () => {
      mounted = false;
      remove();
      appStateSub.remove();
    };
  }, [user?.uid, purchasesReady]);

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
      isGuest: !!user?.isAnonymous,
      continueAsGuest: async () => {
        await signInAnonymously(auth);
      },
      linkEmailPassword: async (email, password) => {
        const u = auth.currentUser;
        if (!u) throw new Error('You must be signed in.');
        const credential = EmailAuthProvider.credential(email.trim(), password);
        try {
          const res = await linkWithCredential(u, credential);
          await ensureUserProfile(res.user.uid, res.user.email);
        } catch (e: any) {
          if (
            e?.code === 'auth/email-already-in-use' ||
            e?.code === 'auth/credential-already-in-use'
          ) {
            throw new CredentialInUseError();
          }
          throw e;
        }
      },
      linkGoogle: async () => {
        const res = await nativeLinkGoogle();
        await ensureUserProfile(res.user.uid, res.user.email);
      },
      linkApple: async () => {
        const res = await nativeLinkApple();
        await ensureUserProfile(res.user.uid, res.user.email);
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
    // authTick: rebuild after a token change so isGuest reflects a just-linked
    // (no-longer-anonymous) user even though the User object is mutated in place.
    [user, profile, initializing, authTick],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
