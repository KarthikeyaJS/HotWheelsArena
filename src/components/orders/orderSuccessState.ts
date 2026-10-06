/**
 * `location.state` handed from the checkout to the order-success page, so the celebration renders
 * instantly without a Firestore read. History state is untyped (and survives reloads and
 * sign-out / sign-in in the same tab), so it is validated — and must belong to the signed-in
 * collector — before use; anything else falls back to `useOrder(orderId)` (which the rules guard).
 */
import { BADGE_IDS, PAYMENT_METHODS } from '@shared/types';
import type { PaymentMethod, PlaceOrderResponse } from '@/types';
import type { OrderLineSummary } from './OrderLinesList';

export interface OrderSuccessTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface OrderSuccessState {
  /** The collector who placed the order — another signed-in user never sees this state. */
  uid: string;
  response: PlaceOrderResponse;
  items: OrderLineSummary[];
  totals: OrderSuccessTotals;
  paymentMethod: PaymentMethod;
  /** Set once the celebration played, so a reload keeps the data but skips the confetti. */
  celebrated?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);

function isResponse(value: unknown): value is PlaceOrderResponse {
  return (
    isRecord(value) &&
    typeof value.orderId === 'string' &&
    isNumber(value.xpEarned) &&
    isNumber(value.level) &&
    typeof value.leveledUp === 'boolean' &&
    isNumber(value.total) &&
    Array.isArray(value.badgesUnlocked) &&
    value.badgesUnlocked.every(
      (badge) => typeof badge === 'string' && (BADGE_IDS as readonly string[]).includes(badge),
    )
  );
}

function isLine(value: unknown): value is OrderLineSummary {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    typeof value.image === 'string' &&
    isNumber(value.price) &&
    isNumber(value.qty)
  );
}

function isTotals(value: unknown): value is OrderSuccessTotals {
  return (
    isRecord(value) &&
    isNumber(value.subtotal) &&
    isNumber(value.shipping) &&
    isNumber(value.tax) &&
    isNumber(value.total) &&
    isNumber(value.itemCount)
  );
}

/**
 * The success state when it is well-formed, belongs to `orderId` AND was saved for the signed-in
 * collector `uid` (null while signed out / auth is still loading → always null), else null.
 */
export function readOrderSuccessState(
  value: unknown,
  orderId: string,
  uid: string | null,
): OrderSuccessState | null {
  if (!isRecord(value) || !uid || value.uid !== uid) return null;
  const { response, items, totals, paymentMethod } = value;
  if (!isResponse(response) || response.orderId !== orderId) return null;
  if (!Array.isArray(items) || !items.every(isLine) || !isTotals(totals)) return null;
  if (!isPaymentMethod(paymentMethod)) return null;
  return { uid, response, items, totals, paymentMethod, celebrated: value.celebrated === true };
}
