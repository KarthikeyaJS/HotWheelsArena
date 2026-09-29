/**
 * Review helpers: rating aggregation (create + edit) and text sanitising.
 */
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
 * C0/C1 control characters except TAB (0x09) and LF (0x0A), zero-width characters, bidi
 * embeddings/overrides/isolates and the BOM.
 */
function isUnsafeCodePoint(code: number): boolean {
  return (
    code <= 0x08 ||
    (code >= 0x0b && code <= 0x1f) ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0x200b && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069) ||
    code === 0xfeff
  );
}

/** Normalises newlines, strips control / invisible characters and collapses blank-line runs. */
export function sanitizeReviewText(text: string): string {
  const normalized = text.normalize('NFC').replace(/\r\n?/g, '\n');
  const visible = Array.from(normalized)
    .filter((char) => !isUnsafeCodePoint(char.codePointAt(0) ?? 0))
    .join('');
  return visible
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
