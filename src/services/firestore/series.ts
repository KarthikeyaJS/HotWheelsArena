/** Series reads (public). */
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@shared/constants';
import type { Series } from '@shared/types';
import { db } from '@/config/firebase';
import { seriesConverter } from './converters';

export const seriesCollection = () =>
  collection(db, COLLECTIONS.series).withConverter(seriesConverter);

/** Newest year first, then name. */
export function compareSeries(a: Series, b: Series): number {
  return b.year - a.year || a.name.localeCompare(b.name);
}

export async function fetchSeries(): Promise<Series[]> {
  const snapshot = await getDocs(query(seriesCollection(), where('isActive', '==', true)));
  return snapshot.docs.map((document) => document.data()).sort(compareSeries);
}

export async function fetchSeriesBySlug(slug: string): Promise<Series | null> {
  const snapshot = await getDocs(
    query(seriesCollection(), where('slug', '==', slug), where('isActive', '==', true), limit(1)),
  );
  return snapshot.docs[0]?.data() ?? null;
}
