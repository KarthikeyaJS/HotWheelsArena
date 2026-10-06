/**
 * `users/{uid}/wishlist/{productId}`.
 * Client write contract: create exactly { productId (== doc id), addedAt: serverTimestamp };
 * no updates; delete allowed.
 */
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@shared/constants';
import type { WishlistEntry } from '@shared/types';
import { db } from '@/config/firebase';
import { wishlistEntryConverter } from './converters';
import { getDocsOnline } from './serverReads';

export const wishlistCollection = (uid: string) =>
  collection(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.wishlist).withConverter(
    wishlistEntryConverter,
  );

const wishlistDocRef = (uid: string, productId: string) =>
  doc(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.wishlist, productId);

/** Newest first. */
export async function fetchWishlist(uid: string): Promise<WishlistEntry[]> {
  const snapshot = await getDocsOnline(wishlistCollection(uid));
  return snapshot.docs
    .map((document) => document.data())
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

export async function addToWishlist(uid: string, productId: string): Promise<void> {
  await setDoc(wishlistDocRef(uid, productId), { productId, addedAt: serverTimestamp() });
}

export async function removeFromWishlist(uid: string, productId: string): Promise<void> {
  await deleteDoc(wishlistDocRef(uid, productId));
}
