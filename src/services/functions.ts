/**
 * Typed wrappers for the callable Cloud Functions (region asia-south1). Requests are validated
 * again server-side; errors are FunctionsError instances (`functions/<code>`) — show them with
 * `getFriendlyErrorMessage`.
 */
import { httpsCallable } from 'firebase/functions';
import { CALLABLES } from '@shared/constants';
import type {
  EnsureProfileResponse,
  NewsletterRequest,
  NewsletterResponse,
  PlaceOrderRequest,
  PlaceOrderResponse,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from '@shared/types';
import { functions } from '@/config/firebase';

const ensureUserProfileCallable = httpsCallable<void, EnsureProfileResponse>(
  functions,
  CALLABLES.ensureUserProfile,
);
const placeOrderCallable = httpsCallable<PlaceOrderRequest, PlaceOrderResponse>(
  functions,
  CALLABLES.placeOrder,
  { timeout: 30_000 },
);
const submitReviewCallable = httpsCallable<SubmitReviewRequest, SubmitReviewResponse>(
  functions,
  CALLABLES.submitReview,
);
const subscribeNewsletterCallable = httpsCallable<NewsletterRequest, NewsletterResponse>(
  functions,
  CALLABLES.subscribeNewsletter,
);

/** Idempotently creates / refreshes `users/{uid}` for the signed-in user. */
export async function ensureUserProfile(): Promise<EnsureProfileResponse> {
  const result = await ensureUserProfileCallable();
  return result.data;
}

/** Validates the cart + payment server-side, creates the order, awards XP / badges. */
export async function placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  const result = await placeOrderCallable(request);
  return result.data;
}

/** Creates or updates the caller's review (review id === uid) and refreshes rating aggregates. */
export async function submitReview(request: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const result = await submitReviewCallable(request);
  return result.data;
}

/** Adds an email to the newsletter (deduped server-side). */
export async function subscribeNewsletter(request: NewsletterRequest): Promise<NewsletterResponse> {
  const result = await subscribeNewsletterCallable(request);
  return result.data;
}
