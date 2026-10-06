import { describe, expect, it } from 'vitest';
import { applyReviewToAggregate, sanitizeReviewText } from './reviews.js';

describe('applyReviewToAggregate', () => {
  it('adds a first review', () => {
    expect(applyReviewToAggregate({ ratingAvg: 0, ratingCount: 0 }, null, 4)).toEqual({
      ratingAvg: 4,
      ratingCount: 1,
    });
  });

  it('adds a new review to an existing aggregate', () => {
    // 4.5 × 2 = 9 → (9 + 3) / 3 = 4
    expect(applyReviewToAggregate({ ratingAvg: 4.5, ratingCount: 2 }, null, 3)).toEqual({
      ratingAvg: 4,
      ratingCount: 3,
    });
  });

  it('swaps the old rating for the new one on edit (count unchanged)', () => {
    // sum 12 over 3 → edit a 3 into a 5 → 14 / 3
    expect(applyReviewToAggregate({ ratingAvg: 4, ratingCount: 3 }, 3, 5)).toEqual({
      ratingAvg: 4.6667,
      ratingCount: 3,
    });
  });

  it('keeps the aggregate exact across many edits (no floating drift)', () => {
    let aggregate = { ratingAvg: 0, ratingCount: 0 };
    aggregate = applyReviewToAggregate(aggregate, null, 5);
    aggregate = applyReviewToAggregate(aggregate, null, 4);
    aggregate = applyReviewToAggregate(aggregate, null, 4);
    for (let i = 0; i < 50; i += 1) {
      aggregate = applyReviewToAggregate(aggregate, 4, 1);
      aggregate = applyReviewToAggregate(aggregate, 1, 4);
    }
    expect(aggregate).toEqual({ ratingAvg: 4.3333, ratingCount: 3 });
  });

  it('treats an edit on an inconsistent zero-count aggregate as a new review', () => {
    expect(applyReviewToAggregate({ ratingAvg: 0, ratingCount: 0 }, 2, 5)).toEqual({
      ratingAvg: 5,
      ratingCount: 1,
    });
  });

  it('clamps out-of-range ratings and averages', () => {
    expect(applyReviewToAggregate({ ratingAvg: 9, ratingCount: 1 }, null, 7)).toEqual({
      ratingAvg: 5,
      ratingCount: 2,
    });
  });
});

describe('sanitizeReviewText', () => {
  it('normalises newlines and trims', () => {
    expect(sanitizeReviewText('  Great casting!\r\nLove it.  ')).toBe('Great casting!\nLove it.');
  });

  it('strips control, zero-width and bidi override characters', () => {
    expect(sanitizeReviewText('Nice\u0000 paint\u200B job\u202E!\u0007')).toBe('Nice paint job!');
  });

  it('collapses long runs of blank lines and trailing spaces before newlines', () => {
    expect(sanitizeReviewText('Line one   \n\n\n\n\nLine two')).toBe('Line one\n\nLine two');
  });

  it('keeps ZWNJ / ZWJ (Marathi eyelash-ra, emoji ZWJ sequences)', () => {
    expect(sanitizeReviewText('दर्\u200Dया 🏎️ \u{1F468}\u200D\u{1F469}\u200D\u{1F467}')).toBe(
      'दर्\u200Dया 🏎️ \u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
    );
  });

  it('keeps emoji and Indian scripts intact', () => {
    expect(sanitizeReviewText('शानदार कार 🏎️🔥')).toBe('शानदार कार 🏎️🔥');
  });
});
