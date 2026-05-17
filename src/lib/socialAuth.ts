import { Platform } from 'react-native';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  UserCredential,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { auth } from './firebase';

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
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!iosClientId && !webClientId) {
    throw new Error(
      'Google sign-in not configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env, then restart Metro.',
    );
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
