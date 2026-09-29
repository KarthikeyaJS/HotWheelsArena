/**
 * `users/{uid}/addresses/{addressId}` — saved shipping addresses (client-writable by the owner).
 * Document shape: { name, phone, pincode, line1, line2, landmark, city, state, isDefault,
 * createdAt, updatedAt } — line2 / landmark are always strings ('' when empty).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@shared/constants';
import { AddressSchema } from '@shared/schemas';
import type { Address, SavedAddress } from '@shared/types';
import { db } from '@/config/firebase';
import { savedAddressConverter } from './converters';

export const MAX_SAVED_ADDRESSES = 10;

export const addressesCollection = (uid: string) =>
  collection(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.addresses).withConverter(
    savedAddressConverter,
  );

const rawAddressesCollection = (uid: string) =>
  collection(db, COLLECTIONS.users, uid, SUBCOLLECTIONS.addresses);

/** Default address first, then most recently updated. */
export async function fetchAddresses(uid: string): Promise<SavedAddress[]> {
  const snapshot = await getDocs(addressesCollection(uid));
  return snapshot.docs
    .map((document) => document.data())
    .sort(
      (a, b) =>
        Number(b.isDefault) - Number(a.isDefault) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    );
}

export interface SaveAddressOptions {
  /** Existing address id to update; omit to create. */
  id?: string;
  /** Make this the default (clears the flag on `otherIds`). */
  isDefault?: boolean;
  /** Ids of the user's other saved addresses (needed to clear their default flag). */
  otherIds?: readonly string[];
}

/** Validates (AddressSchema) and saves an address in one batch. Resolves the address id. */
export async function saveAddress(
  uid: string,
  address: Address,
  options: SaveAddressOptions = {},
): Promise<string> {
  const parsed = AddressSchema.parse(address);
  const batch = writeBatch(db);
  const ref = options.id
    ? doc(rawAddressesCollection(uid), options.id)
    : doc(rawAddressesCollection(uid));
  const fields = {
    name: parsed.name,
    phone: parsed.phone,
    pincode: parsed.pincode,
    line1: parsed.line1,
    line2: parsed.line2 ?? '',
    landmark: parsed.landmark ?? '',
    city: parsed.city,
    state: parsed.state,
    isDefault: options.isDefault ?? false,
    updatedAt: serverTimestamp(),
  };
  if (options.id) {
    batch.set(ref, fields, { merge: true });
  } else {
    batch.set(ref, { ...fields, createdAt: serverTimestamp() });
  }
  if (options.isDefault) {
    (options.otherIds ?? [])
      .filter((otherId) => otherId !== ref.id)
      .forEach((otherId) => {
        batch.update(doc(rawAddressesCollection(uid), otherId), {
          isDefault: false,
          updatedAt: serverTimestamp(),
        });
      });
  }
  await batch.commit();
  return ref.id;
}

export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  await deleteDoc(doc(rawAddressesCollection(uid), addressId));
}
