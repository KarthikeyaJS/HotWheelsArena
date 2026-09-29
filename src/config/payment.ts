/**
 * Payment provider selection. Switching gateways = register a provider factory here and set
 * `VITE_PAYMENT_PROVIDER` (plus a matching server-side verifier in functions/src/payments/).
 */
import { CreditCard, Smartphone, Banknote, type LucideIcon } from 'lucide-react';
import type { PaymentMethod, PaymentProviderId } from '@shared/types';
import { DummyPaymentProvider } from '@/services/payment/DummyPaymentProvider';
import type { PaymentProvider } from '@/services/payment/PaymentProvider';
import { env } from './env';

/** The configured provider id (`VITE_PAYMENT_PROVIDER`, default `dummy`). */
export const ACTIVE_PAYMENT_PROVIDER: PaymentProviderId = env.paymentProvider;

/** Provider factories. `razorpay` is reserved and not implemented yet. */
const PROVIDER_FACTORIES: Partial<Record<PaymentProviderId, () => PaymentProvider>> = {
  dummy: () => new DummyPaymentProvider(),
};

let providerInstance: PaymentProvider | null = null;

/**
 * The active payment provider (singleton). Falls back to the dummy provider (with a console
 * warning) when the configured id has no implementation.
 */
export function getPaymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;
  const factory = PROVIDER_FACTORIES[ACTIVE_PAYMENT_PROVIDER];
  if (!factory) {
    console.warn(
      `[payment] Provider "${ACTIVE_PAYMENT_PROVIDER}" is not implemented — falling back to test payments.`,
    );
  }
  providerInstance = (factory ?? (() => new DummyPaymentProvider()))();
  return providerInstance;
}

/** True when the active provider runs in test mode (show the TEST MODE banner). */
export function isTestPaymentMode(): boolean {
  return getPaymentProvider().mode === 'test';
}

export interface PaymentMethodOption {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Checkout radio options (filter `cod` out when `SiteSettings.codEnabled` is false). */
export const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  {
    id: 'card',
    label: 'Card',
    description: 'Credit or debit card — simulated, no card details needed.',
    icon: CreditCard,
  },
  {
    id: 'upi',
    label: 'UPI',
    description: 'Any UPI app — simulated approval in test mode.',
    icon: Smartphone,
  },
  {
    id: 'cod',
    label: 'Cash on Delivery',
    description: 'Pay when your cars arrive at the pit.',
    icon: Banknote,
  },
];
