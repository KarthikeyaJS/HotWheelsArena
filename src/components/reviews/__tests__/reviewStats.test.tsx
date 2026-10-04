import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Review } from '@/types';
import { ReviewList } from '../ReviewList';
import {
  REVIEWS_INITIAL_VISIBLE,
  computeReviewStats,
  orderReviews,
  resolveReviewSummary,
} from '../reviewStats';

function makeReview(index: number, overrides: Partial<Review> = {}): Review {
  return {
    id: `uid-${index}`,
    productId: 'twin-mill-orange',
    uid: `uid-${index}`,
    displayName: `Collector ${index}`,
    photoURL: null,
    rating: 5,
    text: `Review number ${index} — lovely casting.`,
    verifiedBuyer: false,
    createdAt: 1_760_000_000_000 + index * 1000,
    updatedAt: 1_760_000_000_000 + index * 1000,
    ...overrides,
  };
}

describe('review stats', () => {
  it('computes average, count and the 5 → 1 distribution', () => {
    const stats = computeReviewStats([{ rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 2 }]);
    expect(stats.average).toBe(4);
    expect(stats.count).toBe(4);
    expect(stats.distribution).toEqual([
      { stars: 5, count: 2, pct: 50 },
      { stars: 4, count: 1, pct: 25 },
      { stars: 3, count: 0, pct: 0 },
      { stars: 2, count: 1, pct: 25 },
      { stars: 1, count: 0, pct: 0 },
    ]);
  });

  it('handles empty lists and ignores invalid ratings', () => {
    expect(computeReviewStats([])).toMatchObject({ average: 0, count: 0 });
    expect(
      computeReviewStats([{ rating: 0 }, { rating: Number.NaN }, { rating: 3 }]),
    ).toMatchObject({ average: 3, count: 1 });
  });

  it('prefers server aggregates when more ratings exist than were loaded', () => {
    const loaded = [{ rating: 5 }, { rating: 3 }];
    expect(resolveReviewSummary(loaded, { ratingAvg: 4.26, ratingCount: 40 })).toMatchObject({
      average: 4.3,
      count: 40,
      sampleSize: 2,
    });
    expect(resolveReviewSummary(loaded, { ratingAvg: 0, ratingCount: 0 })).toMatchObject({
      average: 4,
      count: 2,
      sampleSize: 2,
    });
  });

  it('orders the signed-in collector’s review first, then newest', () => {
    const reviews = [makeReview(1), makeReview(3), makeReview(2)];
    expect(orderReviews(reviews, null).map((r) => r.id)).toEqual(['uid-3', 'uid-2', 'uid-1']);
    expect(orderReviews(reviews, 'uid-1').map((r) => r.id)).toEqual(['uid-1', 'uid-3', 'uid-2']);
  });
});

describe('ReviewList', () => {
  it(`shows ${REVIEWS_INITIAL_VISIBLE} reviews, then reveals the rest with "Show more"`, async () => {
    const user = userEvent.setup();
    const reviews = Array.from({ length: 8 }, (_, index) => makeReview(index + 1));
    render(<ReviewList reviews={reviews} uid="uid-2" />);

    expect(screen.getAllByRole('article')).toHaveLength(REVIEWS_INITIAL_VISIBLE);
    expect(screen.getByRole('article', { name: 'Review by Collector 2' })).toHaveTextContent(
      'Your review',
    );

    const more = screen.getByRole('button', { name: 'Show 2 more' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);

    expect(screen.getAllByRole('article')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Show fewer reviews' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // Focus moves to the first newly revealed review.
    expect(document.activeElement).toContainElement(
      screen.getByRole('article', { name: 'Review by Collector 7' }),
    );
  });
});
