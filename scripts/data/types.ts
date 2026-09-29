/**
 * Seed record shapes.
 *
 * These mirror the domain types in `shared/types.ts` with two differences:
 * - timestamps are ISO-8601 strings (with an IST offset) instead of epoch millis — the seed
 *   converts them to Firestore `Timestamp`s;
 * - fields that are derived at build time are omitted (product rating aggregates come from the
 *   seeded reviews, a series' `totalCars` from its `carIds`, a review's id from its `uid`).
 *
 * The `id` of a record is its Firestore document id. It is never stored inside the document.
 */
import type { Category, Product, Review, Series, SiteSettings } from '../../shared/types.ts';

/** ISO-8601 instant with an explicit offset, e.g. `2026-03-14T10:30:00+05:30`. */
export type IsoDateTime = string;

type WithCreatedAt<T> = Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: IsoDateTime };

/** `categories/{id}` — `id === slug`. */
export type SeedCategory = WithCreatedAt<Category>;

/** `series/{id}` — `id === slug`; `carIds` are product ids in `seriesNumber` order. */
export type SeedSeries = WithCreatedAt<Omit<Series, 'totalCars'>>;

/** `products/{id}` — `id === slug`. Rating aggregates are computed from the seeded reviews. */
export type SeedProduct = WithCreatedAt<Omit<Product, 'ratingAvg' | 'ratingCount'>>;

/** `products/{productId}/reviews/{uid}` — the document id is the reviewer uid. */
export type SeedReview = WithCreatedAt<Omit<Review, 'id'>>;

/** `settings/site`. */
export type SeedSiteSettings = WithCreatedAt<SiteSettings>;
