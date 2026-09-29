/**
 * Server-side payment verification contracts.
 *
 * The web client charges through a `PaymentProvider` (src/services/payment) and sends the
 * resulting `PaymentResult` to `placeOrder`. The server never trusts it: the verifier registered
 * for `payment.provider` re-checks it and confirms the charged amount equals the server-computed
 * order total. Adding a real gateway (e.g. Razorpay) = one new verifier file + one registry entry.
 */
import type {
  PaymentMethod,
  PaymentMode,
  PaymentProviderId,
  PaymentResult,
} from '../../../shared/index.js';

/** Payment state stored on the order: captured online, or collected on delivery (COD). */
export type OrderPaymentStatus = 'paid' | 'pending';

export interface PaymentVerificationContext {
  /** Server-computed order total in rupees (shared `computeOrderTotals`). */
  expectedAmount: number;
  currency: 'INR';
  /** Caller uid — for gateways that bind a payment to a customer / order reference. */
  uid: string;
  /** `ALLOW_TEST_PAYMENTS`: whether test-mode payments may create orders. */
  allowTestPayments: boolean;
}

export interface VerifiedPayment {
  provider: PaymentProviderId;
  transactionId: string;
  mode: PaymentMode;
  method: PaymentMethod;
  /** Amount confirmed by the provider (₹). */
  amount: number;
  status: OrderPaymentStatus;
}

export interface PaymentVerifier {
  readonly provider: PaymentProviderId;
  /**
   * Resolves with the verified payment, or rejects with an `AppError` carrying a user-facing
   * message (declined, amount mismatch, test mode disabled, forged / malformed payment…).
   */
  verify(payment: PaymentResult, context: PaymentVerificationContext): Promise<VerifiedPayment>;
}
