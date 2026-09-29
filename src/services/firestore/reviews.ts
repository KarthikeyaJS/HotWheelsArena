/** Review reads (public). Writes go through the `submitReview` callable. */
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@shared/constants';
import type { Review } from '@shared/types';
import { db } from '@/config/firebase';
import { reviewConverter } from './converters';

export const REVIEWS_PAGE_SIZE = 20;

export const reviewsCollection = (productId: string) =>
  collection(db, COLLECTIONS.products, productId, SUBCOLLECTIONS.reviews).withConverter(
    reviewConverter,
  );

/** Latest reviews for a product (newest first). */
export async function fetchReviews(productId: string, max = REVIEWS_PAGE_SIZE): Promise<Review[]> {
  const snapshot = await getDocs(
    query(reviewsCollection(productId), orderBy('createdAt', 'desc'), limit(max)),
  );
  return snapshot.docs.map((document) => document.data());
}
