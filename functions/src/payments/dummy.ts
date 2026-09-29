/**
 * Verifier for the web app's `DummyPaymentProvider` (TEST MODE — no money moves).
 *
 * Accepts a payment only when test payments are allowed (`ALLOW_TEST_PAYMENTS`, default true),
 * it succeeded, it is in `test` mode, its transaction id has the dummy format
 * (`test_` + 20 lowercase hex) and the charged amount equals the server total. Cash on delivery
 * is recorded as `pending`; card / UPI as `paid`.
 */
import { DUMMY_TRANSACTION_ID_REGEX } from '../../../shared/index.js';
import { AppError } from '../lib/errors.js';
import { assertAmountMatches } from './amount.js';
import type { PaymentVerifier, VerifiedPayment } from './types.js';

export const TEST_PAYMENTS_DISABLED_MESSAGE =
  'Test-mode payments are switched off in this garage. Please choose another way to pay.';
export const PAYMENT_DECLINED_MESSAGE =
  "Your payment didn't go through and nothing was charged. Your pit stop is saved — please try again.";
export const PAYMENT_UNVERIFIED_MESSAGE =
  "We couldn't verify that payment. Please try paying again.";

export const dummyPaymentVerifier: PaymentVerifier = {
  provider: 'dummy',

  async verify(payment, context): Promise<VerifiedPayment> {
    if (payment.provider !== 'dummy') {
      throw new AppError('failed-precondition', PAYMENT_UNVERIFIED_MESSAGE, {
        reason: 'provider-mismatch',
        provider: payment.provider,
      });
    }
    if (!context.allowTestPayments) {
      throw new AppError('failed-precondition', TEST_PAYMENTS_DISABLED_MESSAGE, {
        reason: 'test-payments-disabled',
      });
    }
    if (payment.status !== 'success') {
      throw new AppError('failed-precondition', PAYMENT_DECLINED_MESSAGE, { reason: 'declined' });
    }
    if (payment.mode !== 'test') {
      throw new AppError('failed-precondition', PAYMENT_UNVERIFIED_MESSAGE, {
        reason: 'unexpected-mode',
        mode: payment.mode,
      });
    }
    if (!DUMMY_TRANSACTION_ID_REGEX.test(payment.transactionId)) {
      throw new AppError('failed-precondition', PAYMENT_UNVERIFIED_MESSAGE, {
        reason: 'malformed-transaction-id',
      });
    }
    assertAmountMatches(payment.amount, context.expectedAmount);

    return {
      provider: 'dummy',
      transactionId: payment.transactionId,
      mode: 'test',
      method: payment.method,
      amount: context.expectedAmount,
      status: payment.method === 'cod' ? 'pending' : 'paid',
    };
  },
};
