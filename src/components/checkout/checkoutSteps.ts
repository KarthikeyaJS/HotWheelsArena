/**
 * Checkout step model (pure): Address → Payment → Review. The active step lives in the URL
 * (`?step=payment`); a step is only reachable when every step before it is complete, so deep
 * links and reloads fall back to the first incomplete step.
 */
import { AddressSchema } from '@shared/schemas';
import { PAYMENT_METHODS } from '@shared/types';
import type { Address, PaymentMethod } from '@/types';

export const CHECKOUT_STEPS = ['address', 'payment', 'review'] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const CHECKOUT_STEP_PARAM = 'step';

export interface CheckoutStepMeta {
  /** Stepper label. */
  label: string;
  /** HUD caption, e.g. `LAP 01`. */
  lap: string;
  /** Step heading. */
  title: string;
  description: string;
}

export const CHECKOUT_STEP_META: Readonly<Record<CheckoutStep, CheckoutStepMeta>> = {
  address: {
    label: 'Address',
    lap: 'LAP 01',
    title: 'Delivery address',
    description: 'Where should the pit crew deliver your cars?',
  },
  payment: {
    label: 'Payment',
    lap: 'LAP 02',
    title: 'Payment method',
    description: 'Pick how you want to pay. Test mode — nothing is charged.',
  },
  review: {
    label: 'Review',
    lap: 'LAP 03',
    title: 'Review & place order',
    description: 'One last look before the chequered flag.',
  },
};

export interface CheckoutProgress {
  address: Address | null;
  method: PaymentMethod | null;
}

export function isCheckoutStep(value: string | null | undefined): value is CheckoutStep {
  return (CHECKOUT_STEPS as readonly string[]).includes(value ?? '');
}

/** URL value → step (unknown / missing → `address`). */
export function parseCheckoutStep(value: string | null | undefined): CheckoutStep {
  return isCheckoutStep(value) ? value : 'address';
}

export function stepIndex(step: CheckoutStep): number {
  return CHECKOUT_STEPS.indexOf(step);
}

/** Methods offered at checkout: supported by the provider, COD only when enabled in settings. */
export function availablePaymentMethods(
  supported: readonly PaymentMethod[],
  codEnabled: boolean,
): PaymentMethod[] {
  return PAYMENT_METHODS.filter(
    (method) => supported.includes(method) && (method !== 'cod' || codEnabled),
  );
}

export function isAddressComplete(address: Address | null): boolean {
  return address !== null && AddressSchema.safeParse(address).success;
}

/** Whether `step` has everything it needs (review is never "complete" — it is the finish). */
export function isStepComplete(
  step: CheckoutStep,
  progress: CheckoutProgress,
  methods: readonly PaymentMethod[],
): boolean {
  switch (step) {
    case 'address':
      return isAddressComplete(progress.address);
    case 'payment':
      return progress.method !== null && methods.includes(progress.method);
    case 'review':
      return false;
    default:
      return false;
  }
}

/** First step that still needs input (`review` when address + payment are done). */
export function firstIncompleteStep(
  progress: CheckoutProgress,
  methods: readonly PaymentMethod[],
): CheckoutStep {
  return CHECKOUT_STEPS.find((step) => !isStepComplete(step, progress, methods)) ?? 'review';
}

/** A step is reachable when every earlier step is complete. */
export function canAccessStep(
  step: CheckoutStep,
  progress: CheckoutProgress,
  methods: readonly PaymentMethod[],
): boolean {
  return CHECKOUT_STEPS.slice(0, stepIndex(step)).every((earlier) =>
    isStepComplete(earlier, progress, methods),
  );
}

/** The step to render for a requested URL step (falls back to the first incomplete step). */
export function resolveCheckoutStep(
  requested: CheckoutStep,
  progress: CheckoutProgress,
  methods: readonly PaymentMethod[],
): CheckoutStep {
  return canAccessStep(requested, progress, methods)
    ? requested
    : firstIncompleteStep(progress, methods);
}
