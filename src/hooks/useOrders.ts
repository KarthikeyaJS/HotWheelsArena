import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { DocIdSchema } from '@shared/schemas';
import { ANONYMOUS_UID, STALE_TIMES, mutationKeys, queryKeys } from '@/lib/queryKeys';
import { getCurrentUid } from '@/services/auth';
import { fetchOrder, fetchOrders } from '@/services/firestore/orders';
import { placeOrder } from '@/services/functions';
import type { Order, PlaceOrderRequest, PlaceOrderResponse } from '@/types';
import { useUid } from './useAuth';

/** The signed-in collector's orders, newest first. */
export function useOrders(): UseQueryResult<Order[]> {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.orders(uid ?? ANONYMOUS_UID),
    queryFn: uid ? () => fetchOrders(uid) : skipToken,
    staleTime: STALE_TIMES.user,
  });
}

/**
 * True when a route param can be a Firestore order id. Anything else (`a/b`, reserved `__x__`,
 * surrounding spaces…) can never exist, so it resolves "not found" without a read — the SDK would
 * otherwise throw raw "Invalid document reference…" errors. This module is lazy-only (orders /
 * checkout pages), so importing zod here does not touch the entry chunk.
 */
function isOrderId(orderId: string): boolean {
  const parsed = DocIdSchema.safeParse(orderId);
  return parsed.success && parsed.data === orderId;
}

/** One order (instant from the cached list when present). `data === null` → not found / not yours. */
export function useOrder(orderId: string | undefined): UseQueryResult<Order | null> {
  const uid = useUid();
  const queryClient = useQueryClient();
  const fromList = (): Order | undefined =>
    uid && orderId
      ? queryClient
          .getQueryData<Order[]>(queryKeys.orders(uid))
          ?.find((order) => order.id === orderId)
      : undefined;

  return useQuery<Order | null>({
    queryKey: queryKeys.order(uid ?? ANONYMOUS_UID, orderId ?? ''),
    queryFn:
      uid && orderId
        ? () => (isOrderId(orderId) ? fetchOrder(orderId) : Promise.resolve(null))
        : skipToken,
    initialData: fromList,
    initialDataUpdatedAt: () =>
      uid ? queryClient.getQueryState(queryKeys.orders(uid))?.dataUpdatedAt : undefined,
    staleTime: STALE_TIMES.user,
  });
}

/**
 * Places an order through the `placeOrder` callable (server re-validates prices, stock and the
 * payment). On success it refetches orders + garage (purchases are auto-parked); XP / badges
 * arrive through the live profile. It does NOT clear the cart or toast — the checkout decides.
 */
export function usePlaceOrder(): UseMutationResult<PlaceOrderResponse, Error, PlaceOrderRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.placeOrder,
    mutationFn: (request: PlaceOrderRequest) => placeOrder(request),
    onSuccess: () => {
      const uid = getCurrentUid();
      if (!uid) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders(uid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.garage(uid) });
    },
  });
}
