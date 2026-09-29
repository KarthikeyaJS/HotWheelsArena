/** Order presentation helpers (orders list, order detail, success page). */
import type { Order, OrderStatus } from '@/types';

export type OrderStatusTone = 'neutral' | 'accent' | 'success' | 'danger';

export interface OrderStatusMeta {
  label: string;
  description: string;
  tone: OrderStatusTone;
  /** Position on the delivery tracker (0–3); cancelled = -1. */
  step: number;
}

export const ORDER_STATUS_META: Readonly<Record<OrderStatus, OrderStatusMeta>> = {
  placed: {
    label: 'PLACED',
    description: 'Order received — the pit crew is on it.',
    tone: 'accent',
    step: 0,
  },
  processing: {
    label: 'PROCESSING',
    description: 'Your cars are being packed with care.',
    tone: 'accent',
    step: 1,
  },
  shipped: {
    label: 'SHIPPED',
    description: 'On the highway to your garage.',
    tone: 'accent',
    step: 2,
  },
  delivered: {
    label: 'DELIVERED',
    description: 'Parked in your garage. Enjoy the ride!',
    tone: 'success',
    step: 3,
  },
  cancelled: {
    label: 'CANCELLED',
    description: 'This order was cancelled.',
    tone: 'danger',
    step: -1,
  },
};

/** Tracker steps in order (excludes `cancelled`). */
export const ORDER_TRACK_STEPS: readonly OrderStatus[] = [
  'placed',
  'processing',
  'shipped',
  'delivered',
];

/** Short, human order reference: last 8 chars upper-cased, e.g. `#A1B2C3D4`. */
export function formatOrderRef(orderId: string): string {
  return `#${orderId.slice(-8).toUpperCase()}`;
}

/** Total units in an order. */
export function orderItemCount(order: Pick<Order, 'items'>): number {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}
