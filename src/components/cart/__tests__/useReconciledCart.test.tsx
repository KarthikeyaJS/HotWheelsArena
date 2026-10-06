import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeOrderTotals } from '@shared/commerce';
import { useCartStore } from '@/store/cartStore';
import type { Product, SiteSettings } from '@/types';
import { useCartNoticeStore } from '../cartNoticeStore';
import { useReconciledCart } from '../useReconciledCart';
import { makeCartItem, makeProduct, makeSettings } from './fixtures';

interface ProductsState {
  data: Product[] | undefined;
  isPending: boolean;
  /** Fixed catalogue fetch time; defaults to "now" on every render when data is present. */
  dataUpdatedAt?: number;
}

const mocks = vi.hoisted(() => ({
  products: { data: undefined, isPending: true } as ProductsState,
  settings: null as SiteSettings | null,
  refetch: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    data: mocks.products.data,
    isPending: mocks.products.isPending,
    isFetching: false,
    isStale: false,
    isError: false,
    error: null,
    dataUpdatedAt: mocks.products.dataUpdatedAt ?? (mocks.products.data ? Date.now() : 0),
    refetch: mocks.refetch,
  }),
}));

vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    data: mocks.settings ?? undefined,
    isPlaceholderData: false,
    isFetching: false,
    refetch: mocks.refetch,
  }),
}));

const gt3 = makeProduct();
const supra = makeProduct({
  id: 'toyota-supra-a80',
  name: 'Toyota Supra (A80)',
  price: 1199,
  stock: 3,
});

beforeEach(() => {
  mocks.products = { data: undefined, isPending: true };
  mocks.settings = makeSettings();
  mocks.refetch.mockClear();
  useCartStore.setState({ items: [], catalogueSyncedAt: 0 });
  useCartNoticeStore.getState().dismiss();
});

describe('useReconciledCart', () => {
  it('writes fresh prices back to the cart and keeps a "prices updated" notice', async () => {
    useCartStore.setState({
      items: [makeCartItem(gt3, { price: 449, qty: 2 }), makeCartItem(supra, { qty: 5, stock: 9 })],
    });
    const { result, rerender } = renderHook(() => useReconciledCart());
    expect(result.current.verified).toBe(false);
    expect(result.current.isVerifying).toBe(true);

    mocks.products = { data: [gt3, supra], isPending: false };
    rerender();

    await waitFor(() => expect(useCartStore.getState().items[0]?.price).toBe(499));
    expect(useCartStore.getState().items[1]?.qty).toBe(3);
    expect(result.current.notices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: gt3.id, kind: 'price-up', from: 449, to: 499 }),
        expect.objectContaining({ productId: supra.id, kind: 'qty-reduced', from: 5, to: 3 }),
      ]),
    );
    // Totals use reconciled prices: 2 × 499 + 3 × 1199 = 4595 (free shipping).
    expect(result.current.totals.total).toBe(4595);
    expect(result.current.needsSync).toBe(false);

    act(() => result.current.dismissNotices());
    expect(result.current.notices).toEqual([]);
  });

  it('applies a lower per-collector cap from site settings', async () => {
    mocks.settings = makeSettings({ maxQtyPerItem: 2 });
    mocks.products = { data: [gt3], isPending: false };
    useCartStore.setState({ items: [makeCartItem(gt3, { qty: 6 })] });
    const { result } = renderHook(() => useReconciledCart());
    await waitFor(() => expect(useCartStore.getState().items[0]?.qty).toBe(2));
    expect(result.current.maxQtyPerItem).toBe(2);
    expect(result.current.lines[0]?.maxQty).toBe(2);
  });
});

describe('useReconciledCart — cross-tab catalogue freshness (catalogueSyncedAt)', () => {
  const FETCHED_AT = 1_800_000_000_000;

  it('stamps the store with the catalogue fetch time when it writes back', async () => {
    useCartStore.setState({
      items: [makeCartItem(gt3, { price: 449 })],
      catalogueSyncedAt: FETCHED_AT - 5_000,
    });
    mocks.products = { data: [gt3], isPending: false, dataUpdatedAt: FETCHED_AT };
    renderHook(() => useReconciledCart());
    await waitFor(() => expect(useCartStore.getState().items[0]?.price).toBe(499));
    expect(useCartStore.getState().catalogueSyncedAt).toBe(FETCHED_AT);
    expect(mocks.refetch).not.toHaveBeenCalled();
  });

  it('does not overwrite snapshots another tab synced from a NEWER catalogue; refetches once', async () => {
    // Another tab reconciled against a newer catalogue (price 549) and stamped it.
    const newerStamp = FETCHED_AT + 10_000;
    useCartStore.setState({
      items: [makeCartItem(gt3, { price: 549 })],
      catalogueSyncedAt: newerStamp,
    });
    mocks.products = { data: [gt3], isPending: false, dataUpdatedAt: FETCHED_AT };
    const { result, rerender } = renderHook(() => useReconciledCart());

    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
    rerender();
    rerender();
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items[0]?.price).toBe(549);
    expect(useCartStore.getState().catalogueSyncedAt).toBe(newerStamp);
    expect(result.current.notices).toEqual([]);
    // Display + totals still use this tab's live catalogue.
    expect(result.current.purchasable[0]?.price).toBe(499);
    expect(result.current.totals).toEqual(
      computeOrderTotals(result.current.purchasable, makeSettings()),
    );
  });

  it('reconciles normally once the refetched catalogue is newer than the stored stamp', async () => {
    const newerStamp = FETCHED_AT + 10_000;
    const fresh = makeProduct({ price: 549 });
    useCartStore.setState({
      items: [makeCartItem(gt3, { price: 549 })],
      catalogueSyncedAt: newerStamp,
    });
    mocks.products = { data: [gt3], isPending: false, dataUpdatedAt: FETCHED_AT };
    const { result, rerender } = renderHook(() => useReconciledCart());
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));

    // The refetch lands: same price as the other tab → nothing to write, no notice.
    mocks.products = { data: [fresh], isPending: false, dataUpdatedAt: newerStamp + 1_000 };
    rerender();
    expect(result.current.needsSync).toBe(false);
    expect(useCartStore.getState().catalogueSyncedAt).toBe(newerStamp);
    expect(result.current.notices).toEqual([]);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it('writes anyway when the stored stamp is still newer after a successful refetch (clock anomaly)', async () => {
    const futureStamp = FETCHED_AT + 3_600_000;
    useCartStore.setState({
      items: [makeCartItem(gt3, { price: 549 })],
      catalogueSyncedAt: futureStamp,
    });
    mocks.products = { data: [gt3], isPending: false, dataUpdatedAt: FETCHED_AT };
    const { rerender } = renderHook(() => useReconciledCart());
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
    expect(useCartStore.getState().items[0]?.price).toBe(549);

    mocks.products = { data: [gt3], isPending: false, dataUpdatedAt: FETCHED_AT + 2_000 };
    rerender();
    await waitFor(() => expect(useCartStore.getState().items[0]?.price).toBe(499));
    expect(useCartStore.getState().catalogueSyncedAt).toBe(futureStamp);
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useReconciledCart — order line limit', () => {
  const catalogue = (count: number): Product[] =>
    Array.from({ length: count }, (_, index) =>
      makeProduct({ id: `car-${index + 1}`, name: `Car ${index + 1}`, price: 149 }),
    );

  it('reports how many purchasable lines exceed MAX_ORDER_LINES (20)', () => {
    const products = catalogue(21);
    mocks.products = { data: products, isPending: false };
    useCartStore.setState({ items: products.map((product) => makeCartItem(product)) });
    const { result, rerender } = renderHook(() => useReconciledCart());
    expect(result.current.purchasable).toHaveLength(21);
    expect(result.current.lineLimitExcess).toBe(1);

    act(() => useCartStore.getState().removeItem('car-21'));
    rerender();
    expect(result.current.lineLimitExcess).toBe(0);
  });

  it('only counts purchasable lines (sold-out lines are blocked separately)', () => {
    const products = catalogue(21).map((product, index) =>
      index === 0 ? { ...product, stock: 0 } : product,
    );
    mocks.products = { data: products, isPending: false };
    useCartStore.setState({ items: products.map((product) => makeCartItem(product)) });
    const { result } = renderHook(() => useReconciledCart());
    expect(result.current.hasBlockers).toBe(true);
    expect(result.current.lineLimitExcess).toBe(0);
  });
});
