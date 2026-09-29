import { describe, expect, it } from 'vitest';
import { MAX_QTY_PER_ITEM, computeOrderTotals } from '../../../shared/index.js';
import { captureAppError, product, productMap, settings } from '../testing/fixtures.js';
import { maxQtyPerItem, mergeOrderLines, priceOrder } from './pricing.js';

const racer = product({
  id: 'racer',
  name: 'Bone Shaker',
  price: 349,
  category: 'racing',
  stock: 50,
});
const rare = product({ id: 'rare', name: 'Night Shifter', price: 799, rarity: 'rare', stock: 5 });
const cheap = product({ id: 'cheap', name: 'Rodger Dodger', price: 199, stock: 3 });
const catalogue = productMap(racer, rare, cheap);

describe('mergeOrderLines', () => {
  it('merges duplicate products (summing quantities) in first-seen order', () => {
    expect(
      mergeOrderLines([
        { productId: 'a', qty: 1 },
        { productId: 'b', qty: 2 },
        { productId: 'a', qty: 3 },
      ]),
    ).toEqual([
      { productId: 'a', qty: 4 },
      { productId: 'b', qty: 2 },
    ]);
  });

  it('drops blank ids and non-positive / non-finite quantities, floors fractions', () => {
    expect(
      mergeOrderLines([
        { productId: ' ', qty: 1 },
        { productId: 'a', qty: 0 },
        { productId: 'b', qty: -2 },
        { productId: 'c', qty: Number.NaN },
        { productId: ' d ', qty: 2.7 },
      ]),
    ).toEqual([{ productId: 'd', qty: 2 }]);
  });
});

describe('maxQtyPerItem', () => {
  it('uses the store setting but never exceeds the shared MAX_QTY_PER_ITEM', () => {
    expect(maxQtyPerItem({ maxQtyPerItem: 4 })).toBe(4);
    expect(maxQtyPerItem({ maxQtyPerItem: 50 })).toBe(MAX_QTY_PER_ITEM);
    expect(maxQtyPerItem({ maxQtyPerItem: 0 })).toBe(1);
    expect(maxQtyPerItem({ maxQtyPerItem: Number.NaN })).toBe(MAX_QTY_PER_ITEM);
  });
});

describe('priceOrder', () => {
  it('prices every line with SERVER prices and the shared computeOrderTotals', () => {
    const { lines, totals } = priceOrder(
      [
        { productId: 'racer', qty: 2 },
        { productId: 'rare', qty: 1 },
      ],
      catalogue,
      settings(),
    );
    expect(lines).toEqual([
      {
        productId: 'racer',
        slug: 'racer',
        name: 'Bone Shaker',
        price: 349,
        qty: 2,
        image: '/placeholders/racer.svg',
        rarity: 'common',
        category: 'racing',
      },
      {
        productId: 'rare',
        slug: 'rare',
        name: 'Night Shifter',
        price: 799,
        qty: 1,
        image: '/placeholders/rare.svg',
        rarity: 'rare',
        category: 'sports',
      },
    ]);
    expect(totals).toEqual(
      computeOrderTotals(
        [
          { price: 349, qty: 2 },
          { price: 799, qty: 1 },
        ],
        settings(),
      ),
    );
    // 1,497 ≥ 999 → free shipping; GST is the inclusive portion.
    expect(totals.subtotal).toBe(1497);
    expect(totals.shipping).toBe(0);
    expect(totals.total).toBe(1497);
    expect(totals.tax).toBe(228.36);
  });

  it('charges the flat shipping fee below the free-shipping threshold', () => {
    const { totals } = priceOrder([{ productId: 'cheap', qty: 1 }], catalogue, settings());
    expect(totals.subtotal).toBe(199);
    expect(totals.shipping).toBe(79);
    expect(totals.total).toBe(278);
  });

  it('honours custom store settings from settings/site', () => {
    const custom = settings({ shippingThreshold: 2000, shippingFee: 49 });
    const { totals } = priceOrder([{ productId: 'rare', qty: 2 }], catalogue, custom);
    expect(totals.subtotal).toBe(1598);
    expect(totals.shipping).toBe(49);
    expect(totals.total).toBe(1647);
  });

  it('merges duplicate lines before applying caps and stock checks', () => {
    const { lines } = priceOrder(
      [
        { productId: 'racer', qty: 3 },
        { productId: 'racer', qty: 4 },
      ],
      catalogue,
      settings(),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(7);

    const error = captureAppError(() =>
      priceOrder(
        [
          { productId: 'cheap', qty: 2 },
          { productId: 'cheap', qty: 2 },
        ],
        catalogue,
        settings(),
      ),
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe(
      'Only 3 of Rodger Dodger left — lower the quantity in your pit stop.',
    );
  });

  it('rejects an empty order', () => {
    const error = captureAppError(() => priceOrder([], catalogue, settings()));
    expect(error.code).toBe('invalid-argument');
    expect(error.message).toBe('Your pit stop is empty.');
  });

  it('rejects unknown products', () => {
    const error = captureAppError(() =>
      priceOrder([{ productId: 'ghost', qty: 1 }], catalogue, settings()),
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toMatch(/no longer available/);
  });

  it('rejects inactive products and products without a valid price, naming the car', () => {
    const retired = productMap(product({ id: 'old', name: 'Deora II', isActive: false }));
    const inactive = captureAppError(() =>
      priceOrder([{ productId: 'old', qty: 1 }], retired, settings()),
    );
    expect(inactive.code).toBe('failed-precondition');
    expect(inactive.message).toBe(
      'Deora II is no longer available — remove it from your pit stop.',
    );

    const unpriced = productMap(product({ id: 'np', name: 'Mystery Model', price: null }));
    const invalid = captureAppError(() =>
      priceOrder([{ productId: 'np', qty: 1 }], unpriced, settings()),
    );
    expect(invalid.code).toBe('failed-precondition');
    expect(invalid.message).toContain('Mystery Model');
  });

  it('enforces the per-collector quantity cap from settings (out-of-range)', () => {
    const error = captureAppError(() =>
      priceOrder([{ productId: 'racer', qty: 5 }], catalogue, settings({ maxQtyPerItem: 4 })),
    );
    expect(error.code).toBe('out-of-range');
    expect(error.message).toBe(
      'You can take up to 4 of Bone Shaker per order — adjust your pit stop.',
    );
  });

  it('rejects sold-out cars and quantities above the stock, naming the car', () => {
    const soldOut = productMap(product({ id: 'so', name: 'Sharkruiser', stock: 0 }));
    const noneLeft = captureAppError(() =>
      priceOrder([{ productId: 'so', qty: 1 }], soldOut, settings()),
    );
    expect(noneLeft.code).toBe('failed-precondition');
    expect(noneLeft.message).toBe('Sharkruiser is sold out — remove it from your pit stop.');

    const tooMany = captureAppError(() =>
      priceOrder([{ productId: 'rare', qty: 6 }], catalogue, settings()),
    );
    expect(tooMany.code).toBe('failed-precondition');
    expect(tooMany.message).toBe(
      'Only 5 of Night Shifter left — lower the quantity in your pit stop.',
    );
  });

  it('never decrements stock (validation only)', () => {
    priceOrder([{ productId: 'cheap', qty: 3 }], catalogue, settings());
    expect(catalogue.get('cheap')?.stock).toBe(3);
  });
});
