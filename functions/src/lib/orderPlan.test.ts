import { describe, expect, it } from 'vitest';
import { EMPTY_USER_STATS, computeOrderTotals, computeOrderXp } from '../../../shared/index.js';
import {
  NOW,
  TXN_ID,
  address,
  captureAppError,
  findUndefinedPaths,
  product,
  productMap,
  settings,
  verifiedPayment,
  type Now,
} from '../testing/fixtures.js';
import type { GarageRecord, SeriesRecord } from './firestoreData.js';
import {
  COD_UNAVAILABLE_MESSAGE,
  PAYMENT_ALREADY_USED_MESSAGE,
  assertPaymentMethodAvailable,
  buildOrderPlan,
  resolveReplay,
  type OrderPlanInput,
} from './orderPlan.js';
import { priceOrder, type PricedOrder } from './pricing.js';

const racer = product({
  id: 'racer',
  name: 'Bone Shaker',
  price: 349,
  category: 'racing',
  stock: 50,
});
const rare = product({ id: 'rare', name: 'Night Shifter', price: 799, rarity: 'rare', stock: 5 });
const other = product({
  id: 'other',
  name: 'Rodger Dodger',
  price: 199,
  category: 'racing',
  stock: 10,
});
const catalogue = productMap(racer, rare, other);
const series: SeriesRecord[] = [{ id: 'track-heroes', carIds: ['racer', 'other'] }];

const caller = {
  uid: 'u1',
  displayName: 'Asha Rao',
  email: 'asha@example.com',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
};

const existingProfile = {
  uid: 'u1',
  displayName: 'Asha Rao',
  email: 'asha@example.com',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
  xp: 1000,
  level: 6,
  badges: ['first-ride', 'treasure-hunter'],
  stats: {
    carsOwned: 3,
    uniqueCars: 2,
    seriesCompleted: 0,
    ordersPlaced: 1,
    racingCars: 1,
    rareCars: 1,
    totalSpent: 1497,
  },
  role: 'customer',
  createdAt: 'EARLIER',
  updatedAt: 'EARLIER',
};

const existingGarage = new Map<string, GarageRecord>([
  ['racer', { productId: 'racer', quantity: 2, isFavorite: true, source: 'purchase' }],
  ['rare', { productId: 'rare', quantity: 1, isFavorite: false, source: 'manual' }],
]);

function planInput(
  priced: PricedOrder,
  overrides: Partial<OrderPlanInput<Now>> = {},
): OrderPlanInput<Now> {
  return {
    uid: 'u1',
    orderId: 'order-1',
    priced,
    payment: verifiedPayment({ amount: priced.totals.total }),
    address: address(),
    caller,
    profileData: undefined,
    garage: new Map(),
    products: catalogue,
    series,
    timestamp: NOW,
    ...overrides,
  };
}

describe('buildOrderPlan — first order of a new collector', () => {
  const priced = priceOrder(
    [
      { productId: 'racer', qty: 2 },
      { productId: 'rare', qty: 1 },
    ],
    catalogue,
    settings(),
  );
  const plan = buildOrderPlan(planInput(priced));

  it('responds with order id, XP (order + badge rewards), badges, level and total', () => {
    // computeOrderXp: 100 + 2 × 25 + 1 × (25 + 25) = 200; first-ride +100, treasure-hunter +150.
    expect(
      computeOrderXp([
        { qty: 2, rarity: 'common' },
        { qty: 1, rarity: 'rare' },
      ]),
    ).toBe(200);
    expect(plan.response).toEqual({
      orderId: 'order-1',
      xpEarned: 450,
      badgesUnlocked: ['first-ride', 'treasure-hunter'],
      level: 4,
      leveledUp: true,
      total: 1497,
    });
  });

  it('writes the full order document with server prices and shared totals', () => {
    expect(plan.order).toEqual({
      uid: 'u1',
      items: [
        {
          productId: 'racer',
          slug: 'racer',
          name: 'Bone Shaker',
          price: 349,
          qty: 2,
          image: '/placeholders/racer.svg',
        },
        {
          productId: 'rare',
          slug: 'rare',
          name: 'Night Shifter',
          price: 799,
          qty: 1,
          image: '/placeholders/rare.svg',
        },
      ],
      productIds: ['racer', 'rare'],
      itemCount: 3,
      subtotal: 1497,
      shipping: 0,
      tax: 228.36,
      total: 1497,
      currency: 'INR',
      address: {
        name: 'Asha Rao',
        phone: '9876543210',
        pincode: '560001',
        line1: '12 MG Road, Flat 4B',
        line2: 'Near the metro',
        landmark: '',
        city: 'Bengaluru',
        state: 'Karnataka',
      },
      status: 'placed',
      payment: {
        provider: 'dummy',
        status: 'success',
        transactionId: TXN_ID,
        mode: 'test',
        method: 'card',
      },
      paymentMethod: 'card',
      xpEarned: 450,
      badgesUnlocked: ['first-ride', 'treasure-hunter'],
      customer: { displayName: 'Asha Rao', email: 'asha@example.com' },
      createdAt: NOW,
      updatedAt: NOW,
    });
    const recomputed = computeOrderTotals(
      plan.order.items.map((item) => ({ price: item.price, qty: item.qty })),
      settings(),
    );
    expect(plan.order.total).toBe(recomputed.total);
  });

  it('parks every purchased car as a new purchase entry (same keys as a manual entry)', () => {
    expect(plan.garageWrites).toEqual([
      {
        kind: 'create',
        productId: 'racer',
        data: {
          productId: 'racer',
          addedAt: NOW,
          source: 'purchase',
          isFavorite: false,
          quantity: 2,
        },
      },
      {
        kind: 'create',
        productId: 'rare',
        data: {
          productId: 'rare',
          addedAt: NOW,
          source: 'purchase',
          isFavorite: false,
          quantity: 1,
        },
      },
    ]);
  });

  it('creates the missing profile with defaults plus the new progression', () => {
    expect(plan.profile).toEqual({
      kind: 'create',
      data: {
        uid: 'u1',
        displayName: 'Asha Rao',
        email: 'asha@example.com',
        photoURL: 'https://lh3.googleusercontent.com/a/photo',
        xp: 450,
        level: 4,
        badges: ['first-ride', 'treasure-hunter'],
        stats: {
          carsOwned: 3,
          uniqueCars: 2,
          seriesCompleted: 0,
          ordersPlaced: 1,
          racingCars: 1,
          rareCars: 1,
          totalSpent: 1497,
        },
        role: 'customer',
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
  });

  it('writes an idempotency marker that can replay the response', () => {
    expect(plan.marker).toEqual({
      ...plan.response,
      uid: 'u1',
      provider: 'dummy',
      transactionId: TXN_ID,
      createdAt: NOW,
    });
    expect(resolveReplay({ ...plan.marker }, 'u1')).toEqual(plan.response);
  });

  it('never writes undefined values (Firestore rejects them)', () => {
    expect(findUndefinedPaths(plan.order)).toEqual([]);
    expect(findUndefinedPaths(plan.garageWrites)).toEqual([]);
    expect(findUndefinedPaths(plan.profile)).toEqual([]);
    expect(findUndefinedPaths(plan.marker)).toEqual([]);
  });
});

describe('buildOrderPlan — returning collector', () => {
  const priced = priceOrder(
    [
      { productId: 'racer', qty: 1 },
      { productId: 'other', qty: 1 },
    ],
    catalogue,
    settings(),
  );
  const plan = buildOrderPlan(
    planInput(priced, { profileData: existingProfile, garage: existingGarage, orderId: 'order-2' }),
  );

  it('charges shipping below the threshold', () => {
    expect(plan.order.subtotal).toBe(548);
    expect(plan.order.shipping).toBe(79);
    expect(plan.order.tax).toBe(83.59);
    expect(plan.order.total).toBe(627);
  });

  it('increments repeat purchases (keeping favourite + addedAt) and parks new cars', () => {
    expect(plan.garageWrites).toEqual([
      { kind: 'update', productId: 'racer', data: { quantity: 3, source: 'purchase' } },
      {
        kind: 'create',
        productId: 'other',
        data: {
          productId: 'other',
          addedAt: NOW,
          source: 'purchase',
          isFavorite: false,
          quantity: 1,
        },
      },
    ]);
  });

  it('recomputes stats from the full garage and bumps the order counters', () => {
    expect(plan.stats).toEqual({
      carsOwned: 5,
      uniqueCars: 3,
      seriesCompleted: 1, // racer + other complete "track-heroes"
      ordersPlaced: 2,
      racingCars: 2,
      rareCars: 1,
      totalSpent: 2124,
    });
  });

  it('awards order XP + only the newly unlocked badge, and levels up', () => {
    // 100 + 25 + 25 = 150 order XP, master-collector +500 → 1000 + 650 = 1650 → LEVEL 08.
    expect(plan.response).toEqual({
      orderId: 'order-2',
      xpEarned: 650,
      badgesUnlocked: ['master-collector'],
      level: 8,
      leveledUp: true,
      total: 627,
    });
  });

  it('updates only the server-owned progression fields of a complete profile', () => {
    expect(plan.profile).toEqual({
      kind: 'update',
      data: {
        xp: 1650,
        level: 8,
        badges: ['first-ride', 'treasure-hunter', 'master-collector'],
        stats: plan.stats,
        updatedAt: NOW,
      },
    });
  });

  it('backfills missing identity fields while updating progression', () => {
    const incomplete = { ...existingProfile, displayName: '', email: undefined };
    const backfilled = buildOrderPlan(
      planInput(priced, { profileData: incomplete, garage: existingGarage }),
    );
    expect(backfilled.profile.kind).toBe('update');
    expect(backfilled.profile.data).toMatchObject({
      displayName: 'Asha Rao',
      email: 'asha@example.com',
      xp: 1650,
      level: 8,
    });
    expect(findUndefinedPaths(backfilled.profile)).toEqual([]);
  });
});

describe('buildOrderPlan — edge cases', () => {
  it('records cash on delivery with the shared success status and method cod', () => {
    const priced = priceOrder([{ productId: 'rare', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(
      planInput(priced, {
        payment: verifiedPayment({ amount: priced.totals.total, method: 'cod' }),
      }),
    );
    expect(plan.order.payment).toEqual({
      provider: 'dummy',
      status: 'success',
      transactionId: TXN_ID,
      mode: 'test',
      method: 'cod',
    });
    expect(plan.order.paymentMethod).toBe('cod');
  });

  it('counts garage cars whose product was deleted, without racing / rare credit', () => {
    const garage = new Map<string, GarageRecord>([
      ['retired', { productId: 'retired', quantity: 4, isFavorite: false, source: 'manual' }],
    ]);
    const products = new Map(catalogue);
    products.set('retired', null);
    const priced = priceOrder([{ productId: 'other', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(planInput(priced, { garage, products }));
    expect(plan.stats).toMatchObject({ carsOwned: 5, uniqueCars: 2, racingCars: 1, rareCars: 0 });
  });

  it('uses the priced lines for purchased cars even without their product facts', () => {
    const priced = priceOrder([{ productId: 'racer', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(planInput(priced, { products: new Map(), series: [] }));
    expect(plan.stats).toMatchObject({ carsOwned: 1, racingCars: 1, seriesCompleted: 0 });
  });

  it('falls back to the profile for the customer snapshot when the token lacks it', () => {
    const priced = priceOrder([{ productId: 'racer', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(
      planInput(priced, {
        caller: { uid: 'u1', displayName: null, email: null, photoURL: null },
        profileData: existingProfile,
      }),
    );
    expect(plan.order.customer).toEqual({ displayName: 'Asha Rao', email: 'asha@example.com' });
  });

  it('keeps XP and badges of a maxed collector without re-awarding', () => {
    const veteran = {
      ...existingProfile,
      xp: 20_000,
      level: 25,
      badges: [
        'first-ride',
        'speed-demon',
        'treasure-hunter',
        'garage-builder',
        'master-collector',
      ],
    };
    const priced = priceOrder([{ productId: 'racer', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(planInput(priced, { profileData: veteran }));
    expect(plan.response.badgesUnlocked).toEqual([]);
    expect(plan.response.xpEarned).toBe(125);
    expect(plan.response.level).toBe(25);
    expect(plan.response.leveledUp).toBe(false);
  });

  it('starts from zeroed stats for a profile without stats', () => {
    const priced = priceOrder([{ productId: 'racer', qty: 1 }], catalogue, settings());
    const plan = buildOrderPlan(
      planInput(priced, {
        profileData: { ...existingProfile, stats: undefined, xp: 0, badges: [] },
      }),
    );
    expect(plan.stats).toEqual({
      ...EMPTY_USER_STATS,
      carsOwned: 1,
      uniqueCars: 1,
      racingCars: 1,
      ordersPlaced: 1,
      totalSpent: 349 + 79,
    });
  });
});

describe('resolveReplay', () => {
  const marker = {
    uid: 'u1',
    orderId: 'order-1',
    xpEarned: 450,
    badgesUnlocked: ['first-ride'],
    level: 4,
    leveledUp: true,
    total: 1497,
    provider: 'dummy',
    transactionId: TXN_ID,
  };

  it('returns null for an unprocessed payment', () => {
    expect(resolveReplay(undefined, 'u1')).toBeNull();
  });

  it("returns the original result for the collector's own retry", () => {
    expect(resolveReplay(marker, 'u1')).toEqual({
      orderId: 'order-1',
      xpEarned: 450,
      badgesUnlocked: ['first-ride'],
      level: 4,
      leveledUp: true,
      total: 1497,
    });
  });

  it('refuses a payment already used by another collector or a corrupt marker', () => {
    const stolen = captureAppError(() => resolveReplay(marker, 'intruder'));
    expect(stolen.code).toBe('failed-precondition');
    expect(stolen.message).toBe(PAYMENT_ALREADY_USED_MESSAGE);

    const corrupt = captureAppError(() => resolveReplay({ uid: 'u1' }, 'u1'));
    expect(corrupt.code).toBe('failed-precondition');
  });
});

describe('assertPaymentMethodAvailable', () => {
  it('allows every method while COD is enabled', () => {
    for (const method of ['card', 'upi', 'cod'] as const) {
      expect(() => assertPaymentMethodAvailable(method, { codEnabled: true })).not.toThrow();
    }
  });

  it('blocks cash on delivery when disabled in settings/site', () => {
    const error = captureAppError(() => assertPaymentMethodAvailable('cod', { codEnabled: false }));
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe(COD_UNAVAILABLE_MESSAGE);
    expect(() => assertPaymentMethodAvailable('upi', { codEnabled: false })).not.toThrow();
  });
});
