import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';
import type { Product } from '@/types';
import { makeProduct } from '@/components/cart/__tests__/fixtures';
import { useProduct, useProductsByIds } from '../useProducts';

const mocks = vi.hoisted(() => ({
  fetchActiveProducts: vi.fn<() => Promise<Product[]>>(),
  fetchProductBySlug: vi.fn<(slug: string) => Promise<Product | null>>(),
  fetchProductsByIds: vi.fn<(ids: readonly string[]) => Promise<Product[]>>(),
}));

vi.mock('@/services/firestore/products', () => mocks);

const SLUG = 'monsoon-mauler';
const unreviewed = makeProduct({ id: SLUG, slug: SLUG, ratingAvg: 0, ratingCount: 0 });

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.fetchActiveProducts.mockReset();
  mocks.fetchProductBySlug.mockReset();
  mocks.fetchProductsByIds.mockReset();
});

afterEach(() => {
  client.clear();
});

describe('useProduct', () => {
  it('renders instantly from a fresh cached catalogue without a detail read', async () => {
    client.setQueryData(queryKeys.productList(), [unreviewed]);
    const { result } = renderHook(() => useProduct(SLUG), { wrapper });
    expect(result.current.data).toEqual(unreviewed);
    expect(result.current.isStale).toBe(false);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.fetchProductBySlug).not.toHaveBeenCalled();
  });

  it('reads the server after an invalidation instead of re-serving the old list entry', async () => {
    client.setQueryData(queryKeys.productList(), [unreviewed]);
    mocks.fetchProductBySlug.mockResolvedValue({ ...unreviewed, ratingAvg: 5, ratingCount: 1 });
    // The list refetch (racing in parallel) still answers with the OLD entry.
    mocks.fetchActiveProducts.mockResolvedValue([unreviewed]);
    const { result } = renderHook(() => useProduct(SLUG), { wrapper });
    expect(result.current.data?.ratingCount).toBe(0);

    await act(() => client.invalidateQueries({ queryKey: queryKeys.products() }));

    await waitFor(() => expect(result.current.data?.ratingCount).toBe(1));
    expect(mocks.fetchProductBySlug).toHaveBeenCalledWith(SLUG);
  });

  it('queries by slug when the car is not in the cached catalogue (null = not found)', async () => {
    mocks.fetchProductBySlug.mockResolvedValue(null);
    const { result } = renderHook(() => useProduct('no-such-car'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mocks.fetchProductBySlug).toHaveBeenCalledWith('no-such-car');
  });

  it('surfaces a failed slug read as an error (not a 404)', async () => {
    mocks.fetchProductBySlug.mockRejectedValue(
      Object.assign(new Error("Can't reach the track right now."), { code: 'unavailable' }),
    );
    const { result } = renderHook(() => useProduct(SLUG), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useProductsByIds', () => {
  it('refetches an invalidated catalogue instead of returning the stale cached list', async () => {
    client.setQueryData(queryKeys.productList(), [unreviewed]);
    await client.invalidateQueries({ queryKey: queryKeys.productList(), refetchType: 'none' });
    mocks.fetchActiveProducts.mockResolvedValue([{ ...unreviewed, ratingCount: 2 }]);
    const { result } = renderHook(() => useProductsByIds([SLUG]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.ratingCount).toBe(2);
    expect(mocks.fetchActiveProducts).toHaveBeenCalledTimes(1);
    expect(mocks.fetchProductsByIds).not.toHaveBeenCalled();
  });
});
