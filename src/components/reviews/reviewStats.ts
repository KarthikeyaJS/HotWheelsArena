/**
 * Review summary maths (pure): average, count and the 5 → 1 star distribution.
 */
import type { Product, Review } from '@/types';

export type StarValue = 1 | 2 | 3 | 4 | 5;

/** Star rows in display order (5 first). */
export const STAR_ROWS: readonly StarValue[] = [5, 4, 3, 2, 1];

/** Reviews shown before "Show more". */
export const REVIEWS_INITIAL_VISIBLE = 6;

export interface StarBucket {
  stars: StarValue;
  count: number;
  /** Share of the counted reviews, 0–100. */
  pct: number;
}

export interface ReviewStats {
  /** Average rating (1 decimal), 0 when there are no reviews. */
  average: number;
  count: number;
  /** 5 → 1. */
  distribution: StarBucket[];
}

function toStar(rating: number): StarValue | null {
  if (!Number.isFinite(rating)) return null;
  const rounded = Math.round(rating);
  return rounded >= 1 && rounded <= 5 ? (rounded as StarValue) : null;
}

/** Average / count / distribution of a list of reviews (invalid ratings are ignored). */
export function computeReviewStats(reviews: ReadonlyArray<Pick<Review, 'rating'>>): ReviewStats {
  const counts: Record<StarValue, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const review of reviews) {
    const star = toStar(review.rating);
    if (star === null) continue;
    counts[star] += 1;
    total += 1;
    sum += star;
  }
  return {
    average: total === 0 ? 0 : Math.round((sum / total) * 10) / 10,
    count: total,
    distribution: STAR_ROWS.map((stars) => ({
      stars,
      count: counts[stars],
      pct: total === 0 ? 0 : Math.round((counts[stars] / total) * 1000) / 10,
    })),
  };
}

export interface ReviewSummaryData extends ReviewStats {
  /** How many reviews the distribution is based on (the loaded page of reviews). */
  sampleSize: number;
}

/**
 * Summary for the page. The loaded list (latest 20) drives the distribution; when the product
 * has more ratings than were loaded, the server aggregates (`ratingAvg` / `ratingCount`) are the
 * source of truth for the headline average and count.
 */
export function resolveReviewSummary(
  reviews: ReadonlyArray<Pick<Review, 'rating'>>,
  product: Pick<Product, 'ratingAvg' | 'ratingCount'>,
): ReviewSummaryData {
  const stats = computeReviewStats(reviews);
  const useAggregates = product.ratingCount > stats.count;
  return {
    ...stats,
    average: useAggregates ? Math.round(product.ratingAvg * 10) / 10 : stats.average,
    count: useAggregates ? product.ratingCount : stats.count,
    sampleSize: stats.count,
  };
}

/** The signed-in collector's own review first, then newest first. */
export function orderReviews<T extends Pick<Review, 'uid' | 'createdAt'>>(
  reviews: readonly T[],
  uid: string | null,
): T[] {
  return [...reviews].sort((a, b) => {
    if (uid) {
      if (a.uid === uid && b.uid !== uid) return -1;
      if (b.uid === uid && a.uid !== uid) return 1;
    }
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}
