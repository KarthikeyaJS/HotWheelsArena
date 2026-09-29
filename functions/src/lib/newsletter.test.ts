import { describe, expect, it } from 'vitest';
import { NOW } from '../testing/fixtures.js';
import { buildRateLimitDoc, buildSubscriberDoc, rateLimitedMessage } from './newsletter.js';
import { NEWSLETTER_RATE_LIMIT } from './rateLimit.js';

describe('buildSubscriberDoc', () => {
  it('stores the normalised email with timestamps', () => {
    expect(buildSubscriberDoc('collector@example.com', NOW)).toEqual({
      email: 'collector@example.com',
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe('buildRateLimitDoc', () => {
  it('persists the window and an expiry for a TTL policy', () => {
    const doc = buildRateLimitDoc(
      'newsletter',
      { count: 2, windowStartMs: 1_000 },
      (windowEndMs) => `expires@${windowEndMs}`,
      NEWSLETTER_RATE_LIMIT,
      NOW,
    );
    expect(doc).toEqual({
      scope: 'newsletter',
      count: 2,
      windowStartMs: 1_000,
      expiresAt: `expires@${1_000 + NEWSLETTER_RATE_LIMIT.windowMs}`,
      updatedAt: NOW,
    });
  });
});

describe('rateLimitedMessage', () => {
  it('tells the collector roughly how long to wait', () => {
    expect(rateLimitedMessage(7 * 60_000 - 5_000)).toBe(
      'Too many sign-ups from your connection — take a lap and try again in about 7 minutes.',
    );
    expect(rateLimitedMessage(30_000)).toBe(
      'Too many sign-ups from your connection — take a lap and try again in a minute.',
    );
    expect(rateLimitedMessage(0)).toContain('a minute');
  });
});
