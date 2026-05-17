import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ensureUserProfile, watchUserProfile, setPremium as fsSetPremium } from '@/lib/firestore';
import {
  signInWithGoogle as nativeSignInWithGoogle,
  signInWithApple as nativeSignInWithApple,
} from '@/lib/socialAuth';
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
  togglePremium: (next?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);

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
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const unsub = watchUserProfile(user.uid, setProfile);
    return unsub;
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
      togglePremium: async (next?: boolean) => {
        if (!user) return;
        const target = next ?? !profile?.isPremium;
        await fsSetPremium(user.uid, target);
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
