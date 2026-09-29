/**
 * Fixed-window rate limiting backed by the functions-only `rateLimits/{hash}` collection.
 * Subjects (e.g. a client IP) are only ever stored as salted hashes.
 */
import { sha256Hex } from './email.js';
import { readNumber, type RawData } from './firestoreData.js';

/** Functions-only collection (clients have no access). Enable a TTL policy on `expiresAt`. */
export const RATE_LIMITS_COLLECTION = 'rateLimits';

export interface RateLimitPolicy {
  max: number;
  windowMs: number;
}

/** Newsletter: at most 5 attempts per client per 10 minutes. */
export const NEWSLETTER_RATE_LIMIT: Readonly<RateLimitPolicy> = {
  max: 5,
  windowMs: 10 * 60 * 1000,
};

export interface RateLimitState {
  count: number;
  windowStartMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** State to persist (unchanged when blocked). */
  state: RateLimitState;
  /** Attempts left in the current window after this one. */
  remaining: number;
  /** Milliseconds until the window resets (0 when allowed). */
  retryAfterMs: number;
}

export function evaluateRateLimit(
  previous: RateLimitState | null,
  nowMs: number,
  policy: RateLimitPolicy,
): RateLimitDecision {
  const max = Math.max(1, Math.floor(policy.max));
  const windowExpired =
    !previous ||
    previous.windowStartMs > nowMs || // clock skew / corrupted state → start fresh
    nowMs - previous.windowStartMs >= policy.windowMs;

  if (windowExpired) {
    return {
      allowed: true,
      state: { count: 1, windowStartMs: nowMs },
      remaining: max - 1,
      retryAfterMs: 0,
    };
  }
  if (previous.count >= max) {
    return {
      allowed: false,
      state: previous,
      remaining: 0,
      retryAfterMs: Math.max(0, previous.windowStartMs + policy.windowMs - nowMs),
    };
  }
  const count = previous.count + 1;
  return {
    allowed: true,
    state: { count, windowStartMs: previous.windowStartMs },
    remaining: Math.max(0, max - count),
    retryAfterMs: 0,
  };
}

export function readRateLimitState(data: RawData | undefined): RateLimitState | null {
  if (!data) return null;
  const count = Math.floor(readNumber(data.count, Number.NaN));
  const windowStartMs = readNumber(data.windowStartMs, Number.NaN);
  if (!Number.isFinite(count) || count < 0 || !Number.isFinite(windowStartMs)) return null;
  return { count, windowStartMs };
}

const RATE_LIMIT_SALT = 'hwa-rate-limit-v1';

/** Document id for a (scope, subject) pair — a salted hash, so raw IPs are never stored. */
export function rateLimitDocId(scope: string, subject: string): string {
  return sha256Hex(`${RATE_LIMIT_SALT}|${scope}|${subject}`);
}
