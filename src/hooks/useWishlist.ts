import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ANONYMOUS_UID, STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import { fetchWishlist } from '@/services/firestore/wishlist';
import type { Product, WishlistEntry } from '@/types';
import { useUid } from './useAuth';
import { useProductsByIds } from './useProducts';

/** Wishlist query options for a uid (null → disabled). */
export function wishlistQueryOptions(uid: string | null) {
  return {
    queryKey: queryKeys.wishlist(uid ?? ANONYMOUS_UID),
    queryFn: uid ? () => fetchWishlist(uid) : skipToken,
    staleTime: STALE_TIMES.user,
  } as const;
}

/** The signed-in collector's wishlist entries (newest first). Mirrored into `garageStore`. */
export function useWishlist(): UseQueryResult<WishlistEntry[]> {
  return useQuery<WishlistEntry[]>(wishlistQueryOptions(useUid()));
}

export interface WishlistProductsResult {
  products: Product[];
  entries: WishlistEntry[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Wishlist entries resolved to products (newest first) — for the Wishlist page / garage tab. */
export function useWishlistProducts(): WishlistProductsResult {
  const wishlist = useWishlist();
  const entries = useMemo(() => wishlist.data ?? [], [wishlist.data]);
  const ids = useMemo(() => entries.map((entry) => entry.productId), [entries]);
  const products = useProductsByIds(ids);

  return {
    products: products.data ?? [],
    entries,
    isLoading: wishlist.isLoading || (ids.length > 0 && products.isLoading),
    isError: wishlist.isError || products.isError,
    error: wishlist.error ?? products.error ?? null,
    refetch: () => {
      void wishlist.refetch();
      void products.refetch();
    },
  };
}
