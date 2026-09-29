/**
 * Payment verifier registry, keyed by `PaymentProviderId`.
 *
 * To accept a real gateway later (e.g. Razorpay):
 *   1. add `src/payments/razorpay.ts` exporting a `PaymentVerifier` with `provider: 'razorpay'`
 *      (verify the gateway signature / fetch the payment, return a `VerifiedPayment`);
 *   2. register it below: `razorpay: razorpayPaymentVerifier`;
 *   3. set `ALLOW_TEST_PAYMENTS=false` for the production project.
 * Nothing else in `placeOrder` changes.
 */
import type { PaymentProviderId, PaymentResult } from '../../../shared/index.js';
import { AppError } from '../lib/errors.js';
import { assertAmountMatches } from './amount.js';
import { PAYMENT_UNVERIFIED_MESSAGE, dummyPaymentVerifier } from './dummy.js';
import type { PaymentVerificationContext, PaymentVerifier, VerifiedPayment } from './types.js';

export type PaymentVerifierRegistry = Readonly<Partial<Record<PaymentProviderId, PaymentVerifier>>>;

/** Every payment provider the server currently accepts. */
export const PAYMENT_VERIFIERS: PaymentVerifierRegistry = {
  dummy: dummyPaymentVerifier,
};

export const PROVIDER_UNAVAILABLE_MESSAGE =
  "That payment option isn't available yet — please choose another way to pay.";

/** The verifier registered for `provider`, or `null` when the provider is not supported. */
export function getPaymentVerifier(
  provider: PaymentProviderId,
  registry: PaymentVerifierRegistry = PAYMENT_VERIFIERS,
): PaymentVerifier | null {
  const verifier = registry[provider];
  return verifier && verifier.provider === provider ? verifier : null;
}

/**
 * Verifies a client-reported payment with the provider's verifier and re-checks, whatever the
 * provider, that the confirmed amount equals the server total (defence in depth).
 *
 * @throws AppError('failed-precondition') with a user-facing message when the payment is rejected.
 */
export async function verifyPayment(
  payment: PaymentResult,
  context: PaymentVerificationContext,
  registry: PaymentVerifierRegistry = PAYMENT_VERIFIERS,
): Promise<VerifiedPayment> {
  const verifier = getPaymentVerifier(payment.provider, registry);
  if (!verifier) {
    throw new AppError('failed-precondition', PROVIDER_UNAVAILABLE_MESSAGE, {
      reason: 'unsupported-provider',
      provider: payment.provider,
    });
  }
  const verified = await verifier.verify(payment, context);
  if (verified.provider !== payment.provider || verified.transactionId !== payment.transactionId) {
    throw new AppError('failed-precondition', PAYMENT_UNVERIFIED_MESSAGE, {
      reason: 'verifier-mismatch',
      provider: payment.provider,
    });
  }
  assertAmountMatches(verified.amount, context.expectedAmount);
  return verified;
}
