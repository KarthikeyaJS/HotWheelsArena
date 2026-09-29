/**
 * The collector profile `users/{uid}`. Created by the `ensureUserProfile` callable /
 * `onUserCreate` trigger; clients may only update `displayName`, `photoURL`, `updatedAt`.
 */
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { COLLECTIONS } from '@shared/constants';
import type { UserProfile } from '@shared/types';
import { db } from '@/config/firebase';
import { userProfileConverter } from './converters';

export const userDoc = (uid: string) =>
  doc(db, COLLECTIONS.users, uid).withConverter(userProfileConverter);

export async function fetchProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(userDoc(uid));
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Live profile subscription (the ONLY realtime listener in the app — XP / badges awarded by
 * Cloud Functions appear instantly). `onData(null)` when the document doesn't exist yet.
 */
export function subscribeToProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDoc(uid),
    (snapshot) => onData(snapshot.exists() ? snapshot.data() : null),
    (error) => onError?.(error),
  );
}

export interface ProfileBasicsPatch {
  displayName?: string;
  photoURL?: string | null;
}

/** Updates the client-editable profile fields. */
export async function updateProfileBasics(uid: string, patch: ProfileBasicsPatch): Promise<void> {
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) data.displayName = patch.displayName.trim().slice(0, 80);
  if (patch.photoURL !== undefined) data.photoURL = patch.photoURL;
  await updateDoc(doc(db, COLLECTIONS.users, uid), data);
}
