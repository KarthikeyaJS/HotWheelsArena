import { createContext } from 'react';
import type { User } from 'firebase/auth';
import type { AuthStatus, UserProfile } from '@/types';

export interface AuthContextValue {
  /** Firebase user (null when signed out or still loading). */
  user: User | null;
  /** Live `users/{uid}` profile; null until it exists (or when the functions emulator is down). */
  profile: UserProfile | null;
  status: AuthStatus;
  /** True while signed in but the first profile snapshot has not arrived yet. */
  isProfileLoading: boolean;
  /**
   * Google sign-in (popup → redirect fallback). Resolves the user, or null when cancelled /
   * redirecting / failed (failures are toasted — callers don't need a try/catch).
   */
  signIn: () => Promise<User | null>;
  /** Signs out (toasts on failure). Clears user-scoped caches and the garage mirror. */
  signOut: () => Promise<void>;
  isSigningIn: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
AuthContext.displayName = 'AuthContext';
