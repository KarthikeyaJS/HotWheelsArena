/** Category reads (public). Sorted client-side by `order` (no composite index needed). */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@shared/constants';
import type { Category } from '@shared/types';
import { db } from '@/config/firebase';
import { categoryConverter } from './converters';

export const categoriesCollection = () =>
  collection(db, COLLECTIONS.categories).withConverter(categoryConverter);

export async function fetchCategories(): Promise<Category[]> {
  const snapshot = await getDocs(query(categoriesCollection(), where('isActive', '==', true)));
  return snapshot.docs
    .map((document) => document.data())
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
