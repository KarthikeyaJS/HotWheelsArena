/** Catalogue reads. Products are public; lists only include `isActive == true`. */
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@shared/constants';
import type { Product } from '@shared/types';
import { db } from '@/config/firebase';
import { productConverter } from './converters';

export const productsCollection = () =>
  collection(db, COLLECTIONS.products).withConverter(productConverter);

/** Newest first, then by collector number. */
export function compareProductsNewest(a: Product, b: Product): number {
  return (b.createdAt ?? 0) - (a.createdAt ?? 0) || a.collectionNumber - b.collectionNumber;
}

/** Every active product (the whole catalogue is small; filtering happens client-side). */
export async function fetchActiveProducts(): Promise<Product[]> {
  const snapshot = await getDocs(query(productsCollection(), where('isActive', '==', true)));
  return snapshot.docs.map((document) => document.data()).sort(compareProductsNewest);
}

/** Active product by slug, or null. */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const snapshot = await getDocs(
    query(productsCollection(), where('slug', '==', slug), where('isActive', '==', true), limit(1)),
  );
  return snapshot.docs[0]?.data() ?? null;
}

/** Product by document id (may be inactive), or null when missing. */
export async function fetchProductById(id: string): Promise<Product | null> {
  const snapshot = await getDoc(doc(productsCollection(), id));
  return snapshot.exists() ? snapshot.data() : null;
}

/**
 * Products by id, in the order given. Missing or unreadable products are skipped (used for
 * garage / wishlist entries that may reference retired cars).
 */
export async function fetchProductsByIds(ids: readonly string[]): Promise<Product[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  const results = await Promise.allSettled(unique.map((id) => fetchProductById(id)));
  const byId = new Map<string, Product>();
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) byId.set(result.value.id, result.value);
  });
  return ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));
}
