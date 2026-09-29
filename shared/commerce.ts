/**
 * Commerce rules shared by the client (display) and `placeOrder` (authoritative).
 * Both sides MUST compute totals with `computeOrderTotals` so the dummy payment amount
 * the client charges equals the server-computed total.
 */
import type { SiteSettings } from './types.js';

/** Max units of one product per order / cart line. */
export const MAX_QTY_PER_ITEM = 10;
/** Max distinct lines per order. */
export const MAX_ORDER_LINES = 20;

export const DEFAULT_SITE_SETTINGS: Readonly<SiteSettings> = {
  shippingThreshold: 999,
  shippingFee: 79,
  taxRate: 0.18,
  taxInclusive: true,
  showGstLine: true,
  codEnabled: true,
  maxQtyPerItem: MAX_QTY_PER_ITEM,
  createdAt: null,
  updatedAt: null,
};

export interface OrderLine {
  /** Unit price in rupees. */
  price: number;
  qty: number;
}

export type TotalsSettings = Pick<
  SiteSettings,
  'shippingThreshold' | 'shippingFee' | 'taxRate' | 'taxInclusive'
>;

export interface OrderTotals {
  /** Units across all lines. */
  itemCount: number;
  subtotal: number;
  shipping: number;
  /** GST: inclusive portion when `taxInclusive`, else added on top. Rounded to paise. */
  tax: number;
  total: number;
  /** Rupees still needed for free shipping (0 once reached or for an empty cart). */
  freeShippingRemaining: number;
  /** 0–100 progress towards the free-shipping threshold. */
  freeShippingPct: number;
  qualifiesForFreeShipping: boolean;
}

/** Rounds to 2 decimals (paise) without floating-point drift. */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Totals for a set of lines.
 * - Free shipping when subtotal ≥ threshold (and for an empty cart); otherwise flat fee.
 * - `taxInclusive` (default): tax = subtotal − subtotal / (1 + rate), total = subtotal + shipping.
 * - exclusive: tax = subtotal × rate, total = subtotal + shipping + tax.
 */
export function computeOrderTotals(
  lines: readonly OrderLine[],
  settings: TotalsSettings = DEFAULT_SITE_SETTINGS,
): OrderTotals {
  const valid = lines.filter(
    (line) => Number.isFinite(line.price) && Number.isFinite(line.qty) && line.qty > 0,
  );
  const itemCount = valid.reduce((sum, line) => sum + Math.floor(line.qty), 0);
  const subtotal = roundCurrency(
    valid.reduce((sum, line) => sum + Math.max(0, line.price) * Math.floor(line.qty), 0),
  );
  const threshold = Math.max(0, settings.shippingThreshold);
  const qualifiesForFreeShipping = subtotal === 0 || subtotal >= threshold;
  const shipping = qualifiesForFreeShipping ? 0 : Math.max(0, settings.shippingFee);
  const rate = Math.max(0, settings.taxRate);
  const tax = settings.taxInclusive
    ? roundCurrency(subtotal - subtotal / (1 + rate))
    : roundCurrency(subtotal * rate);
  const total = roundCurrency(
    settings.taxInclusive ? subtotal + shipping : subtotal + shipping + tax,
  );
  const freeShippingRemaining =
    subtotal === 0 ? 0 : roundCurrency(Math.max(0, threshold - subtotal));
  const freeShippingPct =
    threshold === 0 ? 100 : Math.min(100, Math.max(0, (subtotal / threshold) * 100));
  return {
    itemCount,
    subtotal,
    shipping,
    tax,
    total,
    freeShippingRemaining,
    freeShippingPct,
    qualifiesForFreeShipping,
  };
}

/**
 * Clamps a requested quantity to `1..min(stock, max)`. Non-finite input → 1.
 * When stock is 0 the result is still 1 (callers must block sold-out products separately).
 */
export function clampQty(qty: number, stock: number, max: number = MAX_QTY_PER_ITEM): number {
  const maxLimit = Number.isFinite(max) ? Math.floor(max) : MAX_QTY_PER_ITEM;
  const stockLimit = Number.isFinite(stock) ? Math.floor(stock) : maxLimit;
  const upper = Math.max(1, Math.min(stockLimit, maxLimit));
  const requested = Number.isFinite(qty) ? Math.floor(qty) : 1;
  return Math.min(upper, Math.max(1, requested));
}
