import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  reauthenticateWithCredential,
  linkWithCredential,
  UserCredential,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { auth } from './firebase';

// Source of truth for the Google OAuth client IDs: app.json → extra.google
// (baked into every build, can't be broken by a wrong/missing EAS env var —
// the same reason the Firebase config lives there). Fall back to EXPO_PUBLIC_*
// env vars (used by `expo start` from .env) only when the bundled values are
// absent. The iOS client ID and Web client ID MUST be in the same Google Cloud
// project, or Google rejects the token exchange with `invalid_audience`.
const bundledGoogle = (Constants.expoConfig?.extra?.google ?? {}) as Partial<{
  iosClientId: string;
  webClientId: string;
}>;

export class SocialAuthCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'SocialAuthCancelled';
  }
}

// Deferred configure: we used to run `GoogleSignin.configure()` at import time
// but that crashes the whole app if the native module isn't in the binary
// (e.g. running an older dev client after adding the package). Configure on
// first use and surface a clear error if env vars aren't set.
let googleConfigured = false;

function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const iosClientId =
    bundledGoogle.iosClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId =
    bundledGoogle.webClientId ?? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!iosClientId && !webClientId) {
    throw new Error(
      'Google sign-in not configured. Set extra.google in app.json (or EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env), then rebuild.',
    );
  }
  if (__DEV__) {
    // Masked diagnostic: confirms WHICH client IDs are actually baked into the
    // build. The two must share the same project prefix (the digits before the
    // first dash) or Google returns `invalid_audience`.
    const mask = (id?: string) => (id ? `${id.slice(0, 22)}…` : '(none)');
    console.log('[socialAuth] google config', {
      iosClientId: mask(iosClientId),
      webClientId: mask(webClientId),
      source: bundledGoogle.iosClientId ? 'app.json' : 'env',
    });
  }
  GoogleSignin.configure({ iosClientId, webClientId });
  googleConfigured = true;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  ensureGoogleConfigured();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response: any = await GoogleSignin.signIn();

    // google-signin v13 wraps the payload in `{ type, data }`; v12 returns the
    // user info object directly. Handle both.
    if (response?.type === 'cancelled') {
      throw new SocialAuthCancelled();
    }
    const idToken: string | undefined =
      response?.data?.idToken ?? response?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token.');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    return await signInWithCredential(auth, credential);
  } catch (err: any) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) throw new SocialAuthCancelled();
    if (err?.code === statusCodes.IN_PROGRESS) throw new Error('Sign-in already in progress.');
    if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available.');
    }
    throw err;
  }
}

// Reauthenticate the current user with a fresh Google credential. Firebase
// requires a recent login before sensitive ops like account deletion.
export async function reauthWithGoogle(): Promise<void> {
  ensureGoogleConfigured();
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response: any = await GoogleSignin.signIn();
  if (response?.type === 'cancelled') throw new SocialAuthCancelled();
  const idToken: string | undefined = response?.data?.idToken ?? response?.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');
  const credential = GoogleAuthProvider.credential(idToken);
  await reauthenticateWithCredential(u, credential);
}

// Reauthenticate the current user with a fresh Apple credential.
export async function reauthWithApple(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  try {
    const appleCred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!appleCred.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({ idToken: appleCred.identityToken });
    await reauthenticateWithCredential(u, firebaseCredential);
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') throw new SocialAuthCancelled();
    throw err;
  }
}

// Thrown when linking a guest account to a credential that already belongs to
// another account. The UI offers "sign in to that account instead" (which
// abandons the guest's local data).
export class CredentialInUseError extends Error {
  constructor() {
    super('credential-already-in-use');
    this.name = 'CredentialInUseError';
  }
}

// Link a fresh Google credential to the CURRENT (anonymous) user, preserving
// the uid and all their data. Throws CredentialInUseError if that Google
// account is already attached to a different PawProof account.
export async function linkWithGoogle(): Promise<UserCredential> {
  ensureGoogleConfigured();
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response: any = await GoogleSignin.signIn();
  if (response?.type === 'cancelled') throw new SocialAuthCancelled();
  const idToken: string | undefined = response?.data?.idToken ?? response?.idToken;
  if (!idToken) throw new Error('Google did not return an ID token.');
  const credential = GoogleAuthProvider.credential(idToken);
  try {
    return await linkWithCredential(u, credential);
  } catch (e: any) {
    if (e?.code === 'auth/credential-already-in-use' || e?.code === 'auth/email-already-in-use') {
      throw new CredentialInUseError();
    }
    throw e;
  }
}

// Link a fresh Apple credential to the current (anonymous) user.
export async function linkWithApple(): Promise<UserCredential> {
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  try {
    const appleCred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!appleCred.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({ idToken: appleCred.identityToken });
    return await linkWithCredential(u, credential);
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') throw new SocialAuthCancelled();
    if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/email-already-in-use') {
      throw new CredentialInUseError();
    }
    throw err;
  }
}

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return await AppleAuthentication.isAvailableAsync();
}

export async function signInWithApple(): Promise<UserCredential> {
  // expo-apple-authentication will throw `ERR_REQUEST_CANCELED` if the user
  // backs out of the system sheet, so we normalise that to SocialAuthCancelled.
  try {
    const appleCred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!appleCred.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: appleCred.identityToken,
      // rawNonce is optional for native Apple sign-in via Firebase. Skipping it
      // is fine for first-party iOS clients; add one if you also support web.
    });
    return await signInWithCredential(auth, firebaseCredential);
  } catch (err: any) {
    if (err?.code === 'ERR_REQUEST_CANCELED') throw new SocialAuthCancelled();
    throw err;
  }
}
