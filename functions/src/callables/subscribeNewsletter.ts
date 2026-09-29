/**
 * `subscribeNewsletter` (callable, no sign-in required) — adds an email to `newsletter/*`.
 *
 * The email is normalised (Unicode NFKC, trimmed, lower-cased) and validated with the shared
 * `NewsletterSchema`; the document id is `sha256(email)`, so an address is stored at most once
 * (a repeat returns `already-subscribed`). Sign-ups are rate-limited per client IP (stored only
 * as a salted hash in the functions-only `rateLimits` collection): 5 attempts per 10 minutes.
 *
 * Request: `{ email }`. Response: `{ status: 'subscribed' | 'already-subscribed' }`.
 * Errors: invalid-argument · resource-exhausted · aborted.
 */
import * as logger from 'firebase-functions/logger';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  CALLABLES,
  NewsletterSchema,
  type NewsletterRequest,
  type NewsletterResponse,
} from '../../../shared/index.js';
import { Timestamp, db, serverTimestamp } from '../admin.js';
import { REGION } from '../config.js';
import { parseInput, withErrorHandling } from '../lib/callable.js';
import { emailDocId, normalizeEmail } from '../lib/email.js';
import { AppError } from '../lib/errors.js';
import { readObject } from '../lib/firestoreData.js';
import { extractClientIp } from '../lib/net.js';
import {
  NEWSLETTER_SCOPE,
  buildRateLimitDoc,
  buildSubscriberDoc,
  rateLimitedMessage,
} from '../lib/newsletter.js';
import {
  NEWSLETTER_RATE_LIMIT,
  evaluateRateLimit,
  rateLimitDocId,
  readRateLimitState,
} from '../lib/rateLimit.js';
import { dataOf, newsletterRef, rateLimitRef } from '../refs.js';

export async function handleSubscribeNewsletter(
  request: CallableRequest<unknown>,
): Promise<NewsletterResponse> {
  // Normalise before validating so full-width / padded input still maps to one address.
  const raw = readObject(request.data);
  const candidate = typeof raw.email === 'string' ? normalizeEmail(raw.email) : raw.email;
  const { email }: NewsletterRequest = parseInput(
    NewsletterSchema,
    { email: candidate },
    { fallbackMessage: 'Enter a valid email address' },
  );
  const subscriberRef = newsletterRef(emailDocId(email));

  const clientIp = extractClientIp(request.rawRequest.headers, request.rawRequest.ip);
  const limitRef = clientIp ? rateLimitRef(rateLimitDocId(NEWSLETTER_SCOPE, clientIp)) : null;
  if (!limitRef) logger.warn('subscribeNewsletter: client IP unavailable, rate limit skipped');
  const nowMs = Date.now();

  const status = await db.runTransaction(async (transaction) => {
    const [limitSnapshot, subscriberSnapshot] = await Promise.all([
      limitRef ? transaction.get(limitRef) : Promise.resolve(null),
      transaction.get(subscriberRef),
    ]);

    if (limitRef && limitSnapshot) {
      const decision = evaluateRateLimit(
        readRateLimitState(dataOf(limitSnapshot)),
        nowMs,
        NEWSLETTER_RATE_LIMIT,
      );
      if (!decision.allowed) {
        throw new AppError('resource-exhausted', rateLimitedMessage(decision.retryAfterMs), {
          reason: 'rate-limited',
        });
      }
      transaction.set(
        limitRef,
        buildRateLimitDoc(
          NEWSLETTER_SCOPE,
          decision.state,
          (windowEndMs) => Timestamp.fromMillis(windowEndMs),
          NEWSLETTER_RATE_LIMIT,
          serverTimestamp(),
        ),
      );
    }

    if (subscriberSnapshot.exists) return 'already-subscribed' as const;
    transaction.create(subscriberRef, buildSubscriberDoc(email, serverTimestamp()));
    return 'subscribed' as const;
  });

  logger.info('subscribeNewsletter: sign-up processed', { status });
  return { status };
}

export const subscribeNewsletter = onCall<unknown, Promise<NewsletterResponse>>(
  { region: REGION },
  withErrorHandling(CALLABLES.subscribeNewsletter, handleSubscribeNewsletter),
);
