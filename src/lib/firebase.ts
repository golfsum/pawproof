import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-expect-error - getReactNativePersistence isn't in the public type, but is exported from firebase/auth.
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Source of truth for Firebase config: app.json → extra.firebase (baked into
// every build, can't be broken by a wrong/missing EAS env var). These values
// are NOT secret — they ship in every client binary by design; security is
// enforced by Firestore/Storage rules. Fall back to EXPO_PUBLIC_* env vars
// (used by `expo start` from .env) only when the bundled config is absent.
const bundled = (Constants.expoConfig?.extra?.firebase ?? {}) as Partial<{
  apiKey: string; authDomain: string; projectId: string;
  storageBucket: string; messagingSenderId: string; appId: string;
}>;

const firebaseConfig = {
  apiKey: bundled.apiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: bundled.authDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: bundled.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: bundled.storageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: bundled.messagingSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: bundled.appId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // initializeAuth must run exactly once per app, and only on the first import.
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// Always TRY to initialize Firestore with our settings. If a previous
// instance already exists (Fast Refresh keeps the app instance hot),
// initializeFirestore throws, so fall back to the existing instance.
//
// ignoreUndefinedProperties: optional form fields can be `undefined`, and
// Firestore's default rejects writes containing them. Strip silently.
//
// experimentalForceLongPolling: the default WebChannel streaming transport
// hangs on RN with the new architecture / bridgeless mode and surfaces as
// "client is offline" even when the network is fine. Long polling works
// reliably across every RN configuration we've tested.
try {
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true,
  });
  console.log('[firebase] Firestore initialized with experimentalForceLongPolling=true');
} catch (err: any) {
  db = getFirestore(app);
  console.log(
    '[firebase] Firestore was already initialized, using existing instance.',
    'If you just changed firebase.ts settings, fully kill and relaunch the app.',
  );
}

storage = getStorage(app);

if (__DEV__) {
  console.log('[firebase] runtime config', {
    projectId: app.options.projectId,
    authDomain: app.options.authDomain,
    storageBucket: app.options.storageBucket,
    appId: app.options.appId?.slice(0, 16) + '…',
  });
}

export { app, auth, db, storage };
