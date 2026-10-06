import { describe, expect, it } from 'vitest';
import { NOW, captureAppError, findUndefinedPaths, product } from '../testing/fixtures.js';
import {
  REVIEW_PRODUCT_INACTIVE_MESSAGE,
  REVIEW_PRODUCT_NOT_FOUND_MESSAGE,
  buildReviewPlan,
  hasPurchasedProduct,
  prepareReviewText,
  resolveReviewer,
  type ReviewPlanInput,
} from './reviewPlan.js';

describe('prepareReviewText', () => {
  it('sanitises and returns valid text', () => {
    expect(prepareReviewText('  Superb casting,\u200B crisp tampos!  ')).toBe(
      'Superb casting, crisp tampos!',
    );
  });

  it('re-validates after sanitising with the shared review rules', () => {
    const error = captureAppError(() =>
      prepareReviewText('Nice\u200B\u200B\u200B\u200B\u200B\u200B!'),
    );
    expect(error.code).toBe('invalid-argument');
    expect(error.message).toBe('Tell other collectors a bit more (at least 10 characters)');
  });
});

describe('hasPurchasedProduct', () => {
  it('finds the product through the denormalised productIds array', () => {
    expect(hasPurchasedProduct([{ status: 'delivered', productIds: ['a', 'b'] }], 'b')).toBe(true);
  });

  it('falls back to scanning order items (older orders)', () => {
    expect(
      hasPurchasedProduct(
        [{ status: 'placed', items: [{ productId: 'x' }, { productId: 'b' }] }],
        'b',
      ),
    ).toBe(true);
  });

  it('ignores cancelled orders and unrelated purchases', () => {
    expect(hasPurchasedProduct([{ status: 'cancelled', productIds: ['b'] }], 'b')).toBe(false);
    expect(hasPurchasedProduct([{ status: 'shipped', productIds: ['a'], items: 'bad' }], 'b')).toBe(
      false,
    );
    expect(hasPurchasedProduct([], 'b')).toBe(false);
  });
});

describe('resolveReviewer', () => {
  const token = { displayName: 'Token Name', photoURL: 'https://lh3.googleusercontent.com/t' };

  it("prefers the profile's display name and photo", () => {
    expect(
      resolveReviewer(
        { displayName: 'Garage Asha', photoURL: 'https://lh3.googleusercontent.com/a/abc' },
        token,
      ),
    ).toEqual({ displayName: 'Garage Asha', photoURL: 'https://lh3.googleusercontent.com/a/abc' });
  });

  it('strips control / bidi / zero-width characters and collapses whitespace in the name', () => {
    const noToken = { displayName: null, photoURL: null };
    expect(
      resolveReviewer({ displayName: 'Team ✓\u202E\u0000\nlaiciffO' }, noToken).displayName,
    ).toBe('Team ✓ laiciffO');
    expect(
      resolveReviewer({ displayName: '  Asha\u200B \t\r\n  Rao\uFEFF ' }, noToken).displayName,
    ).toBe('Asha Rao');
    expect(resolveReviewer({ displayName: 'शानदार 🏎️' }, noToken).displayName).toBe('शानदार 🏎️');
  });

  it('keeps ZWNJ / ZWJ in the name (Indic spellings, emoji ZWJ sequences)', () => {
    const noToken = { displayName: null, photoURL: null };
    expect(resolveReviewer({ displayName: 'दर्\u200Dया पाटील' }, noToken).displayName).toBe(
      'दर्\u200Dया पाटील',
    );
    expect(
      resolveReviewer({ displayName: 'Asha \u{1F468}\u200D\u{1F469}\u200D\u{1F467}' }, noToken)
        .displayName,
    ).toBe('Asha \u{1F468}\u200D\u{1F469}\u200D\u{1F467}');
    expect(resolveReviewer({ displayName: 'क्\u200Cष \u200F' }, noToken).displayName).toBe(
      'क्\u200Cष',
    );
  });

  it('falls back to the default name when the name is made only of invisible characters', () => {
    const noToken = { displayName: null, photoURL: null };
    expect(resolveReviewer({ displayName: '\u202E\u200B\u0000 \n' }, noToken).displayName).toBe(
      'Collector',
    );
    expect(resolveReviewer({}, { displayName: '\u2066\u2069', photoURL: null }).displayName).toBe(
      'Collector',
    );
    // An unusable profile name falls through to the (clean) token name first.
    expect(resolveReviewer({ displayName: '\u200B\u200B' }, token).displayName).toBe('Token Name');
  });

  it('keeps only Google account photos', () => {
    const noToken = { displayName: null, photoURL: null };
    expect(
      resolveReviewer({ photoURL: 'https://res.cloudinary.com/x/y.png' }, noToken).photoURL,
    ).toBeNull();
    expect(resolveReviewer({ photoURL: 'https://example.com/p.png' }, noToken).photoURL).toBeNull();
    expect(
      resolveReviewer({ photoURL: 'http://lh3.googleusercontent.com/a/abc' }, noToken).photoURL,
    ).toBeNull();
    expect(
      resolveReviewer({ photoURL: 'https://lh3.googleusercontent.com.evil.test/a' }, noToken)
        .photoURL,
    ).toBeNull();
    expect(
      resolveReviewer({ photoURL: 'https://lh3.googleusercontent.com/a/abc' }, noToken).photoURL,
    ).toBe('https://lh3.googleusercontent.com/a/abc');
    // An off-site profile photo falls through to the token's Google photo.
    expect(resolveReviewer({ photoURL: 'https://example.com/p.png' }, token).photoURL).toBe(
      'https://lh3.googleusercontent.com/t',
    );
  });

  it('falls back to the token, then to "Collector" — never the email', () => {
    expect(resolveReviewer({ displayName: '  ', email: 'asha@example.com' }, token)).toEqual({
      displayName: 'Token Name',
      photoURL: 'https://lh3.googleusercontent.com/t',
    });
    expect(
      resolveReviewer({ email: 'asha@example.com' }, { displayName: null, photoURL: null }),
    ).toEqual({ displayName: 'Collector', photoURL: null });
  });

  it('caps very long names', () => {
    expect(resolveReviewer({ displayName: 'x'.repeat(300) }, token).displayName).toHaveLength(80);
  });
});

describe('buildReviewPlan', () => {
  const baseInput = (
    overrides: Partial<ReviewPlanInput<typeof NOW>> = {},
  ): ReviewPlanInput<typeof NOW> => ({
    uid: 'u1',
    productId: 'p1',
    product: product({ id: 'p1' }),
    aggregate: { ratingAvg: 4.5, ratingCount: 2 },
    existingReview: undefined,
    reviewer: { displayName: 'Asha Rao', photoURL: null },
    rating: 3,
    text: 'Solid wheels and a great paint job.',
    verifiedBuyer: true,
    timestamp: NOW,
    ...overrides,
  });

  it('creates a first review and adds it to the aggregate', () => {
    const plan = buildReviewPlan(baseInput());
    expect(plan.isEdit).toBe(false);
    expect(plan.aggregate).toEqual({ ratingAvg: 4, ratingCount: 3 });
    expect(plan.review).toEqual({
      kind: 'create',
      data: {
        productId: 'p1',
        uid: 'u1',
        displayName: 'Asha Rao',
        photoURL: null,
        rating: 3,
        text: 'Solid wheels and a great paint job.',
        verifiedBuyer: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    expect(findUndefinedPaths(plan.review)).toEqual([]);
  });

  it('replaces an existing review, keeping createdAt and re-aggregating', () => {
    const plan = buildReviewPlan(
      baseInput({
        aggregate: { ratingAvg: 4, ratingCount: 3 },
        existingReview: { rating: 3, text: 'old', createdAt: 'EARLIER' },
        rating: 5,
        verifiedBuyer: false,
      }),
    );
    expect(plan.isEdit).toBe(true);
    expect(plan.aggregate).toEqual({ ratingAvg: 4.6667, ratingCount: 3 });
    expect(plan.review.kind).toBe('update');
    expect(plan.review.data).toEqual({
      productId: 'p1',
      uid: 'u1',
      displayName: 'Asha Rao',
      photoURL: null,
      rating: 5,
      text: 'Solid wheels and a great paint job.',
      verifiedBuyer: false,
      updatedAt: NOW,
    });
  });

  it('fills createdAt when editing a review that lacks it', () => {
    const plan = buildReviewPlan(baseInput({ existingReview: { rating: 4 } }));
    expect(plan.review.data.createdAt).toBe(NOW);
  });

  it('rejects reviews for missing or retired cars', () => {
    const missing = captureAppError(() => buildReviewPlan(baseInput({ product: null })));
    expect(missing.code).toBe('not-found');
    expect(missing.message).toBe(REVIEW_PRODUCT_NOT_FOUND_MESSAGE);

    const retired = captureAppError(() =>
      buildReviewPlan(baseInput({ product: product({ id: 'p1', isActive: false }) })),
    );
    expect(retired.code).toBe('failed-precondition');
    expect(retired.message).toBe(REVIEW_PRODUCT_INACTIVE_MESSAGE);
  });
});
