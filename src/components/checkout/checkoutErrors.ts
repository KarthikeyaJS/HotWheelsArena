/**
 * Classifies `placeOrder` failures (pure) so the checkout can react correctly:
 * - `order-changed`: the server re-priced / re-checked the order and refused it (prices or stock
 *   changed, COD switched off, payment not verifiable) → refresh data, back to review, new payment.
 * - `unauthenticated`: the pit pass expired → sign in again, then retry with the same payment.
 * - `network`: we never got an answer → retry with the SAME payment (the server treats a repeated
 *   payment from the same collector idempotently and returns the original order).
 */
import { getErrorCode, getFriendlyErrorMessage } from '@/lib/errors';

export type PlaceOrderErrorKind = 'order-changed' | 'unauthenticated' | 'network' | 'unknown';

export interface PlaceOrderErrorInfo {
  kind: PlaceOrderErrorKind;
  /** User-facing message (server messages are shown verbatim for order changes). */
  message: string;
  /** Keep the successful test payment for the retry (never charge twice). */
  keepPayment: boolean;
}

const ORDER_CHANGED_CODES = new Set(['failed-precondition', 'out-of-range', 'invalid-argument']);
const NETWORK_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'internal',
  'unknown',
  'aborted',
  'resource-exhausted',
  'cancelled',
]);

export const NETWORK_ERROR_MESSAGE =
  "We couldn't reach the pit crew to confirm your order. Your test payment is safe — confirm again and we'll pick up where we left off.";
export const UNAUTHENTICATED_MESSAGE =
  'Your pit pass expired. Sign in again to finish placing your order.';
export const ORDER_CHANGED_FALLBACK =
  'Something in your pit stop changed. Review the updated order and place it again.';

function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return error instanceof TypeError && /fetch|network/i.test(error.message);
}

export function classifyPlaceOrderError(error: unknown): PlaceOrderErrorInfo {
  const code = getErrorCode(error);
  if (code && ORDER_CHANGED_CODES.has(code)) {
    return {
      kind: 'order-changed',
      message: getFriendlyErrorMessage(error, ORDER_CHANGED_FALLBACK),
      keepPayment: false,
    };
  }
  if (code === 'unauthenticated') {
    return { kind: 'unauthenticated', message: UNAUTHENTICATED_MESSAGE, keepPayment: true };
  }
  if ((code && NETWORK_CODES.has(code)) || isNetworkFailure(error)) {
    return { kind: 'network', message: NETWORK_ERROR_MESSAGE, keepPayment: true };
  }
  return {
    kind: 'unknown',
    message: getFriendlyErrorMessage(error),
    keepPayment: true,
  };
}
