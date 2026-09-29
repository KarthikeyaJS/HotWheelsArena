/**
 * Payment abstraction. A real gateway (e.g. Razorpay) is added by implementing this interface,
 * registering it in `src/config/payment.ts`, adding a server verifier in
 * `functions/src/payments/`, and switching `VITE_PAYMENT_PROVIDER`.
 */
import type {
  Currency,
  PaymentMethod,
  PaymentMode,
  PaymentProviderId,
  PaymentResult,
} from '@shared/types';

export type { PaymentMethod, PaymentMode, PaymentProviderId, PaymentResult };

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface PaymentRequest {
  /** Amount in rupees — must equal `computeOrderTotals(...).total`. */
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  customer: PaymentCustomer;
  /** Client-generated reference for idempotency / reconciliation (see `createPaymentReference`). */
  reference: string;
  /** Aborts the (simulated) processing, e.g. when the checkout unmounts. */
  signal?: AbortSignal;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Human label, e.g. "Test payments". */
  readonly label: string;
  readonly mode: PaymentMode;
  readonly supportedMethods: readonly PaymentMethod[];
  /**
   * Runs the payment and resolves with its result (`status: 'failed'` for declines).
   * Rejects only for programming errors or aborts (`PaymentAbortedError`).
   */
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
}

export class PaymentAbortedError extends Error {
  constructor(message = 'Payment was cancelled.') {
    super(message);
    this.name = 'PaymentAbortedError';
  }
}

/** `hwa_<time36>_<random>` reference for a checkout attempt. */
export function createPaymentReference(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `hwa_${Date.now().toString(36)}_${random}`;
}
