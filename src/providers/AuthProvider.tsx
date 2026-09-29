import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { garageQueryOptions } from '@/hooks/useGarage';
import { profileQueryOptions } from '@/hooks/useProfile';
import { clearPendingAuthAction, runPendingAuthAction } from '@/hooks/useRequireAuthAction';
import { wishlistQueryOptions } from '@/hooks/useWishlist';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/queryKeys';
import {
  completeRedirectSignIn,
  getCurrentUid,
  onAuthChange,
  signInWithGoogle,
  signOutUser,
} from '@/services/auth';
import { subscribeToProfile } from '@/services/firestore/users';
import { ensureUserProfile } from '@/services/functions';
import { useGarageStore } from '@/store/garageStore';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import type { AuthStatus, GarageEntry, WishlistEntry } from '@/types';
import { AuthContext, type AuthContextValue } from './authContext';

/* ------------------------- ensureUserProfile (once) ------------------------ */

const ENSURED_STORAGE_KEY = 'hwa-profile-ensured';
const ensuredUids = new Set<string>();
const inflightEnsures = new Map<string, Promise<void>>();

function readEnsuredFromSession(uid: string): boolean {
  try {
    return (window.sessionStorage.getItem(ENSURED_STORAGE_KEY) ?? '').split(',').includes(uid);
  } catch {
    return false;
  }
}

function markEnsured(uid: string): void {
  ensuredUids.add(uid);
  try {
    window.sessionStorage.setItem(ENSURED_STORAGE_KEY, Array.from(ensuredUids).join(','));
  } catch {
    /* sessionStorage unavailable (private mode) — the in-memory set still dedupes */
  }
}

/**
 * Calls the idempotent `ensureUserProfile` callable once per uid per browser session.
 * Failures are swallowed (console.warn) so the storefront keeps working without the Functions
 * emulator; the `onUserCreate` trigger also creates profiles server-side.
 */
function ensureProfileOnce(uid: string): Promise<void> {
  if (ensuredUids.has(uid) || readEnsuredFromSession(uid)) {
    ensuredUids.add(uid);
    return Promise.resolve();
  }
  const existing = inflightEnsures.get(uid);
  if (existing) return existing;
  const request = ensureUserProfile()
    .then(() => markEnsured(uid))
    .catch((error: unknown) => {
      console.warn(
        '[auth] ensureUserProfile failed — continuing without it (is the Functions emulator running?)',
        error,
      );
    })
    .finally(() => inflightEnsures.delete(uid));
  inflightEnsures.set(uid, request);
  return request;
}

/* ------------------------------ Garage mirror ------------------------------ */

/** Loads garage + wishlist for the signed-in user and mirrors them into `garageStore`. */
function UserDataSync({ uid }: { uid: string }) {
  const garage = useQuery<GarageEntry[]>(garageQueryOptions(uid));
  const wishlist = useQuery<WishlistEntry[]>(wishlistQueryOptions(uid));
  const hydrateGarage = useGarageStore((state) => state.hydrateGarage);
  const hydrateWishlist = useGarageStore((state) => state.hydrateWishlist);

  useEffect(() => {
    if (garage.data) hydrateGarage(garage.data);
  }, [garage.data, hydrateGarage]);

  useEffect(() => {
    if (wishlist.data) hydrateWishlist(wishlist.data);
  }, [wishlist.data, hydrateWishlist]);

  return null;
}

/* -------------------------------- Provider -------------------------------- */

/**
 * Auth state for the whole app:
 * onAuthStateChanged → ensureUserProfile (once) → live `onSnapshot(users/{uid})` pushed into
 * `queryKeys.profile(uid)`. Completes redirect sign-ins on boot, runs the action queued by
 * `useRequireAuthAction` after sign-in, and on sign-out drops user-scoped queries and resets
 * the garage mirror.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const previousUidRef = useRef<string | null>(null);
  const uid = user?.uid ?? null;

  // Finish a redirect-based sign-in (popup fallback) once on boot.
  useEffect(() => {
    completeRedirectSignIn().catch((error: unknown) => {
      toast.error('Sign-in failed', getFriendlyErrorMessage(error));
    });
  }, []);

  // Auth state.
  useEffect(
    () =>
      onAuthChange((nextUser) => {
        const previousUid = previousUidRef.current;
        const nextUid = nextUser?.uid ?? null;
        if (previousUid && previousUid !== nextUid) {
          queryClient.removeQueries({ queryKey: queryKeys.user(previousUid) });
          useGarageStore.getState().reset();
        }
        previousUidRef.current = nextUid;
        setUser(nextUser);
        setStatus(nextUser ? 'signed-in' : 'signed-out');
        if (nextUser) void ensureProfileOnce(nextUser.uid);
      }),
    [queryClient],
  );

  // Live profile (XP / level / badges written by Cloud Functions show up instantly).
  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToProfile(
      uid,
      (profile) => queryClient.setQueryData(queryKeys.profile(uid), profile),
      (error) => {
        if (getCurrentUid() === uid) console.warn('[auth] Profile listener error:', error);
      },
    );
  }, [uid, queryClient]);

  // After sign-in: close the prompt and run the queued action.
  useEffect(() => {
    if (status !== 'signed-in') return;
    const ui = useUiStore.getState();
    if (ui.signInPrompt.open) ui.closeSignInPrompt();
    runPendingAuthAction();
  }, [status]);

  // Prompt dismissed without signing in → forget the queued action.
  useEffect(
    () =>
      useUiStore.subscribe((state, previous) => {
        if (previous.signInPrompt.open && !state.signInPrompt.open && !getCurrentUid()) {
          clearPendingAuthAction();
        }
      }),
    [],
  );

  const profileQuery = useQuery(profileQueryOptions(uid));

  const signIn = useCallback(async (): Promise<User | null> => {
    setIsSigningIn(true);
    try {
      return await signInWithGoogle();
    } catch (error) {
      toast.error('Sign-in failed', getFriendlyErrorMessage(error));
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutUser();
      toast({ title: 'Signed out', description: 'See you at the next race.' });
    } catch (error) {
      toast.error("Couldn't sign out", getFriendlyErrorMessage(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile: uid ? (profileQuery.data ?? null) : null,
      status,
      isProfileLoading: status === 'signed-in' && profileQuery.data === undefined,
      signIn,
      signOut,
      isSigningIn,
    }),
    [user, uid, profileQuery.data, status, signIn, signOut, isSigningIn],
  );

  return (
    <AuthContext.Provider value={value}>
      {uid ? <UserDataSync key={uid} uid={uid} /> : null}
      {children}
    </AuthContext.Provider>
  );
}
