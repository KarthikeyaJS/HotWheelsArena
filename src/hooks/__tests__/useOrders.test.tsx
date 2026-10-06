import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Order } from '@/types';
import { useOrder } from '../useOrders';

const mocks = vi.hoisted(() => ({
  fetchOrder: vi.fn<(orderId: string) => Promise<Order | null>>(),
  fetchOrders: vi.fn<(uid: string) => Promise<Order[]>>(),
}));

vi.mock('@/services/firestore/orders', () => mocks);
vi.mock('@/hooks/useAuth', () => ({ useUid: () => 'uid-1' }));

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.fetchOrder.mockReset().mockResolvedValue(null);
  mocks.fetchOrders.mockReset();
});

afterEach(() => {
  client.clear();
});

describe('useOrder', () => {
  it.each(['a/b', 'orders/x/y', ' W5hV9e96nlvybTRL0iTz', 'bad id', '.', '..'])(
    'resolves %j as not found without reading Firestore',
    async (orderId) => {
      const { result } = renderHook(() => useOrder(orderId), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
      expect(mocks.fetchOrder).not.toHaveBeenCalled();
    },
  );

  it('reads a well-formed order id', async () => {
    const { result } = renderHook(() => useOrder('W5hV9e96nlvybTRL0iTz'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fetchOrder).toHaveBeenCalledWith('W5hV9e96nlvybTRL0iTz');
  });
});
