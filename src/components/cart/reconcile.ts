/**
 * Pure cart reconciliation: compares the cart's price/stock snapshots with the CURRENT catalogue
 * so displayed totals and the payment amount always match what `placeOrder` will compute
 * server-side (`computeOrderTotals` over current prices).
 */
import { MAX_ORDER_LINES, MAX_QTY_PER_ITEM, clampQty } from '@shared/commerce';
import { primaryImageOf } from '@/lib/product';
import type { CartItem, Product } from '@/types';

/** `ok` = purchasable; `sold-out` = stock 0; `unavailable` = retired / no longer listed. */
export type CartLineStatus = 'ok' | 'sold-out' | 'unavailable';

export interface ReconciledCartLine {
  /** The line with CURRENT name / price / stock / image and a quantity clamped to what can be bought. */
  item: CartItem;
  /** The line exactly as stored in the cart. */
  original: CartItem;
  /** Current catalogue product (null when it is no longer listed or not verified yet). */
  product: Product | null;
  status: CartLineStatus;
  /** Highest quantity the stepper may offer (0 for blocked lines). */
  maxQty: number;
  /** Unit price when the car was added, if it has changed since. */
  previousPrice: number | null;
  /** Quantity before it had to be lowered to fit the stock / per-collector cap. */
  previousQty: number | null;
}

export type CartChangeKind = 'price-up' | 'price-down' | 'qty-reduced' | 'sold-out' | 'unavailable';

export interface CartChange {
  productId: string;
  name: string;
  kind: CartChangeKind;
  /** Old value (price in ₹ or quantity); null for sold-out / unavailable. */
  from: number | null;
  /** New value (price in ₹ or quantity); null for sold-out / unavailable. */
  to: number | null;
}

export interface CartReconciliation {
  lines: ReconciledCartLine[];
  /** Purchasable lines with current prices + clamped quantities (totals, payment and order input). */
  purchasable: CartItem[];
  /** Sold-out or unavailable lines — checkout is blocked until they are removed. */
  blocked: ReconciledCartLine[];
  /** Every difference between the stored snapshots and the current catalogue. */
  changes: CartChange[];
  hasBlockers: boolean;
  /** Stored snapshots differ from the reconciled lines → write them back to the cart store. */
  needsSync: boolean;
  /** False when no catalogue data was available (lines are unverified snapshots). */
  verified: boolean;
}

export interface ReconcileOptions {
  /** Per-collector cap from site settings (`maxQtyPerItem`); never above MAX_QTY_PER_ITEM. */
  maxQtyPerItem?: number;
}

/** The effective per-line cap: `min(MAX_QTY_PER_ITEM, settings cap)`, at least 1. */
export function effectiveQtyCap(maxQtyPerItem: number = MAX_QTY_PER_ITEM): number {
  const configured = Number.isFinite(maxQtyPerItem) ? Math.floor(maxQtyPerItem) : MAX_QTY_PER_ITEM;
  return Math.max(1, Math.min(MAX_QTY_PER_ITEM, configured));
}

/** Highest purchasable quantity for a line (0 when sold out). */
export function lineMaxQty(stock: number, maxQtyPerItem: number = MAX_QTY_PER_ITEM): number {
  if (!Number.isFinite(stock) || stock <= 0) return 0;
  return Math.min(Math.floor(stock), effectiveQtyCap(maxQtyPerItem));
}

const SNAPSHOT_KEYS: ReadonlyArray<keyof CartItem> = [
  'slug',
  'name',
  'price',
  'image',
  'stock',
  'seriesName',
  'collectionNumber',
  'qty',
];

function sameSnapshot(a: CartItem, b: CartItem): boolean {
  return SNAPSHOT_KEYS.every((key) => a[key] === b[key]);
}

function unverifiedLine(item: CartItem, cap: number): ReconciledCartLine {
  const soldOut = !Number.isFinite(item.stock) || item.stock <= 0;
  return {
    item,
    original: item,
    product: null,
    status: soldOut ? 'sold-out' : 'ok',
    maxQty: soldOut ? 0 : Math.max(item.qty, lineMaxQty(item.stock, cap)),
    previousPrice: null,
    previousQty: null,
  };
}

/**
 * Reconciles cart lines with the current catalogue (`useProducts()` — active products only).
 * Pass `products = undefined` while the catalogue is loading: lines are returned unverified.
 */
export function reconcileCart(
  items: readonly CartItem[],
  products: readonly Product[] | undefined,
  options: ReconcileOptions = {},
): CartReconciliation {
  const cap = effectiveQtyCap(options.maxQtyPerItem);

  if (!products) {
    const lines = items.map((item) => unverifiedLine(item, cap));
    const blocked = lines.filter((line) => line.status !== 'ok');
    return {
      lines,
      purchasable: lines.filter((line) => line.status === 'ok').map((line) => line.item),
      blocked,
      changes: [],
      hasBlockers: blocked.length > 0,
      needsSync: false,
      verified: false,
    };
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const changes: CartChange[] = [];
  let needsSync = false;

  const lines = items.map((original): ReconciledCartLine => {
    const product = byId.get(original.productId);

    if (!product || !product.isActive) {
      changes.push({
        productId: original.productId,
        name: original.name,
        kind: 'unavailable',
        from: null,
        to: null,
      });
      return {
        item: original,
        original,
        product: null,
        status: 'unavailable',
        maxQty: 0,
        previousPrice: null,
        previousQty: null,
      };
    }

    const soldOut = !Number.isFinite(product.stock) || product.stock <= 0;
    const qty = soldOut ? original.qty : clampQty(original.qty, product.stock, cap);
    const item: CartItem = {
      ...original,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: primaryImageOf(product).url,
      stock: product.stock,
      seriesName: product.seriesName,
      collectionNumber: product.collectionNumber,
      qty,
    };
    if (!sameSnapshot(item, original)) needsSync = true;

    const priceChanged = product.price !== original.price;
    if (priceChanged) {
      changes.push({
        productId: product.id,
        name: product.name,
        kind: product.price > original.price ? 'price-up' : 'price-down',
        from: original.price,
        to: product.price,
      });
    }
    if (soldOut) {
      changes.push({
        productId: product.id,
        name: product.name,
        kind: 'sold-out',
        from: null,
        to: null,
      });
    } else if (qty < original.qty) {
      changes.push({
        productId: product.id,
        name: product.name,
        kind: 'qty-reduced',
        from: original.qty,
        to: qty,
      });
    }

    return {
      item,
      original,
      product,
      status: soldOut ? 'sold-out' : 'ok',
      maxQty: soldOut ? 0 : lineMaxQty(product.stock, cap),
      previousPrice: priceChanged ? original.price : null,
      previousQty: !soldOut && qty < original.qty ? original.qty : null,
    };
  });

  const blocked = lines.filter((line) => line.status !== 'ok');
  return {
    lines,
    purchasable: lines.filter((line) => line.status === 'ok').map((line) => line.item),
    blocked,
    changes,
    hasBlockers: blocked.length > 0,
    needsSync,
    verified: true,
  };
}

/** Changes that must be surfaced as a notice (they disappear from the cart once synced). */
export function isNoticeChange(change: CartChange): boolean {
  return (
    change.kind === 'price-up' || change.kind === 'price-down' || change.kind === 'qty-reduced'
  );
}

/**
 * Merges newly detected notice changes into the ones already shown: one entry per product + kind
 * family (price / qty), keeping the ORIGINAL `from` and the latest `to`. Entries whose value
 * went back to the original are dropped.
 */
export function mergeNoticeChanges(
  current: readonly CartChange[],
  incoming: readonly CartChange[],
): CartChange[] {
  const family = (kind: CartChangeKind): string => (kind === 'qty-reduced' ? 'qty' : 'price');
  const merged = new Map<string, CartChange>(
    current.map((change) => [`${change.productId}:${family(change.kind)}`, change]),
  );
  for (const change of incoming.filter(isNoticeChange)) {
    const key = `${change.productId}:${family(change.kind)}`;
    const previous = merged.get(key);
    const from = previous?.from ?? change.from;
    if (from !== null && from === change.to) {
      merged.delete(key);
      continue;
    }
    const kind: CartChangeKind =
      change.kind === 'qty-reduced'
        ? 'qty-reduced'
        : (change.to ?? 0) > (from ?? 0)
          ? 'price-up'
          : 'price-down';
    merged.set(key, { ...change, kind, from });
  }
  return [...merged.values()];
}

/**
 * How many lines an order is over `MAX_ORDER_LINES` (the limit `placeOrder` enforces) — 0 when
 * it fits. Checked before any payment is taken.
 */
export function orderLineExcess(lineCount: number): number {
  return Math.max(0, lineCount - MAX_ORDER_LINES);
}

/** Copy shown while an order has too many different cars (`excess` = lines to remove). */
export function orderLineLimitMessage(excess: number): string {
  return `An order can hold at most ${MAX_ORDER_LINES} different cars — remove ${excess} to start your engine.`;
}

/** `items` → `{ productId, qty }[]` for `placeOrder`. */
export function toOrderItems(
  items: readonly CartItem[],
): Array<{ productId: string; qty: number }> {
  return items.map((item) => ({ productId: item.productId, qty: item.qty }));
}
