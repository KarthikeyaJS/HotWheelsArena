/**
 * Google-only authentication. Popup first; falls back to a full-page redirect when popups are
 * blocked or unsupported. User-cancelled popups resolve to `null` (not an error).
 */
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { NotSignedInError, getErrorCode } from '@/lib/errors';

export type { User };

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-environment',
]);

const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

/**
 * Signs in with Google.
 * Resolves the signed-in `User`, or `null` when the user closed the popup or the browser is
 * being redirected to Google (the result is then picked up by `completeRedirectSignIn`).
 * Rejects with the Firebase error for real failures (use `getFriendlyErrorMessage`).
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    const code = getErrorCode(error);
    if (code && CANCELLED_CODES.has(code)) return null;
    if (code && REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/** Completes a pending redirect sign-in (call once on boot). Resolves the user or `null`. */
export async function completeRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  return result?.user ?? null;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/** Subscribes to auth state changes (fires immediately with the current state). */
export function onAuthChange(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/** Current user's uid at call time (null when signed out). Safe inside deferred callbacks. */
export function getCurrentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/** The current uid or throws `NotSignedInError` (use inside mutation functions). */
export function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new NotSignedInError();
  return uid;
}
