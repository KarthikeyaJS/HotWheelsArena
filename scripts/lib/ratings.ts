/**
 * Product rating aggregates.
 *
 * Mirrors `applyReviewToAggregate` in functions/src/lib/reviews.ts: ratings are integers 1–5 and
 * the stored average keeps 4 decimals, so `round(ratingAvg × ratingCount)` recovers the exact
 * integer sum when `submitReview` later adds or edits a review.
 */

export interface RatingAggregate {
  ratingAvg: number;
  ratingCount: number;
}

export const RATING_AVG_PRECISION = 10_000;

/** Clamps any stored rating to an integer 1–5 (same rule as the callable). */
export function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function aggregateRatings(ratings: Iterable<number>): RatingAggregate {
  let sum = 0;
  let count = 0;
  for (const rating of ratings) {
    if (!Number.isFinite(rating)) continue;
    sum += clampRating(rating);
    count += 1;
  }
  const ratingAvg =
    count === 0 ? 0 : Math.round((sum / count) * RATING_AVG_PRECISION) / RATING_AVG_PRECISION;
  return { ratingAvg, ratingCount: count };
}
