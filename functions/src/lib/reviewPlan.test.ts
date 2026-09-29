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
    expect(prepareReviewText('  Superb casting,​ crisp tampos!  ')).toBe(
      'Superb casting, crisp tampos!',
    );
  });

  it('re-validates after sanitising with the shared review rules', () => {
    const error = captureAppError(() => prepareReviewText('Nice​​​​​​!'));
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
      resolveReviewer({ displayName: 'Garage Asha', photoURL: 'https://example.com/p.png' }, token),
    ).toEqual({ displayName: 'Garage Asha', photoURL: 'https://example.com/p.png' });
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
