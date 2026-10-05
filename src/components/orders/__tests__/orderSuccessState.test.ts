import { describe, expect, it } from 'vitest';
import { readOrderSuccessState, type OrderSuccessState } from '../orderSuccessState';

const valid: OrderSuccessState = {
  response: {
    orderId: 'order123',
    xpEarned: 425,
    badgesUnlocked: ['first-ride', 'treasure-hunter'],
    level: 4,
    leveledUp: true,
    total: 777,
  },
  items: [
    {
      productId: 'porsche-911-gt3-rs',
      slug: 'porsche-911-gt3-rs',
      name: 'Porsche 911 GT3 RS',
      image: '/placeholders/sports-blue.svg',
      price: 499,
      qty: 1,
    },
  ],
  totals: { subtotal: 698, shipping: 79, tax: 106.47, total: 777, itemCount: 2 },
  paymentMethod: 'card',
};

describe('readOrderSuccessState', () => {
  it('accepts a well-formed state for the same order', () => {
    expect(readOrderSuccessState(valid, 'order123')).toEqual({ ...valid, celebrated: false });
    expect(readOrderSuccessState({ ...valid, celebrated: true }, 'order123')?.celebrated).toBe(
      true,
    );
  });

  it('rejects state that belongs to another order', () => {
    expect(readOrderSuccessState(valid, 'someone-else')).toBeNull();
  });

  it('rejects malformed / tampered history state', () => {
    expect(readOrderSuccessState(null, 'order123')).toBeNull();
    expect(readOrderSuccessState('nope', 'order123')).toBeNull();
    expect(readOrderSuccessState({ ...valid, paymentMethod: 'bitcoin' }, 'order123')).toBeNull();
    expect(
      readOrderSuccessState(
        { ...valid, response: { ...valid.response, badgesUnlocked: ['made-up-badge'] } },
        'order123',
      ),
    ).toBeNull();
    expect(readOrderSuccessState({ ...valid, items: [{ productId: 'x' }] }, 'order123')).toBeNull();
    expect(
      readOrderSuccessState({ ...valid, totals: { ...valid.totals, total: 'free' } }, 'order123'),
    ).toBeNull();
  });
});
