import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGarage } from '@/hooks/useGarage';

export interface OwnedProductIds {
  /** Product ids parked in the collector's garage; null while signed out or unknown. */
  ownedIds: ReadonlySet<string> | null;
  /** `auth` still resolving or the garage query loading for a signed-in collector. */
  isLoading: boolean;
  isSignedIn: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/** The signed-in collector's garage as a set of product ids (for series progress). */
export function useOwnedProductIds(): OwnedProductIds {
  const { status } = useAuth();
  const garage = useGarage();
  const isSignedIn = status === 'signed-in';
  const entries = garage.data;

  const ownedIds = useMemo(
    () => (isSignedIn && entries ? new Set(entries.map((entry) => entry.productId)) : null),
    [isSignedIn, entries],
  );

  return {
    ownedIds,
    isLoading: status === 'loading' || (isSignedIn && garage.isPending),
    isSignedIn,
    isError: isSignedIn && garage.isError && !entries,
    error: garage.error,
    refetch: () => void garage.refetch(),
  };
}
