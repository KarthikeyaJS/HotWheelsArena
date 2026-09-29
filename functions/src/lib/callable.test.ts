import { HttpsError } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSchema, PlaceOrderRequestSchema } from '../../../shared/index.js';
import { address, dummyPayment } from '../testing/fixtures.js';
import {
  BUSY_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  SIGN_IN_REQUIRED_MESSAGE,
  UNAVAILABLE_MESSAGE,
  parseInput,
  requireAuth,
  toHttpsError,
  withErrorHandling,
} from './callable.js';
import { AppError } from './errors.js';

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('firebase-functions/logger', () => loggerMock);

beforeEach(() => {
  vi.clearAllMocks();
});

function captureHttpsError(fn: () => unknown): HttpsError {
  try {
    fn();
  } catch (error: unknown) {
    if (error instanceof HttpsError) return error;
    throw error;
  }
  throw new Error('Expected an HttpsError');
}

describe('requireAuth', () => {
  it('rejects signed-out callers with unauthenticated', () => {
    for (const auth of [undefined, null, { uid: '' }, { uid: '   ' }]) {
      const error = captureHttpsError(() => requireAuth(auth));
      expect(error.code).toBe('unauthenticated');
      expect(error.message).toBe(SIGN_IN_REQUIRED_MESSAGE);
    }
  });

  it('returns the uid and profile hints from the verified token', () => {
    expect(
      requireAuth({
        uid: 'u1',
        token: {
          name: ' Asha Rao ',
          email: 'asha@example.com',
          picture: 'https://lh3.googleusercontent.com/a/p',
        },
      }),
    ).toEqual({
      uid: 'u1',
      displayName: 'Asha Rao',
      email: 'asha@example.com',
      photoURL: 'https://lh3.googleusercontent.com/a/p',
    });
  });

  it('treats missing / blank / non-string claims as null', () => {
    expect(requireAuth({ uid: 'u2', token: { name: '  ', email: 42 } })).toEqual({
      uid: 'u2',
      displayName: null,
      email: null,
      photoURL: null,
    });
    expect(requireAuth({ uid: 'u3' }).displayName).toBeNull();
  });
});

describe('parseInput', () => {
  const options = {
    fallbackMessage: 'Fallback message',
    fieldMessages: { address: 'Check your delivery address.', payment: 'Payment unreadable.' },
  };
  const validRequest = {
    items: [{ productId: 'p1', qty: 2 }],
    address: address(),
    payment: dummyPayment({ amount: 698 }),
  };

  it('returns the parsed (trimmed / normalised) value', () => {
    const parsed = parseInput(
      PlaceOrderRequestSchema,
      { ...validRequest, address: address({ name: '  Asha Rao  ' }) },
      options,
    );
    expect(parsed.address.name).toBe('Asha Rao');
    expect(parseInput(NewsletterSchema, { email: ' A@B.IN ' }, options)).toEqual({
      email: 'a@b.in',
    });
  });

  it('keeps the friendly messages written in the shared schemas', () => {
    const error = captureHttpsError(() =>
      parseInput(
        PlaceOrderRequestSchema,
        { ...validRequest, address: address({ pincode: '012345' }) },
        options,
      ),
    );
    expect(error.code).toBe('invalid-argument');
    expect(error.message).toBe('Enter a valid 6-digit PIN code');
    expect(error.details).toEqual({ field: 'address.pincode' });
  });

  it('replaces zod defaults with the per-field message', () => {
    const error = captureHttpsError(() =>
      parseInput(
        PlaceOrderRequestSchema,
        { ...validRequest, payment: { provider: 'paypal' } },
        options,
      ),
    );
    expect(error.code).toBe('invalid-argument');
    expect(error.message).toBe('Payment unreadable.');
  });

  it('falls back to the generic message for a missing / wrong-typed payload', () => {
    for (const data of [null, undefined, 'oops', 42]) {
      const error = captureHttpsError(() => parseInput(PlaceOrderRequestSchema, data, options));
      expect(error.code).toBe('invalid-argument');
      expect(error.message).toBe('Fallback message');
    }
  });

  it('rejects duplicate lines and oversize quantities with shared messages', () => {
    const duplicate = captureHttpsError(() =>
      parseInput(
        PlaceOrderRequestSchema,
        {
          ...validRequest,
          items: [
            { productId: 'p1', qty: 1 },
            { productId: 'p1', qty: 1 },
          ],
        },
        options,
      ),
    );
    expect(duplicate.message).toBe('Each car can only appear once per order');

    const tooMany = captureHttpsError(() =>
      parseInput(
        PlaceOrderRequestSchema,
        { ...validRequest, items: [{ productId: 'p1', qty: 11 }] },
        options,
      ),
    );
    expect(tooMany.message).toBe('Max 10 per collector');
  });
});

describe('toHttpsError', () => {
  it('passes HttpsErrors through untouched', () => {
    const original = new HttpsError('permission-denied', 'No entry');
    expect(toHttpsError(original, 'test')).toBe(original);
  });

  it('keeps the code and user-facing message of domain errors, logging details only', () => {
    const error = toHttpsError(
      new AppError('failed-precondition', 'Prices changed — review your pit stop.', { charged: 1 }),
      'placeOrder',
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe('Prices changed — review your pit stop.');
    expect(error.details).toBeUndefined();
    expect(loggerMock.info).toHaveBeenCalledTimes(1);
  });

  it('maps transaction contention to a retryable aborted error', () => {
    const error = toHttpsError(
      Object.assign(new Error('10 ABORTED: too much contention'), { code: 10 }),
      'x',
    );
    expect(error.code).toBe('aborted');
    expect(error.message).toBe(BUSY_MESSAGE);
  });

  it('maps backend outages to unavailable', () => {
    const error = toHttpsError(Object.assign(new Error('14 UNAVAILABLE'), { code: 14 }), 'x');
    expect(error.code).toBe('unavailable');
    expect(error.message).toBe(UNAVAILABLE_MESSAGE);
  });

  it('never leaks unexpected errors to the client', () => {
    const error = toHttpsError(new Error('secret stack detail: db password'), 'placeOrder');
    expect(error.code).toBe('internal');
    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(error.message).not.toContain('secret');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(toHttpsError('a string', 'x').code).toBe('internal');
  });
});

describe('withErrorHandling', () => {
  it('returns handler results', async () => {
    const handler = withErrorHandling('ok', async (value: number) => value * 2);
    await expect(handler(21)).resolves.toBe(42);
  });

  it('converts thrown errors into safe HttpsErrors', async () => {
    const failing = withErrorHandling('boom', async () => {
      throw new AppError('out-of-range', 'Too many cars.');
    });
    await expect(failing(undefined)).rejects.toMatchObject({
      code: 'out-of-range',
      message: 'Too many cars.',
    });

    const crashing = withErrorHandling('crash', async () => {
      throw new TypeError('undefined is not a function');
    });
    await expect(crashing(undefined)).rejects.toMatchObject({
      code: 'internal',
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});
