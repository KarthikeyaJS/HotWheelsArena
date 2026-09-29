/**
 * `submitReview` (callable) — creates or edits the caller's review of a product
 * (`products/{productId}/reviews/{uid}`, one per collector per product) and keeps the product's
 * `ratingAvg` / `ratingCount` exact in the same transaction.
 *
 * `verifiedBuyer` = the caller has a non-cancelled order containing the product.
 *
 * Request: `SubmitReviewRequest`. Response: `{ reviewId }` (=== caller uid).
 * Errors: unauthenticated · invalid-argument · not-found · failed-precondition · aborted.
 */
import * as logger from 'firebase-functions/logger';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  CALLABLES,
  SubmitReviewSchema,
  type SubmitReviewRequest,
  type SubmitReviewResponse,
} from '../../../shared/index.js';
import { db, serverTimestamp } from '../admin.js';
import { REGION } from '../config.js';
import { parseInput, requireAuth, withErrorHandling, type ParseOptions } from '../lib/callable.js';
import { readProductRecord, readRatingAggregate } from '../lib/firestoreData.js';
import {
  buildReviewPlan,
  hasPurchasedProduct,
  prepareReviewText,
  resolveReviewer,
} from '../lib/reviewPlan.js';
import { dataOf, ordersCollection, productRef, reviewRef, userRef } from '../refs.js';

/** Most recent orders scanned for the verified-buyer flag (a collector's order history is small). */
const VERIFIED_BUYER_ORDER_SCAN_LIMIT = 500;

const PARSE_OPTIONS: ParseOptions = {
  fallbackMessage: "We couldn't read your review. Please try again.",
  fieldMessages: {
    productId: "We couldn't find that car in the garage.",
    rating: 'Pick a star rating from 1 to 5.',
    text: 'Tell other collectors a bit more about this car.',
  },
};

export async function handleSubmitReview(
  request: CallableRequest<unknown>,
): Promise<SubmitReviewResponse> {
  const caller = requireAuth(request.auth);
  const input: SubmitReviewRequest = parseInput(SubmitReviewSchema, request.data, PARSE_OPTIONS);
  const text = prepareReviewText(input.text);

  // Informational reads (reviewer identity, verified-buyer flag) stay outside the transaction
  // so they never hold locks on the profile or the order history.
  const [profileSnapshot, ordersSnapshot] = await Promise.all([
    userRef(caller.uid).get(),
    ordersCollection()
      .where('uid', '==', caller.uid)
      .select('status', 'productIds', 'items')
      .limit(VERIFIED_BUYER_ORDER_SCAN_LIMIT)
      .get(),
  ]);
  const reviewer = resolveReviewer(dataOf(profileSnapshot), caller);
  const verifiedBuyer = hasPurchasedProduct(
    ordersSnapshot.docs.map((doc) => doc.data()),
    input.productId,
  );

  const plan = await db.runTransaction(async (transaction) => {
    const productDocRef = productRef(input.productId);
    const reviewDocRef = reviewRef(input.productId, caller.uid);
    const [productSnapshot, reviewSnapshot] = await Promise.all([
      transaction.get(productDocRef),
      transaction.get(reviewDocRef),
    ]);
    const productData = dataOf(productSnapshot);

    const reviewPlan = buildReviewPlan({
      uid: caller.uid,
      productId: input.productId,
      product: readProductRecord(input.productId, productData),
      aggregate: readRatingAggregate(productData),
      existingReview: dataOf(reviewSnapshot),
      reviewer,
      rating: input.rating,
      text,
      verifiedBuyer,
      timestamp: serverTimestamp(),
    });

    if (reviewPlan.review.kind === 'create')
      transaction.create(reviewDocRef, reviewPlan.review.data);
    else transaction.update(reviewDocRef, reviewPlan.review.data);
    transaction.update(productDocRef, {
      ratingAvg: reviewPlan.aggregate.ratingAvg,
      ratingCount: reviewPlan.aggregate.ratingCount,
    });
    return reviewPlan;
  });

  logger.info(plan.isEdit ? 'submitReview: review updated' : 'submitReview: review created', {
    uid: caller.uid,
    productId: input.productId,
    rating: input.rating,
    verifiedBuyer,
    ratingAvg: plan.aggregate.ratingAvg,
    ratingCount: plan.aggregate.ratingCount,
  });
  return { reviewId: caller.uid };
}

export const submitReview = onCall<unknown, Promise<SubmitReviewResponse>>(
  { region: REGION },
  withErrorHandling(CALLABLES.submitReview, handleSubmitReview),
);
