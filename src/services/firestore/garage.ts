/**
 * `users/{uid}/garage/{productId}` — the collector's owned cars.
 * Client write contract (enforced by firestore.rules):
 *  - create: exactly { productId (== doc id), addedAt: serverTimestamp, source: 'manual',
 *            isFavorite: bool, quantity: int 1..99 }
 *  - update: only `isFavorite` and/or `quantity` may change
 *  - delete: allowed
 * `source: 'purchase'` entries are written only by `placeOrder`.
 */
import { collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@shared/constants';
import { MAX_GARAGE_QUANTITY } from '@shared/gamification';
import type { GarageEntry } from '@shared/types';
import { db } from '@/config/firebase';
import { garageEntryConverter } from './converters';
import { getDocsOnline } from './serverReads';

export const garageCollection = (uid: string) =>
  collection(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.garage).withConverter(garageEntryConverter);

const garageDocRef = (uid: string, productId: string) =>
  doc(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.garage, productId);

/** Newest additions first. */
export async function fetchGarage(uid: string): Promise<GarageEntry[]> {
  const snapshot = await getDocsOnline(garageCollection(uid));
  return snapshot.docs
    .map((document) => document.data())
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}

/** Clamps to 1..MAX_GARAGE_QUANTITY (99). */
export function clampGarageQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_GARAGE_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export async function addGarageEntry(
  uid: string,
  productId: string,
  options: { isFavorite?: boolean; quantity?: number } = {},
): Promise<void> {
  await setDoc(garageDocRef(uid, productId), {
    productId,
    addedAt: serverTimestamp(),
    source: 'manual',
    isFavorite: options.isFavorite ?? false,
    quantity: clampGarageQuantity(options.quantity ?? 1),
  });
}

export async function removeGarageEntry(uid: string, productId: string): Promise<void> {
  await deleteDoc(garageDocRef(uid, productId));
}

export async function setGarageFavorite(
  uid: string,
  productId: string,
  isFavorite: boolean,
): Promise<void> {
  await updateDoc(garageDocRef(uid, productId), { isFavorite });
}

export async function setGarageQuantity(
  uid: string,
  productId: string,
  quantity: number,
): Promise<void> {
  await updateDoc(garageDocRef(uid, productId), { quantity: clampGarageQuantity(quantity) });
}
