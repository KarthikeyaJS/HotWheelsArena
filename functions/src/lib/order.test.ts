import { describe, expect, it } from 'vitest';
import { MAX_GARAGE_QUANTITY } from '../../../shared/index.js';
import { address } from '../testing/fixtures.js';
import type { GarageRecord } from './firestoreData.js';
import {
  applyPurchaseToGarage,
  customerSnapshot,
  paymentMarkerId,
  readProcessedPayment,
  toOrderItems,
  toStoredAddress,
} from './order.js';

describe('applyPurchaseToGarage', () => {
  const garage = new Map<string, GarageRecord>([
    ['fav', { productId: 'fav', quantity: 2, isFavorite: true, source: 'manual' }],
    ['full', { productId: 'full', quantity: 98, isFavorite: false, source: 'purchase' }],
  ]);

  it('parks new cars as purchases and increments existing ones, keeping favourites', () => {
    const result = applyPurchaseToGarage(garage, [
      { productId: 'fav', qty: 1 },
      { productId: 'new', qty: 3 },
    ]);
    expect(result.writes).toEqual([
      { productId: 'fav', isNew: false, quantity: 3 },
      { productId: 'new', isNew: true, quantity: 3 },
    ]);
    expect(result.garage.get('fav')).toEqual({
      productId: 'fav',
      quantity: 3,
      isFavorite: true,
      source: 'purchase',
    });
    expect(result.garage.get('new')).toEqual({
      productId: 'new',
      quantity: 3,
      isFavorite: false,
      source: 'purchase',
    });
  });

  it('caps quantities at MAX_GARAGE_QUANTITY', () => {
    const result = applyPurchaseToGarage(garage, [{ productId: 'full', qty: 5 }]);
    expect(result.writes[0]?.quantity).toBe(MAX_GARAGE_QUANTITY);
  });

  it('does not mutate the garage it was given', () => {
    applyPurchaseToGarage(garage, [{ productId: 'fav', qty: 4 }]);
    expect(garage.get('fav')?.quantity).toBe(2);
    expect(garage.has('new')).toBe(false);
  });
});

describe('order documents', () => {
  it('snapshots order lines without internal pricing fields', () => {
    expect(
      toOrderItems([
        {
          productId: 'p1',
          slug: 'twin-mill',
          name: 'Twin Mill',
          price: 349,
          qty: 2,
          image: '/placeholders/twin-mill.svg',
          rarity: 'rare',
          category: 'racing',
        },
      ]),
    ).toEqual([
      {
        productId: 'p1',
        slug: 'twin-mill',
        name: 'Twin Mill',
        price: 349,
        qty: 2,
        image: '/placeholders/twin-mill.svg',
      },
    ]);
  });

  it('stores addresses with trimmed values and optional lines as strings', () => {
    expect(
      toStoredAddress(address({ name: '  Asha Rao ', line2: undefined, landmark: undefined })),
    ).toEqual({
      name: 'Asha Rao',
      phone: '9876543210',
      pincode: '560001',
      line1: '12 MG Road, Flat 4B',
      line2: '',
      landmark: '',
      city: 'Bengaluru',
      state: 'Karnataka',
    });
  });

  it('snapshots customer contact details', () => {
    expect(customerSnapshot({ displayName: ' Asha ', email: ' Asha@Example.com ' })).toEqual({
      displayName: 'Asha',
      email: 'asha@example.com',
    });
    expect(customerSnapshot({ displayName: null, email: undefined })).toEqual({
      displayName: '',
      email: '',
    });
  });
});

describe('payment idempotency marker', () => {
  it('builds {provider}_{transactionId}', () => {
    expect(paymentMarkerId('dummy', 'test_0123456789abcdef0123')).toBe(
      'dummy_test_0123456789abcdef0123',
    );
    expect(paymentMarkerId('razorpay', ' pay_Abc123 ')).toBe('razorpay_pay_Abc123');
  });

  it('refuses ids that are unsafe as document ids', () => {
    expect(paymentMarkerId('dummy', 'a/b')).toBeNull();
    expect(paymentMarkerId('dummy', '..')).toBeNull();
    expect(paymentMarkerId('dummy', '')).toBeNull();
    expect(paymentMarkerId('dummy', 'x'.repeat(129))).toBeNull();
  });

  it('reads a stored marker and rejects malformed ones', () => {
    expect(
      readProcessedPayment({
        uid: 'u1',
        orderId: 'o1',
        xpEarned: 450,
        badgesUnlocked: ['first-ride', 'nope'],
        level: 4,
        leveledUp: true,
        total: 1497,
      }),
    ).toEqual({
      uid: 'u1',
      orderId: 'o1',
      xpEarned: 450,
      badgesUnlocked: ['first-ride'],
      level: 4,
      leveledUp: true,
      total: 1497,
    });
    expect(readProcessedPayment(undefined)).toBeNull();
    expect(readProcessedPayment({ uid: 'u1' })).toBeNull();
  });
});
