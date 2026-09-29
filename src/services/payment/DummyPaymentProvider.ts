/**
 * Test-mode payment provider: simulates ~2s of processing and approves ~90% of card/UPI
 * payments (COD always "succeeds"). Nothing real happens — no gateway, no money.
 */
import { PAYMENT_METHODS } from '@shared/types';
import type { PaymentResult } from '@shared/types';
import { PaymentAbortedError, type PaymentProvider, type PaymentRequest } from './PaymentProvider';

export interface DummyPaymentOptions {
  /** Simulated processing time in ms (default 2000). */
  processingMs?: number;
  /** Probability 0–1 that a card/UPI payment succeeds (default 0.9). */
  successRate?: number;
  /** Injectable RNG for tests (default Math.random). */
  random?: () => number;
}

/** `test_` + 20 lowercase hex characters (matches `DUMMY_TRANSACTION_ID_REGEX`). */
export function generateTestTransactionId(): string {
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return `test_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PaymentAbortedError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new PaymentAbortedError());
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class DummyPaymentProvider implements PaymentProvider {
  readonly id = 'dummy' as const;
  readonly label = 'Test payments';
  readonly mode = 'test' as const;
  readonly supportedMethods = PAYMENT_METHODS;

  private readonly processingMs: number;
  private readonly successRate: number;
  private readonly random: () => number;

  constructor(options: DummyPaymentOptions = {}) {
    this.processingMs = Math.max(0, options.processingMs ?? 2000);
    this.successRate = Math.min(1, Math.max(0, options.successRate ?? 0.9));
    this.random = options.random ?? Math.random;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (!Number.isFinite(request.amount) || request.amount <= 0) {
      throw new Error('Payment amount must be a positive number.');
    }
    if (!this.supportedMethods.includes(request.method)) {
      throw new Error(`Unsupported payment method: ${request.method}`);
    }

    await wait(this.processingMs, request.signal);

    const isCod = request.method === 'cod';
    const approved = isCod || this.random() < this.successRate;

    return {
      provider: this.id,
      status: approved ? 'success' : 'failed',
      transactionId: generateTestTransactionId(),
      mode: this.mode,
      method: request.method,
      amount: request.amount,
      message: approved
        ? isCod
          ? 'Cash on delivery confirmed (test mode).'
          : 'Payment approved (test mode).'
        : 'Payment declined by the test bank. Try again or pick another method.',
    };
  }
}
