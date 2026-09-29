/**
 * Authoritative order pricing. Client prices are never trusted: every line is re-priced from the
 * product document and totals come from the shared `computeOrderTotals`, exactly like the cart.
 */
import {
  MAX_QTY_PER_ITEM,
  computeOrderTotals,
  type OrderTotals,
  type Rarity,
} from '../../../shared/index.js';
import { AppError } from './errors.js';
import type { ProductRecord, ServerSettings } from './firestoreData.js';

export interface RequestedLine {
  productId: string;
  qty: number;
}

export interface PricedLine {
  productId: string;
  slug: string;
  name: string;
  /** Server unit price (₹). */
  price: number;
  qty: number;
  image: string;
  rarity: Rarity;
  category: string;
}

export interface PricedOrder {
  lines: PricedLine[];
  totals: OrderTotals;
}

/**
 * Merges duplicate product lines (summing quantities) in first-seen order. Lines with a
 * non-positive or non-finite quantity are dropped; fractional quantities are floored.
 */
export function mergeOrderLines(items: readonly RequestedLine[]): RequestedLine[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const productId = item.productId.trim();
    const qty = Number.isFinite(item.qty) ? Math.floor(item.qty) : 0;
    if (!productId || qty <= 0) continue;
    merged.set(productId, (merged.get(productId) ?? 0) + qty);
  }
  return Array.from(merged, ([productId, qty]) => ({ productId, qty }));
}

/** Per-product quantity cap: the store setting, never above the shared `MAX_QTY_PER_ITEM`. */
export function maxQtyPerItem(settings: Pick<ServerSettings, 'maxQtyPerItem'>): number {
  const configured = Number.isFinite(settings.maxQtyPerItem)
    ? Math.floor(settings.maxQtyPerItem)
    : MAX_QTY_PER_ITEM;
  return Math.min(MAX_QTY_PER_ITEM, Math.max(1, configured));
}

const UNKNOWN_CAR_MESSAGE =
  'One of the cars in your pit stop is no longer available — remove it and try again.';

/**
 * Validates availability / stock / quantity caps and prices every line with SERVER prices.
 * Stock is checked but never decremented (live inventory is out of scope).
 *
 * @throws AppError `failed-precondition` (unavailable / sold out / not enough stock) or
 *   `out-of-range` (above the per-collector cap) with a message naming the car.
 */
export function priceOrder(
  requested: readonly RequestedLine[],
  products: ReadonlyMap<string, ProductRecord | null>,
  settings: ServerSettings,
): PricedOrder {
  const lines = mergeOrderLines(requested);
  if (lines.length === 0) {
    throw new AppError('invalid-argument', 'Your pit stop is empty.');
  }
  const cap = maxQtyPerItem(settings);

  const priced = lines.map((line): PricedLine => {
    const product = products.get(line.productId) ?? null;
    if (!product) {
      throw new AppError('failed-precondition', UNKNOWN_CAR_MESSAGE, {
        productId: line.productId,
      });
    }
    const { name } = product;
    if (!product.isActive || product.price === null) {
      throw new AppError(
        'failed-precondition',
        `${name} is no longer available — remove it from your pit stop.`,
        { productId: product.id, reason: product.isActive ? 'invalid-price' : 'inactive' },
      );
    }
    if (line.qty > cap) {
      throw new AppError(
        'out-of-range',
        `You can take up to ${cap} of ${name} per order — adjust your pit stop.`,
        { productId: product.id, qty: line.qty, cap },
      );
    }
    if (product.stock <= 0) {
      throw new AppError(
        'failed-precondition',
        `${name} is sold out — remove it from your pit stop.`,
        {
          productId: product.id,
        },
      );
    }
    if (product.stock < line.qty) {
      throw new AppError(
        'failed-precondition',
        `Only ${product.stock} of ${name} left — lower the quantity in your pit stop.`,
        { productId: product.id, qty: line.qty, stock: product.stock },
      );
    }
    return {
      productId: product.id,
      slug: product.slug,
      name,
      price: product.price,
      qty: line.qty,
      image: product.image,
      rarity: product.rarity,
      category: product.category,
    };
  });

  const totals = computeOrderTotals(
    priced.map((line) => ({ price: line.price, qty: line.qty })),
    settings,
  );
  return { lines: priced, totals };
}
