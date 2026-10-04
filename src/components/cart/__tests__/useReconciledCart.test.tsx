import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/store/cartStore';
import type { Product, SiteSettings } from '@/types';
import { useCartNoticeStore } from '../cartNoticeStore';
import { useReconciledCart } from '../useReconciledCart';
import { makeCartItem, makeProduct, makeSettings } from './fixtures';

interface ProductsState {
  data: Product[] | undefined;
  isPending: boolean;
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
    dataUpdatedAt: mocks.products.data ? Date.now() : 0,
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
const supra = makeProduct({ id: 'toyota-supra-a80', name: 'Toyota Supra (A80)', price: 1199, stock: 3 });

beforeEach(() => {
  mocks.products = { data: undefined, isPending: true };
  mocks.settings = makeSettings();
  useCartStore.setState({ items: [] });
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
