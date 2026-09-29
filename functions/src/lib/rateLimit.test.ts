import { describe, expect, it } from 'vitest';
import {
  NEWSLETTER_RATE_LIMIT,
  evaluateRateLimit,
  rateLimitDocId,
  readRateLimitState,
} from './rateLimit.js';

const policy = { max: 5, windowMs: 10 * 60 * 1000 };
const t0 = 1_700_000_000_000;

describe('evaluateRateLimit', () => {
  it('opens a fresh window on the first attempt', () => {
    expect(evaluateRateLimit(null, t0, policy)).toEqual({
      allowed: true,
      state: { count: 1, windowStartMs: t0 },
      remaining: 4,
      retryAfterMs: 0,
    });
  });

  it('allows exactly `max` attempts per window, then blocks with a retry hint', () => {
    let state = evaluateRateLimit(null, t0, policy).state;
    for (let attempt = 2; attempt <= 5; attempt += 1) {
      const decision = evaluateRateLimit(state, t0 + attempt * 1000, policy);
      expect(decision.allowed).toBe(true);
      expect(decision.state.count).toBe(attempt);
      state = decision.state;
    }
    const blocked = evaluateRateLimit(state, t0 + 60_000, policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.state).toEqual(state); // unchanged while blocked
    expect(blocked.retryAfterMs).toBe(policy.windowMs - 60_000);
  });

  it('starts a new window once the old one has expired', () => {
    const decision = evaluateRateLimit(
      { count: 5, windowStartMs: t0 },
      t0 + policy.windowMs,
      policy,
    );
    expect(decision.allowed).toBe(true);
    expect(decision.state).toEqual({ count: 1, windowStartMs: t0 + policy.windowMs });
  });

  it('treats a window in the future (clock skew / corrupt state) as expired', () => {
    const decision = evaluateRateLimit({ count: 99, windowStartMs: t0 + 5000 }, t0, policy);
    expect(decision.allowed).toBe(true);
    expect(decision.state.count).toBe(1);
  });

  it('newsletter policy is 5 attempts per 10 minutes', () => {
    expect(NEWSLETTER_RATE_LIMIT).toEqual({ max: 5, windowMs: 600_000 });
  });
});

describe('readRateLimitState', () => {
  it('reads stored counters and rejects malformed documents', () => {
    expect(readRateLimitState({ count: 3, windowStartMs: t0 })).toEqual({
      count: 3,
      windowStartMs: t0,
    });
    expect(readRateLimitState(undefined)).toBeNull();
    expect(readRateLimitState({ count: -1, windowStartMs: t0 })).toBeNull();
    expect(readRateLimitState({ count: 1 })).toBeNull();
  });
});

describe('rateLimitDocId', () => {
  it('is a deterministic salted hash that never contains the raw IP', () => {
    const id = rateLimitDocId('newsletter', '203.0.113.7');
    expect(id).toBe(rateLimitDocId('newsletter', '203.0.113.7'));
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain('203.0.113.7');
  });

  it('separates scopes and subjects', () => {
    expect(rateLimitDocId('newsletter', '203.0.113.7')).not.toBe(
      rateLimitDocId('reviews', '203.0.113.7'),
    );
    expect(rateLimitDocId('newsletter', '203.0.113.7')).not.toBe(
      rateLimitDocId('newsletter', '203.0.113.8'),
    );
  });
});
