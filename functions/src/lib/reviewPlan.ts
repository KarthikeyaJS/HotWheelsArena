/**
 * Pure planning for `submitReview`.
 *
 * One review per collector per product (document id = reviewer uid). Creating a review adds its
 * rating to the product aggregate; editing replaces the text / rating and swaps the old rating
 * for the new one, so `ratingAvg` / `ratingCount` stay exact for both paths.
 */
import { SubmitReviewSchema } from '../../../shared/index.js';
import { AppError } from './errors.js';
import {
  readObject,
  readReviewRating,
  readString,
  readStringArray,
  type ProductRecord,
  type RatingAggregate,
  type RawData,
} from './firestoreData.js';
import { DEFAULT_DISPLAY_NAME } from './profile.js';
import { applyReviewToAggregate, sanitizeReviewText } from './reviews.js';

export const REVIEW_PRODUCT_NOT_FOUND_MESSAGE = "We couldn't find that car in the garage.";
export const REVIEW_PRODUCT_INACTIVE_MESSAGE =
  'This car is no longer on display, so reviews are closed.';
export const REVIEW_TEXT_INVALID_MESSAGE = 'Tell other collectors a bit more about this car.';

const MAX_REVIEWER_NAME = 80;

/**
 * Strips control / invisible characters, then re-validates with the shared review text rules
 * (the sanitised text may have become too short).
 *
 * @throws AppError('invalid-argument') with the shared schema's message.
 */
export function prepareReviewText(raw: string): string {
  const result = SubmitReviewSchema.shape.text.safeParse(sanitizeReviewText(raw));
  if (!result.success) {
    throw new AppError(
      'invalid-argument',
      result.error.issues[0]?.message ?? REVIEW_TEXT_INVALID_MESSAGE,
      { field: 'text' },
    );
  }
  return result.data;
}

/**
 * Verified buyer = the collector has a non-cancelled order containing the product. Reads the
 * denormalised `productIds` array and falls back to scanning `items` (older orders).
 */
export function hasPurchasedProduct(orders: Iterable<RawData>, productId: string): boolean {
  for (const order of orders) {
    if (readString(order.status) === 'cancelled') continue;
    if (readStringArray(order.productIds).includes(productId)) return true;
    const items: unknown[] = Array.isArray(order.items) ? order.items : [];
    if (items.some((item) => readString(readObject(item).productId) === productId)) return true;
  }
  return false;
}

export interface Reviewer {
  displayName: string;
  photoURL: string | null;
}

/**
 * Public identity shown on the review: the profile's display name / photo (what the collector
 * sees in the app), falling back to the sign-in token, then "Collector". Never the email.
 */
export function resolveReviewer(
  profileData: RawData | undefined,
  caller: { displayName: string | null; photoURL: string | null },
): Reviewer {
  const name =
    readString(profileData?.displayName).trim() ||
    caller.displayName?.trim() ||
    DEFAULT_DISPLAY_NAME;
  const photo = readString(profileData?.photoURL).trim() || caller.photoURL?.trim() || null;
  return { displayName: name.slice(0, MAX_REVIEWER_NAME), photoURL: photo };
}

/** `products/{productId}/reviews/{uid}`. */
export interface ReviewDoc<T> {
  productId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  rating: number;
  text: string;
  verifiedBuyer: boolean;
  createdAt: T;
  updatedAt: T;
}

/** Edit: every field is replaced except `createdAt`, which is only filled in when missing. */
export type ReviewPatch<T> = Omit<ReviewDoc<T>, 'createdAt'> & { createdAt?: T };

export type ReviewWrite<T> =
  { kind: 'create'; data: ReviewDoc<T> } | { kind: 'update'; data: ReviewPatch<T> };

export interface ReviewPlanInput<T> {
  uid: string;
  productId: string;
  /** `readProductRecord` of the product document (`null` when it does not exist). */
  product: ProductRecord | null;
  /** Current `ratingAvg` / `ratingCount` of the product. */
  aggregate: RatingAggregate;
  /** The collector's existing review data, `undefined` for a first review. */
  existingReview: RawData | undefined;
  reviewer: Reviewer;
  /** Integer 1–5 (validated by the shared schema). */
  rating: number;
  /** Output of `prepareReviewText`. */
  text: string;
  verifiedBuyer: boolean;
  timestamp: T;
}

export interface ReviewPlan<T> {
  review: ReviewWrite<T>;
  aggregate: RatingAggregate;
  isEdit: boolean;
}

/**
 * @throws AppError('not-found') when the product does not exist,
 *   AppError('failed-precondition') when it is no longer active.
 */
export function buildReviewPlan<T>(input: ReviewPlanInput<T>): ReviewPlan<T> {
  const { uid, productId, product, timestamp } = input;
  if (!product) {
    throw new AppError('not-found', REVIEW_PRODUCT_NOT_FOUND_MESSAGE, { productId });
  }
  if (!product.isActive) {
    throw new AppError('failed-precondition', REVIEW_PRODUCT_INACTIVE_MESSAGE, { productId });
  }

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const existing = input.existingReview;
  const isEdit = existing !== undefined;
  const previousRating = isEdit ? readReviewRating(existing) : null;
  const aggregate = applyReviewToAggregate(input.aggregate, previousRating, rating);

  const fields: ReviewPatch<T> = {
    productId,
    uid,
    displayName: input.reviewer.displayName,
    photoURL: input.reviewer.photoURL,
    rating,
    text: input.text,
    verifiedBuyer: input.verifiedBuyer,
    updatedAt: timestamp,
  };

  if (!isEdit) {
    return {
      review: { kind: 'create', data: { ...fields, createdAt: timestamp } },
      aggregate,
      isEdit,
    };
  }
  const hasCreatedAt = existing.createdAt !== undefined && existing.createdAt !== null;
  return {
    review: { kind: 'update', data: hasCreatedAt ? fields : { ...fields, createdAt: timestamp } },
    aggregate,
    isEdit,
  };
}
