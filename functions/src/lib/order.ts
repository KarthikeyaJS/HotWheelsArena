/**
 * Pure helpers for `placeOrder`: garage updates for purchased cars, order line snapshots,
 * address normalisation and the payment idempotency marker.
 */
import {
  type Address,
  type OrderItem,
  type PaymentProviderId,
  type PlaceOrderResponse,
} from '../../../shared/index.js';
import {
  clampGarageQuantity,
  readBadges,
  readBoolean,
  readNumber,
  readString,
  type GarageRecord,
  type RawData,
} from './firestoreData.js';
import type { PricedLine } from './pricing.js';

/** Functions-only collection holding one marker per verified payment (idempotency). */
export const PROCESSED_PAYMENTS_COLLECTION = 'processedPayments';

/* --------------------------------- Garage --------------------------------- */

export interface GaragePurchaseWrite {
  productId: string;
  /** True when the car was not parked yet (write a full new entry). */
  isNew: boolean;
  /** Quantity after the purchase. */
  quantity: number;
}

export interface GaragePurchaseResult {
  garage: Map<string, GarageRecord>;
  writes: GaragePurchaseWrite[];
}

/**
 * Parks purchased cars: new entries get `source: 'purchase'`, `isFavorite: false`; existing
 * entries keep `isFavorite` (and `addedAt`, which callers never overwrite), switch to
 * `source: 'purchase'` and have their quantity incremented (capped at MAX_GARAGE_QUANTITY).
 */
export function applyPurchaseToGarage(
  garage: ReadonlyMap<string, GarageRecord>,
  lines: ReadonlyArray<Pick<PricedLine, 'productId' | 'qty'>>,
): GaragePurchaseResult {
  const next = new Map(garage);
  const writes: GaragePurchaseWrite[] = [];
  for (const line of lines) {
    const existing = next.get(line.productId);
    const record: GarageRecord = existing
      ? {
          ...existing,
          source: 'purchase',
          quantity: clampGarageQuantity(existing.quantity + line.qty),
        }
      : {
          productId: line.productId,
          quantity: clampGarageQuantity(line.qty),
          isFavorite: false,
          source: 'purchase',
        };
    next.set(line.productId, record);
    writes.push({ productId: line.productId, isNew: !existing, quantity: record.quantity });
  }
  return { garage: next, writes };
}

/* --------------------------------- Orders --------------------------------- */

/** Line snapshots stored on the order document. */
export function toOrderItems(lines: readonly PricedLine[]): OrderItem[] {
  return lines.map((line) => ({
    productId: line.productId,
    slug: line.slug,
    name: line.name,
    price: line.price,
    qty: line.qty,
    image: line.image,
  }));
}

/** Stored address shape: optional lines are always strings (`''` when absent). */
export type StoredAddress = Required<Address>;

export function toStoredAddress(address: Address): StoredAddress {
  return {
    name: address.name.trim(),
    phone: address.phone.trim(),
    pincode: address.pincode.trim(),
    line1: address.line1.trim(),
    line2: (address.line2 ?? '').trim(),
    landmark: (address.landmark ?? '').trim(),
    city: address.city.trim(),
    state: address.state.trim(),
  };
}

/* ------------------------------- Idempotency ------------------------------- */

const SAFE_TRANSACTION_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Document id of the idempotency marker, `{provider}_{transactionId}`.
 * `null` when the transaction id contains characters that are unsafe in a document id.
 */
export function paymentMarkerId(provider: PaymentProviderId, transactionId: string): string | null {
  const id = transactionId.trim();
  return SAFE_TRANSACTION_ID.test(id) ? `${provider}_${id}` : null;
}

export interface ProcessedPaymentRecord extends PlaceOrderResponse {
  uid: string;
}

/** Reads a stored idempotency marker; `null` when it is malformed. */
export function readProcessedPayment(data: RawData | undefined): ProcessedPaymentRecord | null {
  if (!data) return null;
  const uid = readString(data.uid);
  const orderId = readString(data.orderId);
  if (!uid || !orderId) return null;
  return {
    uid,
    orderId,
    xpEarned: Math.max(0, Math.floor(readNumber(data.xpEarned))),
    badgesUnlocked: readBadges(data.badgesUnlocked),
    level: Math.max(1, Math.floor(readNumber(data.level, 1))),
    leveledUp: readBoolean(data.leveledUp),
    total: Math.max(0, readNumber(data.total)),
  };
}

/** Customer contact snapshot for the (future) admin site. */
export function customerSnapshot(input: { displayName?: string | null; email?: string | null }): {
  displayName: string;
  email: string;
} {
  return {
    displayName: (input.displayName ?? '').trim(),
    email: (input.email ?? '').trim().toLowerCase(),
  };
}
