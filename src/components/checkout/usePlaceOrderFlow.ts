import { useCallback, useEffect, useRef, useState } from 'react';
import { toOrderItems } from '@/components/cart/reconcile';
import { usePlaceOrder } from '@/hooks/useOrders';
import {
  PaymentAbortedError,
  createPaymentReference,
  getPaymentProvider,
  type PaymentCustomer,
} from '@/services/payment';
import type {
  Address,
  CartItem,
  PaymentMethod,
  PaymentResult,
  PlaceOrderResponse,
} from '@/types';
import { classifyPlaceOrderError, type PlaceOrderErrorKind } from './checkoutErrors';

/**
 * `idle` → `paying` (test bank, ~2s) → `confirming` (placeOrder callable) → success callback.
 * `declined` = the (test) payment failed; `error` = placeOrder failed (see `errorKind`).
 */
export type PlaceOrderPhase = 'idle' | 'paying' | 'confirming' | 'declined' | 'error' | 'done';

export interface PlaceOrderInput {
  lines: readonly CartItem[];
  address: Address;
  method: PaymentMethod;
  /** `computeOrderTotals(lines, settings).total` — the amount to charge. */
  amount: number;
  customer: PaymentCustomer;
}

export interface PlaceOrderFlowCallbacks {
  onSuccess: (response: PlaceOrderResponse, input: PlaceOrderInput) => void;
  /** The server refused the order because something changed (prices / stock / COD…). */
  onOrderChanged?: (message: string) => void | Promise<void>;
  onUnauthenticated?: () => void;
}

export interface PlaceOrderFlow {
  phase: PlaceOrderPhase;
  /** Message for `declined` / `error`. */
  message: string | null;
  errorKind: PlaceOrderErrorKind | null;
  /** A successful payment is being held for a retry (no second charge). */
  hasHeldPayment: boolean;
  isBusy: boolean;
  placeOrder: (input: PlaceOrderInput) => Promise<void>;
  /** Back to idle (e.g. "pick another method"). */
  reset: () => void;
}

interface HeldPayment {
  signature: string;
  result: PaymentResult;
}

/** Identifies an attempt: same method, amount and lines → the held payment can be reused. */
export function paymentSignature(input: PlaceOrderInput): string {
  const lines = input.lines
    .map((line) => `${line.productId}:${line.qty}:${line.price}`)
    .sort()
    .join(',');
  return `${input.method}|${input.amount}|${lines}`;
}

/**
 * Runs the dummy payment + `placeOrder` with double-submit protection, idempotent retries (a held
 * successful payment is reused after network / auth failures) and friendly failure states.
 */
export function usePlaceOrderFlow({
  onSuccess,
  onOrderChanged,
  onUnauthenticated,
}: PlaceOrderFlowCallbacks): PlaceOrderFlow {
  const mutation = usePlaceOrder();
  const { mutateAsync } = mutation;
  const [phase, setPhase] = useState<PlaceOrderPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<PlaceOrderErrorKind | null>(null);
  const [hasHeldPayment, setHasHeldPayment] = useState(false);
  const busyRef = useRef(false);
  const heldPaymentRef = useRef<HeldPayment | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const callbacksRef = useRef({ onSuccess, onOrderChanged, onUnauthenticated });

  useEffect(() => {
    callbacksRef.current = { onSuccess, onOrderChanged, onUnauthenticated };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const holdPayment = useCallback((held: HeldPayment | null) => {
    heldPaymentRef.current = held;
    setHasHeldPayment(held !== null);
  }, []);

  const placeOrder = useCallback(
    async (input: PlaceOrderInput) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setMessage(null);
      setErrorKind(null);

      try {
        const signature = paymentSignature(input);
        let payment =
          heldPaymentRef.current?.signature === signature ? heldPaymentRef.current.result : null;

        if (!payment) {
          holdPayment(null);
          setPhase('paying');
          const controller = new AbortController();
          abortRef.current = controller;
          const result = await getPaymentProvider().createPayment({
            amount: input.amount,
            currency: 'INR',
            method: input.method,
            customer: input.customer,
            reference: createPaymentReference(),
            signal: controller.signal,
          });
          abortRef.current = null;
          if (!mountedRef.current) return;
          if (result.status !== 'success') {
            setPhase('declined');
            setMessage(
              result.message ??
                'Payment declined in test mode — try again or pick another method.',
            );
            return;
          }
          payment = result;
          holdPayment({ signature, result });
        }

        setPhase('confirming');
        const response = await mutateAsync({
          items: toOrderItems(input.lines),
          address: input.address,
          payment,
        });
        holdPayment(null);
        if (!mountedRef.current) return;
        setPhase('done');
        callbacksRef.current.onSuccess(response, input);
      } catch (error) {
        if (error instanceof PaymentAbortedError || !mountedRef.current) return;
        const info = classifyPlaceOrderError(error);
        if (!info.keepPayment) holdPayment(null);
        setErrorKind(info.kind);
        setMessage(info.message);
        setPhase(info.kind === 'order-changed' ? 'idle' : 'error');
        if (info.kind === 'order-changed') {
          await callbacksRef.current.onOrderChanged?.(info.message);
        } else if (info.kind === 'unauthenticated') {
          callbacksRef.current.onUnauthenticated?.();
        }
      } finally {
        busyRef.current = false;
      }
    },
    [holdPayment, mutateAsync],
  );

  const reset = useCallback(() => {
    setPhase('idle');
    setMessage(null);
    setErrorKind(null);
  }, []);

  return {
    phase,
    message,
    errorKind,
    hasHeldPayment,
    isBusy: phase === 'paying' || phase === 'confirming' || phase === 'done',
    placeOrder,
    reset,
  };
}
