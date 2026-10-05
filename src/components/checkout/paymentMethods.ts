import { CreditCard, type LucideIcon } from 'lucide-react';
import { PAYMENT_METHOD_OPTIONS } from '@/config/payment';
import type { PaymentMethod } from '@/types';

/** Display label for a payment method (`Card`, `UPI`, `Cash on Delivery`). */
export function paymentMethodLabel(method: PaymentMethod): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.id === method)?.label ?? method.toUpperCase()
  );
}

/** Lucide icon for a payment method. */
export function paymentMethodIcon(method: PaymentMethod): LucideIcon {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.id === method)?.icon ?? CreditCard;
}
