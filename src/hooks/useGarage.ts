import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ANONYMOUS_UID, STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import { fetchGarage } from '@/services/firestore/garage';
import type { GarageCar, GarageEntry } from '@/types';
import { useUid } from './useAuth';
import { useProductsByIds } from './useProducts';

/** Garage query options for a uid (null → disabled). */
export function garageQueryOptions(uid: string | null) {
  return {
    queryKey: queryKeys.garage(uid ?? ANONYMOUS_UID),
    queryFn: uid ? () => fetchGarage(uid) : skipToken,
    staleTime: STALE_TIMES.user,
  } as const;
}

/**
 * The signed-in collector's garage entries (newest first). Disabled when signed out.
 * The result is mirrored into `garageStore` by AuthProvider, so buttons can use
 * `useIsInGarage(id)` without subscribing to the query.
 */
export function useGarage(): UseQueryResult<GarageEntry[]> {
  return useQuery<GarageEntry[]>(garageQueryOptions(useUid()));
}

export interface GarageCarsResult {
  /** Entries joined with their products (entries whose product is gone are dropped). */
  cars: GarageCar[];
  entries: GarageEntry[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Garage entries joined with product data — for the My Garage page. */
export function useGarageCars(): GarageCarsResult {
  const garage = useGarage();
  const entries = useMemo(() => garage.data ?? [], [garage.data]);
  const ids = useMemo(() => entries.map((entry) => entry.productId), [entries]);
  const products = useProductsByIds(ids);

  const cars = useMemo(() => {
    const byId = new Map((products.data ?? []).map((product) => [product.id, product]));
    return entries.flatMap((entry) => {
      const product = byId.get(entry.productId);
      return product ? [{ entry, product }] : [];
    });
  }, [entries, products.data]);

  return {
    cars,
    entries,
    isLoading: garage.isLoading || (ids.length > 0 && products.isLoading),
    isError: garage.isError || products.isError,
    error: garage.error ?? products.error ?? null,
    refetch: () => {
      void garage.refetch();
      void products.refetch();
    },
  };
}
