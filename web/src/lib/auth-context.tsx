"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth, db } from "./firebase";
import type { UserProfile } from "./types";

type AuthState = {
  user: User | null;
  /**
   * Live snapshot of `/users/{uid}` from Firestore. Null until the
   * profile doc loads (or always null when signed out). Components
   * should treat this as eventually-consistent — use optional
   * chaining rather than blocking on it.
   */
  profile: UserProfile | null;
  loading: boolean;
  // Bumps on every refresh() and auth state change so consumers can
  // react to in-place User mutations (Firebase reload() mutates
  // photoURL/displayName without a new reference).
  version: number;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  version: 0,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      setVersion((v) => v + 1);
      // Sign-out clears the profile immediately; the subscription
      // effect below handles re-subscribing on sign-in.
      if (!u) setProfile(null);
    });
  }, []);

  // Subscribe to /users/{uid} for the signed-in user. We keep the
  // subscription scoped to the uid so signing in as a different
  // account swaps the listener cleanly.
  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setProfile(null);
          return;
        }
        const data = snap.data();
        // Normalize the Firestore Timestamp -> ISO string the same
        // way use-user-data does, so consumers see consistent shapes.
        const createdAt = (() => {
          const raw = data.createdAt;
          if (!raw) return "";
          if (typeof raw === "string") return raw;
          if (typeof raw?.toDate === "function") return raw.toDate().toISOString();
          if (typeof raw?.seconds === "number")
            return new Date(raw.seconds * 1000).toISOString();
          return "";
        })();
        setProfile({
          id: snap.id,
          email: (data.email as string | null) ?? null,
          displayName: (data.displayName as string | null) ?? null,
          isPremium: Boolean(data.isPremium),
          premiumOriginalPurchaseAt:
            typeof data.premiumOriginalPurchaseAt === "string"
              ? data.premiumOriginalPurchaseAt
              : null,
          premiumLatestPurchaseAt:
            typeof data.premiumLatestPurchaseAt === "string"
              ? data.premiumLatestPurchaseAt
              : null,
          premiumExpiresAt:
            typeof data.premiumExpiresAt === "string" ? data.premiumExpiresAt : null,
          premiumProductId:
            typeof data.premiumProductId === "string" ? data.premiumProductId : null,
          premiumWillRenew:
            typeof data.premiumWillRenew === "boolean"
              ? data.premiumWillRenew
              : undefined,
          premiumPeriodType:
            typeof data.premiumPeriodType === "string" ? data.premiumPeriodType : null,
          premiumStore: typeof data.premiumStore === "string" ? data.premiumStore : null,
          freeOcrScansUsed:
            typeof data.freeOcrScansUsed === "number"
              ? data.freeOcrScansUsed
              : undefined,
          createdAt,
        });
      },
      () => {
        // Permission denied / network blip — leave profile null so
        // consumers fall back to user.email / "You".
        setProfile(null);
      },
    );
    return unsub;
  }, [user?.uid]);

  const refresh = useCallback(async () => {
    if (!auth?.currentUser) return;
    await auth.currentUser.reload();
    setVersion((v) => v + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, version, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Lazy ID token getter for API calls. Returns null when not signed in so
// callers can early-out cleanly instead of throwing.
export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
}
