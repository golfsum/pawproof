import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { deleteAllUserData } from './firestore';
import { deleteAllUserFiles } from './storage';
import {
  reauthWithGoogle,
  reauthWithApple,
  SocialAuthCancelled,
} from './socialAuth';

export type AuthProviderKind = 'password' | 'google' | 'apple' | 'unknown';

/** Which sign-in method this account primarily uses (drives reauth). */
export function primaryProvider(): AuthProviderKind {
  const ids = auth.currentUser?.providerData.map(p => p.providerId) ?? [];
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('password')) return 'password';
  return 'unknown';
}

/** True if this account signs in with email + password (needs a password to reauth). */
export function needsPasswordToDelete(): boolean {
  return primaryProvider() === 'password';
}

async function reauthenticate(password?: string): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  const provider = primaryProvider();
  if (provider === 'password') {
    if (!u.email) throw new Error('No email is associated with this account.');
    if (!password) throw new Error('Enter your password to confirm.');
    const cred = EmailAuthProvider.credential(u.email, password);
    await reauthenticateWithCredential(u, cred);
  } else if (provider === 'google') {
    await reauthWithGoogle();
  } else if (provider === 'apple') {
    await reauthWithApple();
  }
  // 'unknown' → skip; deleteUser may still succeed if the login is recent,
  // otherwise it throws requires-recent-login which we surface below.
}

/**
 * Permanently delete the signed-in user's account and all associated data:
 * Firestore records, Storage files, then the Firebase Auth user itself.
 *
 * Reauthenticates first because Firebase requires a recent login for account
 * deletion. For social accounts this re-shows the provider sheet; for password
 * accounts the caller must pass the typed password.
 *
 * Data is wiped BEFORE the auth user is deleted so the request is honored even
 * if the final auth-delete step were to fail.
 */
export async function deleteAccount(opts?: { password?: string }): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error('You must be signed in.');
  const uid = u.uid;

  try {
    await reauthenticate(opts?.password);
  } catch (e: any) {
    if (e instanceof SocialAuthCancelled) {
      throw new Error('Account deletion was cancelled.');
    }
    throw new Error(humanizeDeleteError(e));
  }

  // Wipe data + files first (best-effort on files — orphaned objects under a
  // deleted uid are inaccessible anyway).
  await deleteAllUserData(uid);
  await deleteAllUserFiles(uid).catch(() => {});

  try {
    await deleteUser(u);
  } catch (e: any) {
    throw new Error(humanizeDeleteError(e));
  }
}

function humanizeDeleteError(e: any): string {
  const code: string = String(e?.code ?? '');
  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'That password is incorrect. Please try again.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (code.includes('requires-recent-login')) {
    return 'Please sign in again, then retry deleting your account.';
  }
  if (code.includes('network')) {
    return 'Network issue. Check your connection and try again.';
  }
  return e?.message ?? 'Could not delete your account. Please try again.';
}
