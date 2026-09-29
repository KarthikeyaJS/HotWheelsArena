/**
 * Pure planning for `placeOrder`.
 *
 * The callable reads everything inside one Firestore transaction (idempotency marker, settings,
 * products, profile, full garage, active series), prices the order (`priceOrder`), verifies the
 * payment (`verifyPayment`) and then hands the results to `buildOrderPlan`, which computes every
 * document the transaction writes plus the callable response. No I/O happens here, so the whole
 * order → garage → stats → badges → XP → level pipeline is unit-tested.
 *
 * All totals come from the shared `computeOrderTotals` (via `priceOrder`), XP from the shared
 * `computeOrderXp` + badge rewards, stats from the shared `computeGarageStats` (via
 * `computeUserStats`) — the same rules the web client uses for display.
 */
import {
  computeOrderXp,
  type Address,
  type BadgeId,
  type Currency,
  type OrderItem,
  type PaymentMethod,
  type PaymentMode,
  type PaymentProviderId,
  type PlaceOrderResponse,
  type UserStats,
} from '../../../shared/index.js';
import type { OrderPaymentStatus, VerifiedPayment } from '../payments/types.js';
import { AppError } from './errors.js';
import {
  readProfileState,
  readString,
  type GarageRecord,
  type ProductRecord,
  type RawData,
  type SeriesRecord,
  type ServerSettings,
} from './firestoreData.js';
import {
  applyPurchaseToGarage,
  customerSnapshot,
  readProcessedPayment,
  toOrderItems,
  toStoredAddress,
  type StoredAddress,
} from './order.js';
import type { PricedOrder } from './pricing.js';
import {
  buildProfileDoc,
  profileBackfill,
  type ProfileDoc,
  type ProfileProgressFields,
  type ProfileSeed,
} from './profile.js';
import { computeProgression } from './progression.js';
import { computeUserStats, type StatsProduct } from './stats.js';

/* --------------------------------- Checks --------------------------------- */

export const COD_UNAVAILABLE_MESSAGE =
  "Cash on delivery isn't available right now — please pay by card or UPI.";

export const PAYMENT_ALREADY_USED_MESSAGE =
  'This payment has already been used for another order. Please start a new payment.';

/** @throws AppError('failed-precondition') when COD is chosen but disabled in `settings/site`. */
export function assertPaymentMethodAvailable(
  method: PaymentMethod,
  settings: Pick<ServerSettings, 'codEnabled'>,
): void {
  if (method === 'cod' && !settings.codEnabled) {
    throw new AppError('failed-precondition', COD_UNAVAILABLE_MESSAGE, { reason: 'cod-disabled' });
  }
}

/**
 * Idempotency: when a marker for this payment already exists, the order was placed before —
 * return its original result instead of creating a second order.
 *
 * @returns `null` when the payment has not been processed yet.
 * @throws AppError('failed-precondition') when the marker belongs to another collector or is corrupt.
 */
export function resolveReplay(
  markerData: RawData | undefined,
  uid: string,
): PlaceOrderResponse | null {
  if (markerData === undefined) return null;
  const record = readProcessedPayment(markerData);
  if (!record || record.uid !== uid) {
    throw new AppError('failed-precondition', PAYMENT_ALREADY_USED_MESSAGE, {
      reason: record ? 'payment-owned-by-another-user' : 'corrupt-payment-marker',
    });
  }
  return {
    orderId: record.orderId,
    xpEarned: record.xpEarned,
    badgesUnlocked: record.badgesUnlocked,
    level: record.level,
    leveledUp: record.leveledUp,
    total: record.total,
  };
}

/* -------------------------------- Documents ------------------------------- */

export interface OrderPaymentDoc {
  provider: PaymentProviderId;
  /** `paid` for card / UPI, `pending` for cash on delivery. */
  status: OrderPaymentStatus;
  transactionId: string;
  mode: PaymentMode;
  method: PaymentMethod;
}

export interface OrderCustomerDoc {
  displayName: string;
  email: string;
}

/** `orders/{orderId}` as written by `placeOrder`. */
export interface OrderDoc<T> {
  uid: string;
  items: OrderItem[];
  /** Product ids of the order lines (lets admin tooling query orders by car). */
  productIds: string[];
  /** Units across all lines. */
  itemCount: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: Currency;
  address: StoredAddress;
  status: 'placed';
  payment: OrderPaymentDoc;
  paymentMethod: PaymentMethod;
  xpEarned: number;
  badgesUnlocked: BadgeId[];
  /** Contact snapshot for the future admin site. */
  customer: OrderCustomerDoc;
  createdAt: T;
  updatedAt: T;
}

/** A car parked in the garage for the first time by a purchase (same keys as a manual entry). */
export interface PurchasedGarageEntryDoc<T> {
  productId: string;
  addedAt: T;
  source: 'purchase';
  isFavorite: boolean;
  quantity: number;
}

/**
 * Repeat purchase of a car already in the garage: `addedAt` and `isFavorite` are kept.
 * A type alias (not an interface) so it satisfies Firestore's indexable `UpdateData` type.
 */
export type GarageEntryPurchasePatch = {
  quantity: number;
  source: 'purchase';
};

export type GarageWrite<T> =
  | { kind: 'create'; productId: string; data: PurchasedGarageEntryDoc<T> }
  | { kind: 'update'; productId: string; data: GarageEntryPurchasePatch };

export type ProfileWrite<T> =
  | { kind: 'create'; data: ProfileDoc<T> }
  | { kind: 'update'; data: Partial<ProfileDoc<T>> & ProfileProgressFields<T> };

/** `processedPayments/{provider}_{transactionId}` — the idempotency marker. */
export interface PaymentMarkerDoc<T> extends PlaceOrderResponse {
  uid: string;
  provider: PaymentProviderId;
  transactionId: string;
  createdAt: T;
}

/* ---------------------------------- Plan ---------------------------------- */

export interface OrderPlanInput<T> {
  uid: string;
  orderId: string;
  /** Output of `priceOrder` (server prices + shared totals). */
  priced: PricedOrder;
  /** Output of `verifyPayment` (amount already matched against `priced.totals.total`). */
  payment: VerifiedPayment;
  address: Address;
  /** Caller identity from the verified ID token (profile creation / backfill, customer snapshot). */
  caller: ProfileSeed;
  /** Raw `users/{uid}` data; `undefined` when the profile does not exist yet. */
  profileData: RawData | undefined;
  /** Full garage BEFORE this purchase. */
  garage: ReadonlyMap<string, GarageRecord>;
  /** Category / rarity of every garage product (missing product documents → `null`). */
  products: ReadonlyMap<string, ProductRecord | null>;
  /** Active series, for `seriesCompleted`. */
  series: readonly SeriesRecord[];
  /** Value written to createdAt / updatedAt / addedAt — `FieldValue.serverTimestamp()` in production. */
  timestamp: T;
}

export interface OrderPlan<T> {
  order: OrderDoc<T>;
  garageWrites: GarageWrite<T>[];
  profile: ProfileWrite<T>;
  marker: PaymentMarkerDoc<T>;
  response: PlaceOrderResponse;
  /** Stats after the order. */
  stats: UserStats;
}

export function buildOrderPlan<T>(input: OrderPlanInput<T>): OrderPlan<T> {
  const { uid, orderId, priced, payment, timestamp } = input;
  const { lines, totals } = priced;
  const seed: ProfileSeed = { ...input.caller, uid };

  // 1. Park the purchased cars.
  const { garage, writes } = applyPurchaseToGarage(input.garage, lines);

  // 2. Recompute stats from the FULL garage. The priced lines are the freshest facts for the
  //    purchased cars; every other car uses its product document.
  const facts = new Map<string, StatsProduct>(input.products);
  for (const line of lines) {
    facts.set(line.productId, { category: line.category, rarity: line.rarity });
  }
  const profile = readProfileState(input.profileData);
  const stats = computeUserStats(garage.values(), facts, input.series, profile.stats, {
    ordersPlaced: 1,
    totalSpent: totals.total,
  });

  // 3. Order XP + rewards for badges unlocked by the new stats (never re-awarded).
  const progression = computeProgression({
    xp: profile.xp,
    badges: profile.badges,
    stats,
    baseXp: computeOrderXp(lines.map((line) => ({ qty: line.qty, rarity: line.rarity }))),
  });

  const response: PlaceOrderResponse = {
    orderId,
    xpEarned: progression.xpEarned,
    badgesUnlocked: progression.badgesUnlocked,
    level: progression.level,
    leveledUp: progression.leveledUp,
    total: totals.total,
  };

  const items = toOrderItems(lines);
  const order: OrderDoc<T> = {
    uid,
    items,
    productIds: items.map((item) => item.productId),
    itemCount: totals.itemCount,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    tax: totals.tax,
    total: totals.total,
    currency: 'INR',
    address: toStoredAddress(input.address),
    status: 'placed',
    payment: {
      provider: payment.provider,
      status: payment.status,
      transactionId: payment.transactionId,
      mode: payment.mode,
      method: payment.method,
    },
    paymentMethod: payment.method,
    xpEarned: progression.xpEarned,
    badgesUnlocked: progression.badgesUnlocked,
    customer: customerSnapshot({
      displayName: seed.displayName ?? readString(input.profileData?.displayName),
      email: seed.email ?? readString(input.profileData?.email),
    }),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const garageWrites = writes.map((write): GarageWrite<T> => {
    if (write.isNew) {
      const record = garage.get(write.productId);
      return {
        kind: 'create',
        productId: write.productId,
        data: {
          productId: write.productId,
          addedAt: timestamp,
          source: 'purchase',
          isFavorite: record?.isFavorite ?? false,
          quantity: write.quantity,
        },
      };
    }
    return {
      kind: 'update',
      productId: write.productId,
      data: { quantity: write.quantity, source: 'purchase' },
    };
  });

  const progress: ProfileProgressFields<T> = {
    xp: progression.xp,
    level: progression.level,
    badges: progression.badges,
    stats,
    updatedAt: timestamp,
  };
  const profileWrite: ProfileWrite<T> =
    input.profileData === undefined
      ? { kind: 'create', data: { ...buildProfileDoc(seed, timestamp), ...progress } }
      : {
          kind: 'update',
          data: { ...(profileBackfill(input.profileData, seed, timestamp) ?? {}), ...progress },
        };

  const marker: PaymentMarkerDoc<T> = {
    ...response,
    uid,
    provider: payment.provider,
    transactionId: payment.transactionId,
    createdAt: timestamp,
  };

  return { order, garageWrites, profile: profileWrite, marker, response, stats };
}
