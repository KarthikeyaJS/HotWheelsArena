/**
 * Dev-only test hooks for the Firebase Emulator Suite.
 *
 * Installed from main.tsx only when `import.meta.env.DEV && env.useEmulators`, so it is never
 * part of a production build. The Auth emulator accepts unsigned Google ID tokens, which lets
 * automated checks (scripts/dev/snap.mjs, Playwright e2e) sign in without the OAuth popup:
 *
 *   await window.__hwaTest.signIn({ email: 'collector@hwa.test', displayName: 'Test Collector' })
 */
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';

export interface TestSignInOptions {
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface TestSignInResult {
  uid: string;
  email: string | null;
}

export interface TestHooks {
  signIn: (options: TestSignInOptions) => Promise<TestSignInResult>;
  signOut: () => Promise<void>;
}

declare global {
  interface Window {
    __hwaTest?: TestHooks;
  }
}

/** Stable pseudo subject per email, so the same emulator user is reused across runs. */
function subjectFor(email: string): string {
  let hash = 0;
  for (const char of email.toLowerCase()) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  }
  return `test-${hash.toString(16)}`;
}

export function installTestHooks(): void {
  window.__hwaTest = {
    async signIn({ email, displayName, photoURL }) {
      const idToken = JSON.stringify({
        sub: subjectFor(email),
        email,
        email_verified: true,
        name: displayName ?? email.split('@')[0],
        ...(photoURL ? { picture: photoURL } : {}),
      });
      const result = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      return { uid: result.user.uid, email: result.user.email };
    },
    async signOut() {
      await signOut(auth);
    },
  };
}
