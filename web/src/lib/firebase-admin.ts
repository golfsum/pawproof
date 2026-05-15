import "server-only";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadCredentials() {
  const raw = process.env.FIREBASE_ADMIN_SA_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Private keys saved as a single line have escaped \n.
      if (typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return cert(parsed);
    } catch {
      throw new Error(
        "FIREBASE_ADMIN_SA_JSON could not be parsed as JSON. Paste the full service account JSON as a single-line string.",
      );
    }
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return undefined; // Admin SDK auto-loads from GOOGLE_APPLICATION_CREDENTIALS path.
  }
  throw new Error(
    "Firebase Admin not configured. Set FIREBASE_ADMIN_SA_JSON in .env.local with the service account JSON.",
  );
}

let _app: App | undefined;
function adminApp(): App {
  if (_app) return _app;
  if (getApps().length) {
    _app = getApp();
    return _app;
  }
  const credential = loadCredentials();
  _app = initializeApp(credential ? { credential } : undefined);
  return _app;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}
