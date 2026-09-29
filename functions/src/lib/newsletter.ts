/**
 * Newsletter helpers: subscriber documents and rate-limit copy. Subscribers live at
 * `newsletter/{sha256(normalisedEmail)}` so an address can only ever be stored once.
 */
import type { RateLimitPolicy, RateLimitState } from './rateLimit.js';

/** Rate-limit scope for newsletter sign-ups (part of the hashed `rateLimits/{id}`). */
export const NEWSLETTER_SCOPE = 'newsletter';

export interface SubscriberDoc<T> {
  email: string;
  createdAt: T;
  updatedAt: T;
}

export function buildSubscriberDoc<T>(email: string, timestamp: T): SubscriberDoc<T> {
  return { email, createdAt: timestamp, updatedAt: timestamp };
}

export interface RateLimitDoc<T, E> extends RateLimitState {
  scope: string;
  /** When the current window ends — enable a Firestore TTL policy on this field. */
  expiresAt: E;
  updatedAt: T;
}

export function buildRateLimitDoc<T, E>(
  scope: string,
  state: RateLimitState,
  toExpiry: (windowEndMs: number) => E,
  policy: RateLimitPolicy,
  timestamp: T,
): RateLimitDoc<T, E> {
  return {
    scope,
    count: state.count,
    windowStartMs: state.windowStartMs,
    expiresAt: toExpiry(state.windowStartMs + policy.windowMs),
    updatedAt: timestamp,
  };
}

/** User-facing message for a blocked sign-up, e.g. "…try again in about 7 minutes." */
export function rateLimitedMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  const wait = minutes === 1 ? 'a minute' : `about ${minutes} minutes`;
  return `Too many sign-ups from your connection — take a lap and try again in ${wait}.`;
}
