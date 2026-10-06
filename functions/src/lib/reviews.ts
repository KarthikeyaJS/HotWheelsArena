/**
 * Review helpers: rating aggregation (create + edit) and text sanitising.
 */
import { stripUnsafeText } from '../../../shared/index.js';
import type { RatingAggregate } from './firestoreData.js';

/** Stored averages keep 4 decimals so the integer rating sum can be recovered exactly. */
const AVG_PRECISION = 10_000;

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

/**
 * New product aggregate after a user creates (`previousRating === null`) or edits a review.
 * Ratings are integers, so the running sum is recovered as `round(avg × count)` — no floating
 * drift accumulates across edits. An edit on an (inconsistent) zero-count aggregate counts as new.
 */
export function applyReviewToAggregate(
  current: RatingAggregate,
  previousRating: number | null,
  nextRating: number,
): RatingAggregate {
  const next = clampRating(nextRating);
  let count = Number.isFinite(current.ratingCount)
    ? Math.max(0, Math.floor(current.ratingCount))
    : 0;
  const avg = Number.isFinite(current.ratingAvg) ? Math.min(5, Math.max(0, current.ratingAvg)) : 0;
  let sum = count > 0 ? Math.round(avg * count) : 0;

  if (previousRating !== null && count > 0) {
    sum += next - clampRating(previousRating);
  } else {
    sum += next;
    count += 1;
  }

  sum = Math.min(count * 5, Math.max(count, sum));
  const ratingAvg = count === 0 ? 0 : Math.round((sum / count) * AVG_PRECISION) / AVG_PRECISION;
  return { ratingAvg, ratingCount: count };
}

/**
 * Normalises newlines, strips control / invisible characters (the shared `stripUnsafeText`) and
 * collapses blank-line runs.
 */
export function sanitizeReviewText(text: string): string {
  const normalized = text.normalize('NFC').replace(/\r\n?/g, '\n');
  const visible = stripUnsafeText(normalized);
  return visible
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
