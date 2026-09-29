import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_SETTINGS,
  MAX_QTY_PER_ITEM,
  clampQty,
  computeOrderTotals,
  roundCurrency,
} from './commerce.js';

describe('DEFAULT_SITE_SETTINGS', () => {
  it('matches the locked defaults', () => {
    expect(DEFAULT_SITE_SETTINGS).toMatchObject({
      shippingThreshold: 999,
      shippingFee: 79,
      taxRate: 0.18,
      taxInclusive: true,
      showGstLine: true,
      codEnabled: true,
      maxQtyPerItem: MAX_QTY_PER_ITEM,
    });
  });
});

describe('computeOrderTotals', () => {
  it('returns zeros for an empty cart', () => {
    expect(computeOrderTotals([])).toEqual({
      itemCount: 0,
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      freeShippingRemaining: 0,
      freeShippingPct: 0,
      qualifiesForFreeShipping: true,
    });
  });

  it('charges shipping below the threshold', () => {
    const totals = computeOrderTotals([{ price: 299, qty: 2 }]);
    expect(totals.itemCount).toBe(2);
    expect(totals.subtotal).toBe(598);
    expect(totals.shipping).toBe(79);
    expect(totals.total).toBe(677);
    expect(totals.freeShippingRemaining).toBe(401);
    expect(totals.qualifiesForFreeShipping).toBe(false);
    expect(totals.freeShippingPct).toBeCloseTo((598 / 999) * 100);
  });

  it('ships free at or above the threshold', () => {
    const totals = computeOrderTotals([{ price: 999, qty: 1 }]);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(999);
    expect(totals.freeShippingRemaining).toBe(0);
    expect(totals.freeShippingPct).toBe(100);
  });

  it('computes the inclusive GST portion', () => {
    const totals = computeOrderTotals([{ price: 1180, qty: 1 }]);
    expect(totals.tax).toBe(180);
    expect(totals.total).toBe(1180);
  });

  it('adds exclusive tax on top', () => {
    const totals = computeOrderTotals([{ price: 1000, qty: 1 }], {
      ...DEFAULT_SITE_SETTINGS,
      taxInclusive: false,
    });
    expect(totals.tax).toBe(180);
    expect(totals.total).toBe(1180);
  });

  it('ignores invalid lines', () => {
    const totals = computeOrderTotals([
      { price: 499, qty: 1 },
      { price: Number.NaN, qty: 1 },
      { price: 199, qty: 0 },
    ]);
    expect(totals.subtotal).toBe(499);
    expect(totals.itemCount).toBe(1);
  });

  it('is deterministic to the paisa', () => {
    const totals = computeOrderTotals([{ price: 199, qty: 3 }]);
    expect(totals.tax).toBe(roundCurrency(597 - 597 / 1.18));
    expect(Number.isInteger(Math.round(totals.tax * 100))).toBe(true);
  });
});

describe('clampQty', () => {
  it('clamps into 1..min(stock, max)', () => {
    expect(clampQty(5, 3)).toBe(3);
    expect(clampQty(0, 3)).toBe(1);
    expect(clampQty(50, 100)).toBe(MAX_QTY_PER_ITEM);
    expect(clampQty(4, 100, 5)).toBe(4);
    expect(clampQty(2.9, 10)).toBe(2);
  });

  it('handles bad input', () => {
    expect(clampQty(Number.NaN, 5)).toBe(1);
    expect(clampQty(3, 0)).toBe(1);
    expect(clampQty(3, Number.NaN)).toBe(3);
  });
});

describe('roundCurrency', () => {
  it('rounds to two decimals', () => {
    expect(roundCurrency(1.005)).toBe(1.01);
    expect(roundCurrency(10)).toBe(10);
  });
});
