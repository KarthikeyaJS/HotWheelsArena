/**
 * `placeOrder` (callable) — the only way an order, purchased garage cars, XP, badges and
 * collector stats are ever written.
 *
 * One Firestore transaction:
 *  1. idempotency — `processedPayments/{provider}_{transactionId}`; a replay returns the original
 *     result instead of creating a second order;
 *  2. reads `settings/site` (fallback `DEFAULT_SITE_SETTINGS`), every ordered product, the
 *     profile, the FULL garage, the active series and every garage product;
 *  3. validates availability / stock (never decremented) / quantity caps and prices every line
 *     with SERVER prices through the shared `computeOrderTotals`;
 *  4. verifies the payment with the registered verifier — the charged amount must equal the
 *     server total ("Prices changed — review your pit stop." otherwise);
 *  5. writes the order, the purchased garage entries, the profile (xp / level / badges / stats)
 *     and the idempotency marker atomically.
 *
 * Request: `PlaceOrderRequest`. Response: `PlaceOrderResponse`.
 * Errors: unauthenticated · invalid-argument · failed-precondition · out-of-range · aborted.
 */
import * as logger from 'firebase-functions/logger';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import {
  CALLABLES,
  PlaceOrderRequestSchema,
  type PlaceOrderRequest,
  type PlaceOrderResponse,
} from '../../../shared/index.js';
import { db, serverTimestamp } from '../admin.js';
import { PLACE_ORDER_TIMEOUT_SECONDS, REGION } from '../config.js';
import { parseInput, requireAuth, withErrorHandling, type ParseOptions } from '../lib/callable.js';
import { allowTestPayments } from '../lib/env.js';
import { AppError } from '../lib/errors.js';
import { readSiteSettings } from '../lib/firestoreData.js';
import { paymentMarkerId } from '../lib/order.js';
import { assertPaymentMethodAvailable, buildOrderPlan, resolveReplay } from '../lib/orderPlan.js';
import { priceOrder } from '../lib/pricing.js';
import { PAYMENT_UNVERIFIED_MESSAGE, verifyPayment } from '../payments/index.js';
import {
  dataOf,
  garageCollection,
  ordersCollection,
  processedPaymentRef,
  readCollectorState,
  siteSettingsRef,
  userRef,
} from '../refs.js';

const PARSE_OPTIONS: ParseOptions = {
  fallbackMessage: "We couldn't read your order. Refresh the page and try again.",
  fieldMessages: {
    items: 'Your pit stop looks out of date. Refresh the page and try again.',
    address: 'Check your delivery address and try again.',
    payment: "We couldn't read the payment details. Please try paying again.",
  },
};

export async function handlePlaceOrder(
  request: CallableRequest<unknown>,
): Promise<PlaceOrderResponse> {
  const caller = requireAuth(request.auth);
  const input: PlaceOrderRequest = parseInput(PlaceOrderRequestSchema, request.data, PARSE_OPTIONS);

  const markerId = paymentMarkerId(input.payment.provider, input.payment.transactionId);
  if (!markerId) {
    throw new AppError('invalid-argument', PAYMENT_UNVERIFIED_MESSAGE, {
      reason: 'unsafe-transaction-id',
    });
  }
  const testPaymentsAllowed = allowTestPayments();
  const orderedIds = input.items.map((item) => item.productId);

  const outcome = await db.runTransaction(async (transaction) => {
    // 1. Idempotency: the same payment never creates two orders.
    const markerRef = processedPaymentRef(markerId);
    const replay = resolveReplay(dataOf(await transaction.get(markerRef)), caller.uid);
    if (replay) return { response: replay, replayed: true };

    // 2. Everything the order depends on, read inside the transaction.
    const [settingsSnapshot, state] = await Promise.all([
      transaction.get(siteSettingsRef()),
      readCollectorState(transaction, caller.uid, orderedIds),
    ]);
    const settings = readSiteSettings(dataOf(settingsSnapshot));

    // 3. Server prices, availability, stock and quantity caps → shared totals.
    const priced = priceOrder(input.items, state.products, settings);

    // 4. Payment must be genuine, allowed and for exactly the server total.
    assertPaymentMethodAvailable(input.payment.method, settings);
    const payment = await verifyPayment(input.payment, {
      expectedAmount: priced.totals.total,
      currency: 'INR',
      uid: caller.uid,
      allowTestPayments: testPaymentsAllowed,
    });

    // 5. Plan + write atomically.
    const orderRef = ordersCollection().doc();
    const plan = buildOrderPlan({
      uid: caller.uid,
      orderId: orderRef.id,
      priced,
      payment,
      address: input.address,
      caller,
      profileData: state.profileData,
      garage: state.garage,
      products: state.products,
      series: state.series,
      timestamp: serverTimestamp(),
    });

    transaction.create(orderRef, plan.order);
    const garage = garageCollection(caller.uid);
    for (const write of plan.garageWrites) {
      const entryRef = garage.doc(write.productId);
      if (write.kind === 'create') transaction.create(entryRef, write.data);
      else transaction.update(entryRef, write.data);
    }
    const profileRef = userRef(caller.uid);
    if (plan.profile.kind === 'create') transaction.create(profileRef, plan.profile.data);
    else transaction.update(profileRef, plan.profile.data);
    transaction.create(markerRef, plan.marker);

    return { response: plan.response, replayed: false };
  });

  const { response } = outcome;
  if (outcome.replayed) {
    logger.info('placeOrder: payment already processed, returning the original order', {
      uid: caller.uid,
      orderId: response.orderId,
    });
  } else {
    logger.info('placeOrder: order placed', {
      uid: caller.uid,
      orderId: response.orderId,
      total: response.total,
      lines: input.items.length,
      provider: input.payment.provider,
      method: input.payment.method,
      xpEarned: response.xpEarned,
      badgesUnlocked: response.badgesUnlocked,
      level: response.level,
    });
  }
  return response;
}

export const placeOrder = onCall<unknown, Promise<PlaceOrderResponse>>(
  { region: REGION, timeoutSeconds: PLACE_ORDER_TIMEOUT_SECONDS },
  withErrorHandling(CALLABLES.placeOrder, handlePlaceOrder),
);
