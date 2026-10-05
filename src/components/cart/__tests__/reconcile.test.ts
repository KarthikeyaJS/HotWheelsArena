import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '@/store/cartStore';
import {
  effectiveQtyCap,
  lineMaxQty,
  mergeNoticeChanges,
  reconcileCart,
  toOrderItems,
  type CartChange,
} from '../reconcile';
import { restoreCartLine } from '../restoreCartLine';
import { makeCartItem, makeProduct } from './fixtures';

const gt3 = makeProduct();
const supra = makeProduct({
  id: 'toyota-supra-a80',
  name: 'Toyota Supra (A80)',
  price: 1199,
  stock: 0,
});
const thar = makeProduct({ id: 'mahindra-thar', name: 'Mahindra Thar', price: 229, stock: 134 });

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('effectiveQtyCap / lineMaxQty', () => {
  it('never exceeds MAX_QTY_PER_ITEM and respects a lower settings cap', () => {
    expect(effectiveQtyCap(25)).toBe(10);
    expect(effectiveQtyCap(3)).toBe(3);
    expect(effectiveQtyCap(0)).toBe(1);
    expect(effectiveQtyCap(Number.NaN)).toBe(10);
  });

  it('is limited by stock and is 0 when sold out', () => {
    expect(lineMaxQty(4)).toBe(4);
    expect(lineMaxQty(40)).toBe(10);
    expect(lineMaxQty(40, 2)).toBe(2);
    expect(lineMaxQty(0)).toBe(0);
  });
});

describe('reconcileCart', () => {
  it('returns unverified snapshot lines while the catalogue is loading', () => {
    const result = reconcileCart([makeCartItem(gt3, { qty: 2 })], undefined);
    expect(result.verified).toBe(false);
    expect(result.needsSync).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.purchasable).toHaveLength(1);
    expect(result.lines[0]?.status).toBe('ok');
  });

  it('applies current prices and records price changes', () => {
    const result = reconcileCart(
      [makeCartItem(gt3, { price: 449 }), makeCartItem(thar, { price: 249 })],
      [gt3, thar],
    );
    expect(result.purchasable.map((item) => item.price)).toEqual([499, 229]);
    expect(result.lines[0]?.previousPrice).toBe(449);
    expect(result.changes).toEqual([
      expect.objectContaining({ productId: gt3.id, kind: 'price-up', from: 449, to: 499 }),
      expect.objectContaining({ productId: thar.id, kind: 'price-down', from: 249, to: 229 }),
    ]);
    expect(result.needsSync).toBe(true);
    expect(result.hasBlockers).toBe(false);
  });

  it('flags sold-out and retired cars as blockers and excludes them from purchasable lines', () => {
    const result = reconcileCart(
      [
        makeCartItem(gt3),
        makeCartItem(supra, { stock: 4 }),
        makeCartItem(makeProduct({ id: 'retired-car', name: 'Retired' })),
      ],
      [gt3, supra],
    );
    expect(result.lines.map((line) => line.status)).toEqual(['ok', 'sold-out', 'unavailable']);
    expect(result.purchasable.map((item) => item.productId)).toEqual([gt3.id]);
    expect(result.blocked).toHaveLength(2);
    expect(result.hasBlockers).toBe(true);
    expect(result.lines[1]?.maxQty).toBe(0);
  });

  it('treats inactive products as unavailable', () => {
    const inactive = makeProduct({ isActive: false });
    const result = reconcileCart([makeCartItem(inactive)], [inactive]);
    expect(result.lines[0]?.status).toBe('unavailable');
  });

  it('clamps quantities to stock and to the per-collector cap', () => {
    const lowStock = makeProduct({ stock: 3 });
    const byStock = reconcileCart([makeCartItem(lowStock, { qty: 5 })], [lowStock]);
    expect(byStock.purchasable[0]?.qty).toBe(3);
    expect(byStock.lines[0]?.previousQty).toBe(5);
    expect(byStock.changes).toContainEqual(
      expect.objectContaining({ kind: 'qty-reduced', from: 5, to: 3 }),
    );

    const byCap = reconcileCart([makeCartItem(gt3, { qty: 6 })], [gt3], { maxQtyPerItem: 4 });
    expect(byCap.purchasable[0]?.qty).toBe(4);
    expect(byCap.lines[0]?.maxQty).toBe(4);
  });

  it('is idempotent after the store sync (no endless re-sync)', () => {
    const lowStock = makeProduct({ stock: 3, price: 549 });
    useCartStore.setState({
      items: [makeCartItem(lowStock, { qty: 9, price: 499 }), makeCartItem(thar, { qty: 7 })],
    });
    const products = [lowStock, thar];
    const cap = 5;
    const first = reconcileCart(useCartStore.getState().items, products, { maxQtyPerItem: cap });
    expect(first.needsSync).toBe(true);

    // What useReconciledCart does: store.reconcile + apply the settings cap.
    const store = useCartStore.getState();
    store.reconcile(products);
    useCartStore
      .getState()
      .items.filter((line) => line.qty > cap)
      .forEach((line) => store.setQty(line.productId, cap));

    const second = reconcileCart(useCartStore.getState().items, products, { maxQtyPerItem: cap });
    expect(second.needsSync).toBe(false);
    expect(second.changes).toEqual([]);
    expect(second.purchasable.map((item) => [item.qty, item.price])).toEqual([
      [3, 549],
      [5, 229],
    ]);
  });
});

describe('mergeNoticeChanges', () => {
  const change = (overrides: Partial<CartChange>): CartChange => ({
    productId: gt3.id,
    name: gt3.name,
    kind: 'price-up',
    from: 449,
    to: 499,
    ...overrides,
  });

  it('keeps the original "from" across successive changes', () => {
    const merged = mergeNoticeChanges([change({})], [change({ from: 499, to: 529 })]);
    expect(merged).toEqual([expect.objectContaining({ from: 449, to: 529, kind: 'price-up' })]);
  });

  it('drops a notice when the price returns to the original value', () => {
    expect(
      mergeNoticeChanges([change({})], [change({ from: 499, to: 449, kind: 'price-down' })]),
    ).toEqual([]);
  });

  it('ignores sold-out / unavailable changes and keeps price + qty notices apart', () => {
    const merged = mergeNoticeChanges(
      [],
      [
        change({}),
        change({ kind: 'qty-reduced', from: 5, to: 3 }),
        change({ kind: 'sold-out', from: null, to: null }),
      ],
    );
    expect(merged.map((entry) => entry.kind)).toEqual(['price-up', 'qty-reduced']);
  });
});

describe('restoreCartLine / toOrderItems', () => {
  it('puts an undone line back at its old position', () => {
    const items = [makeCartItem(gt3), makeCartItem(thar)];
    const restored = restoreCartLine(items, makeCartItem(supra), 1);
    expect(restored.map((item) => item.productId)).toEqual([gt3.id, supra.id, thar.id]);
    expect(restoreCartLine(items, makeCartItem(supra), 99).at(-1)?.productId).toBe(supra.id);
  });

  it('does not duplicate a car that was re-added meanwhile', () => {
    const items = [makeCartItem(gt3, { qty: 3 })];
    expect(restoreCartLine(items, makeCartItem(gt3), 0)).toEqual(items);
  });

  it('maps lines to placeOrder items', () => {
    expect(toOrderItems([makeCartItem(gt3, { qty: 2 })])).toEqual([{ productId: gt3.id, qty: 2 }]);
  });
});
