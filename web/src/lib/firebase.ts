import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? (getApps()[0] ?? initializeApp(config))
  : null;

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

// IndexedDB-backed offline cache so the dashboard survives reloads and
// works across tabs. Same setup as the mobile app uses through AsyncStorage.
export const db: Firestore | null = firebaseApp
  ? initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : null;

export function requireAuth(): Auth {
  if (!auth) throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local.");
  return auth;
}

export function requireDb(): Firestore {
  if (!db) throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* in .env.local.");
  return db;
}

// Transient permission/auth errors fire during sign-out and account-switch
// transitions while the previous listener is still attached. Surfacing
// them flashes a misleading "permission denied". Page-level handlers
// should skip them.
export function isTransientAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: string }).code;
  if (!code) return false;
  return (
    code === "permission-denied" ||
    code === "unauthenticated" ||
    code === "auth/user-token-expired" ||
    code === "auth/no-current-user"
  );
}
