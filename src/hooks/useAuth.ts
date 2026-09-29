import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/providers/authContext';

export type { AuthContextValue };

/**
 * Auth state from `<AuthProvider>`:
 * `{ user, profile, status: 'loading' | 'signed-in' | 'signed-out', signIn, signOut, isSigningIn, isProfileLoading }`.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider> (see AppProviders).');
  return context;
}

/** Signed-in uid or null. */
export function useUid(): string | null {
  return useAuth().user?.uid ?? null;
}
