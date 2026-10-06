import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CartItem } from '@/types';
import {
  INVALID_ORDER_FALLBACK,
  NETWORK_ERROR_MESSAGE,
  UNAUTHENTICATED_MESSAGE,
  classifyPlaceOrderError,
} from '../checkoutErrors';
import { paymentSignature, type PlaceOrderInput } from '../placeOrderInput';

function functionsError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code: `functions/${code}` });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('classifyPlaceOrderError', () => {
  it('passes server messages through for changed prices / stock and drops the payment', () => {
    const info = classifyPlaceOrderError(
      functionsError('failed-precondition', 'Prices changed — review your pit stop.'),
    );
    expect(info).toEqual({
      kind: 'order-changed',
      message: 'Prices changed — review your pit stop.',
      keepPayment: false,
    });
    expect(classifyPlaceOrderError(functionsError('out-of-range', 'Too many')).kind).toBe(
      'order-changed',
    );
  });

  it('treats invalid-argument as an order that cannot be placed (no "we refreshed prices")', () => {
    expect(
      classifyPlaceOrderError(
        functionsError('invalid-argument', 'An order can hold at most 20 different cars'),
      ),
    ).toEqual({
      kind: 'invalid-order',
      message: 'An order can hold at most 20 different cars',
      keepPayment: false,
    });
    // Without a usable server message → a friendly fallback, still not "order-changed".
    const bare = classifyPlaceOrderError(functionsError('invalid-argument', ''));
    expect(bare).toEqual({
      kind: 'invalid-order',
      message: INVALID_ORDER_FALLBACK,
      keepPayment: false,
    });
  });

  it('keeps the payment for an expired session', () => {
    expect(classifyPlaceOrderError(functionsError('unauthenticated', 'x'))).toEqual({
      kind: 'unauthenticated',
      message: UNAUTHENTICATED_MESSAGE,
      keepPayment: true,
    });
  });

  it('treats unavailable / timeouts / offline as network errors (retry with the same payment)', () => {
    for (const code of ['unavailable', 'deadline-exceeded', 'internal']) {
      expect(classifyPlaceOrderError(functionsError(code, 'boom'))).toEqual({
        kind: 'network',
        message: NETWORK_ERROR_MESSAGE,
        keepPayment: true,
      });
    }
    expect(classifyPlaceOrderError(new TypeError('Failed to fetch')).kind).toBe('network');
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    expect(classifyPlaceOrderError(new Error('whatever')).kind).toBe('network');
  });

  it('falls back to a friendly unknown error', () => {
    const info = classifyPlaceOrderError(functionsError('permission-denied', 'nope'));
    expect(info.kind).toBe('unknown');
    expect(info.message).toMatch(/permission/i);
  });
});

describe('paymentSignature', () => {
  const line = (productId: string, qty: number, price: number): CartItem => ({
    productId,
    slug: productId,
    name: productId,
    price,
    image: '',
    qty,
    stock: 10,
  });
  const input = (overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput => ({
    lines: [line('a', 1, 499), line('b', 2, 199)],
    address: {
      name: 'A',
      phone: '9876543210',
      pincode: '400050',
      line1: 'Somewhere 1',
      city: 'Mumbai',
      state: 'Maharashtra',
    },
    method: 'card',
    amount: 976,
    customer: { name: 'A', email: 'a@b.c', phone: '9876543210' },
    ...overrides,
  });

  it('is stable for the same attempt regardless of line order', () => {
    expect(paymentSignature(input())).toBe(
      paymentSignature(input({ lines: [line('b', 2, 199), line('a', 1, 499)] })),
    );
  });

  it('changes when the method, amount or lines change (a held payment is not reused)', () => {
    const base = paymentSignature(input());
    expect(paymentSignature(input({ method: 'upi' }))).not.toBe(base);
    expect(paymentSignature(input({ amount: 1055 }))).not.toBe(base);
    expect(paymentSignature(input({ lines: [line('a', 2, 499)] }))).not.toBe(base);
  });
});
