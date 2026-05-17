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

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
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

console.log('[firebase] runtime config', {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
  storageBucket: app.options.storageBucket,
  appId: app.options.appId?.slice(0, 16) + '…',
});

export { app, auth, db, storage };
