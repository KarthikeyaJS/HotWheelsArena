/** Input of one place-order attempt + its idempotency signature (pure). */
import type { PaymentCustomer } from '@/services/payment/PaymentProvider';
import type { Address, CartItem, PaymentMethod } from '@/types';

export interface PlaceOrderInput {
  lines: readonly CartItem[];
  address: Address;
  method: PaymentMethod;
  /** `computeOrderTotals(lines, settings).total` — the amount to charge. */
  amount: number;
  customer: PaymentCustomer;
}

/** Identifies an attempt: same method, amount and lines → the held payment can be reused. */
export function paymentSignature(input: PlaceOrderInput): string {
  const lines = input.lines
    .map((line) => `${line.productId}:${line.qty}:${line.price}`)
    .sort()
    .join(',');
  return `${input.method}|${input.amount}|${lines}`;
}
