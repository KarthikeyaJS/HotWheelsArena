import { describe, expect, it } from 'vitest';
import { readOrderSuccessState, type OrderSuccessState } from '../orderSuccessState';

const UID = 'uid-collector-a';

const valid: OrderSuccessState = {
  uid: UID,
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
  it('accepts a well-formed state for the same order and the same collector', () => {
    expect(readOrderSuccessState(valid, 'order123', UID)).toEqual({ ...valid, celebrated: false });
    expect(readOrderSuccessState({ ...valid, celebrated: true }, 'order123', UID)?.celebrated).toBe(
      true,
    );
  });

  it('keeps the uid so the "celebrated" replace preserves the scoping', () => {
    expect(readOrderSuccessState(valid, 'order123', UID)?.uid).toBe(UID);
  });

  it('rejects state that belongs to another order', () => {
    expect(readOrderSuccessState(valid, 'someone-else', UID)).toBeNull();
  });

  it('rejects state saved for a different collector (shared device, same tab)', () => {
    expect(readOrderSuccessState(valid, 'order123', 'uid-collector-b')).toBeNull();
  });

  it('rejects state without a uid (legacy entries) and while nobody is signed in', () => {
    const { uid: _uid, ...legacy } = valid;
    expect(readOrderSuccessState(legacy, 'order123', UID)).toBeNull();
    expect(readOrderSuccessState({ ...valid, uid: 42 }, 'order123', UID)).toBeNull();
    expect(readOrderSuccessState(valid, 'order123', null)).toBeNull();
    expect(readOrderSuccessState({ ...valid, uid: '' }, 'order123', '')).toBeNull();
  });

  it('rejects malformed / tampered history state', () => {
    expect(readOrderSuccessState(null, 'order123', UID)).toBeNull();
    expect(readOrderSuccessState('nope', 'order123', UID)).toBeNull();
    expect(
      readOrderSuccessState({ ...valid, paymentMethod: 'bitcoin' }, 'order123', UID),
    ).toBeNull();
    expect(
      readOrderSuccessState(
        { ...valid, response: { ...valid.response, badgesUnlocked: ['made-up-badge'] } },
        'order123',
        UID,
      ),
    ).toBeNull();
    expect(
      readOrderSuccessState({ ...valid, items: [{ productId: 'x' }] }, 'order123', UID),
    ).toBeNull();
    expect(
      readOrderSuccessState(
        { ...valid, totals: { ...valid.totals, total: 'free' } },
        'order123',
        UID,
      ),
    ).toBeNull();
  });
});
