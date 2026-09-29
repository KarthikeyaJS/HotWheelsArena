import { describe, expect, it } from 'vitest';
import { captureAppErrorAsync, dummyPayment, TXN_ID } from '../testing/fixtures.js';
import { PRICES_CHANGED_MESSAGE, amountsMatch, assertAmountMatches } from './amount.js';
import {
  PAYMENT_DECLINED_MESSAGE,
  PAYMENT_UNVERIFIED_MESSAGE,
  TEST_PAYMENTS_DISABLED_MESSAGE,
  dummyPaymentVerifier,
} from './dummy.js';
import {
  PAYMENT_VERIFIERS,
  PROVIDER_UNAVAILABLE_MESSAGE,
  getPaymentVerifier,
  verifyPayment,
  type PaymentVerifierRegistry,
} from './registry.js';
import type { PaymentVerificationContext, PaymentVerifier } from './types.js';

const context = (
  overrides: Partial<PaymentVerificationContext> = {},
): PaymentVerificationContext => ({
  expectedAmount: 1497,
  currency: 'INR',
  uid: 'u1',
  allowTestPayments: true,
  ...overrides,
});

describe('amount checks', () => {
  it('matches to the paisa', () => {
    expect(amountsMatch(1497, 1497)).toBe(true);
    expect(amountsMatch(228.36, 228.36000000001)).toBe(true);
    expect(amountsMatch(1497, 1497.01)).toBe(false);
    expect(amountsMatch(Number.NaN, Number.NaN)).toBe(false);
  });

  it('rejects mismatches with the "prices changed" message', () => {
    expect(() => assertAmountMatches(1497, 1497)).not.toThrow();
    expect(() => assertAmountMatches(1400, 1497)).toThrowError(PRICES_CHANGED_MESSAGE);
    expect(PRICES_CHANGED_MESSAGE).toBe('Prices changed — review your pit stop.');
  });
});

describe('dummyPaymentVerifier', () => {
  it('accepts a successful test payment for exactly the server total (status success)', async () => {
    await expect(
      dummyPaymentVerifier.verify(dummyPayment({ amount: 1497, method: 'upi' }), context()),
    ).resolves.toEqual({
      provider: 'dummy',
      transactionId: TXN_ID,
      mode: 'test',
      method: 'upi',
      amount: 1497,
      status: 'success',
    });
  });

  it('records cash on delivery as success too (the order keeps paymentMethod cod)', async () => {
    const verified = await dummyPaymentVerifier.verify(
      dummyPayment({ amount: 1497, method: 'cod' }),
      context(),
    );
    expect(verified.status).toBe('success');
    expect(verified.method).toBe('cod');
  });

  it('rejects declined payments', async () => {
    const error = await captureAppErrorAsync(
      dummyPaymentVerifier.verify(dummyPayment({ amount: 1497, status: 'failed' }), context()),
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe(PAYMENT_DECLINED_MESSAGE);
  });

  it('rejects any amount other than the server total', async () => {
    const error = await captureAppErrorAsync(
      dummyPaymentVerifier.verify(dummyPayment({ amount: 1000 }), context()),
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe('Prices changed — review your pit stop.');
  });

  it('rejects everything when ALLOW_TEST_PAYMENTS is off', async () => {
    const error = await captureAppErrorAsync(
      dummyPaymentVerifier.verify(
        dummyPayment({ amount: 1497 }),
        context({ allowTestPayments: false }),
      ),
    );
    expect(error.message).toBe(TEST_PAYMENTS_DISABLED_MESSAGE);
  });

  it('rejects live-mode or malformed dummy payments', async () => {
    const live = await captureAppErrorAsync(
      dummyPaymentVerifier.verify(dummyPayment({ amount: 1497, mode: 'live' }), context()),
    );
    expect(live.message).toBe(PAYMENT_UNVERIFIED_MESSAGE);

    for (const transactionId of [
      'test_XYZ',
      'test_0123456789ABCDEF0123',
      'pay_0123456789abcdef0123',
    ]) {
      const forged = await captureAppErrorAsync(
        dummyPaymentVerifier.verify(dummyPayment({ amount: 1497, transactionId }), context()),
      );
      expect(forged.code).toBe('failed-precondition');
      expect(forged.message).toBe(PAYMENT_UNVERIFIED_MESSAGE);
    }
  });

  it('refuses payments reported by another provider', async () => {
    const error = await captureAppErrorAsync(
      dummyPaymentVerifier.verify(dummyPayment({ amount: 1497, provider: 'razorpay' }), context()),
    );
    expect(error.message).toBe(PAYMENT_UNVERIFIED_MESSAGE);
  });
});

describe('payment verifier registry', () => {
  it('registers the dummy verifier only (razorpay is reserved)', () => {
    expect(getPaymentVerifier('dummy')).toBe(dummyPaymentVerifier);
    expect(getPaymentVerifier('razorpay')).toBeNull();
    expect(Object.keys(PAYMENT_VERIFIERS)).toEqual(['dummy']);
  });

  it('verifies through the registered verifier', async () => {
    const verified = await verifyPayment(dummyPayment({ amount: 1497 }), context());
    expect(verified.status).toBe('success');
  });

  it('rejects providers without a verifier', async () => {
    const error = await captureAppErrorAsync(
      verifyPayment(dummyPayment({ amount: 1497, provider: 'razorpay' }), context()),
    );
    expect(error.code).toBe('failed-precondition');
    expect(error.message).toBe(PROVIDER_UNAVAILABLE_MESSAGE);
  });

  it('re-checks the confirmed amount whatever the verifier says (defence in depth)', async () => {
    const sloppy: PaymentVerifier = {
      provider: 'razorpay',
      async verify(payment) {
        return {
          provider: 'razorpay',
          transactionId: payment.transactionId,
          mode: 'live',
          method: payment.method,
          amount: payment.amount,
          status: 'success',
        };
      },
    };
    const registry: PaymentVerifierRegistry = { razorpay: sloppy };
    const payment = dummyPayment({
      provider: 'razorpay',
      transactionId: 'pay_ABC123',
      amount: 10,
      mode: 'live',
    });

    const error = await captureAppErrorAsync(verifyPayment(payment, context(), registry));
    expect(error.message).toBe('Prices changed — review your pit stop.');
    await expect(
      verifyPayment({ ...payment, amount: 1497 }, context(), registry),
    ).resolves.toMatchObject({ provider: 'razorpay', status: 'success' });
  });

  it('ignores a verifier registered under the wrong provider id', async () => {
    const registry: PaymentVerifierRegistry = { razorpay: dummyPaymentVerifier };
    expect(getPaymentVerifier('razorpay', registry)).toBeNull();
  });
});
