"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { auth } from "./firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
  // Bumps on every refresh() and auth state change so consumers can
  // react to in-place User mutations (Firebase reload() mutates
  // photoURL/displayName without a new reference).
  version: number;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  version: 0,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!auth?.currentUser) return;
    await auth.currentUser.reload();
    setVersion((v) => v + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, version, refresh }}>
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
