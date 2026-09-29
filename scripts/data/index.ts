/**
 * Builds the complete seed catalogue from the editorial data files: ISO dates become `Date`s,
 * derived fields are filled in (series `totalCars`, review ids, product rating aggregates) and
 * `updatedAt` is set. Pure — no Firebase imports — so it backs `--dry-run`, the validator and
 * the read-back verifier alike.
 */
import type { Category, Product, Review, Series, SiteSettings } from '../../shared/types.ts';
import { aggregateRatings } from '../lib/ratings.ts';
import { CATEGORIES } from './categories.ts';
import { PRODUCTS } from './products.ts';
import { REVIEWS } from './reviews.ts';
import { SERIES } from './series.ts';
import { SITE_SETTINGS, SITE_SETTINGS_DOC_ID } from './settings.ts';

/** A domain record whose timestamps are real `Date`s (→ Firestore `Timestamp`s on write). */
export type Dated<T> = Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date };

export interface SeedCatalog {
  /** When this build ran — `updatedAt` of every catalogue document (reviews keep their own). */
  runAt: Date;
  categories: Dated<Category>[];
  series: Dated<Series>[];
  products: Dated<Product>[];
  reviews: Dated<Review>[];
  settings: Dated<SiteSettings>;
  settingsDocId: string;
}

/** Parses an ISO-8601 string. Invalid input yields an invalid Date, which the validator reports. */
export function parseIsoDate(value: string): Date {
  return new Date(value);
}

export function buildSeedCatalog(runAt: Date = new Date()): SeedCatalog {
  const reviews: Dated<Review>[] = REVIEWS.map((review) => {
    const createdAt = parseIsoDate(review.createdAt);
    return { ...review, id: review.uid, createdAt, updatedAt: createdAt };
  });

  const ratingsByProduct = new Map<string, number[]>();
  for (const review of reviews) {
    const list = ratingsByProduct.get(review.productId) ?? [];
    list.push(review.rating);
    ratingsByProduct.set(review.productId, list);
  }

  const products: Dated<Product>[] = PRODUCTS.map((product) => ({
    ...product,
    ...aggregateRatings(ratingsByProduct.get(product.id) ?? []),
    createdAt: parseIsoDate(product.createdAt),
    updatedAt: runAt,
  }));

  const series: Dated<Series>[] = SERIES.map((entry) => ({
    ...entry,
    carIds: [...entry.carIds],
    totalCars: entry.carIds.length,
    createdAt: parseIsoDate(entry.createdAt),
    updatedAt: runAt,
  }));

  const categories: Dated<Category>[] = CATEGORIES.map((category) => ({
    ...category,
    createdAt: parseIsoDate(category.createdAt),
    updatedAt: runAt,
  }));

  return {
    runAt,
    categories,
    series,
    products,
    reviews,
    settings: { ...SITE_SETTINGS, createdAt: parseIsoDate(SITE_SETTINGS.createdAt), updatedAt: runAt },
    settingsDocId: SITE_SETTINGS_DOC_ID,
  };
}
