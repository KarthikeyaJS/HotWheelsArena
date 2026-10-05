import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGarage } from '@/hooks/useGarage';
import { useProducts, useProductsByIds } from '@/hooks/useProducts';
import { useSeries } from '@/hooks/useSeries';
import { useWishlistCount } from '@/store/garageStore';
import type { GarageEntry, Product, Series, UserProfile } from '@/types';
import {
  computeDashboardStats,
  joinGarage,
  type DashboardStats,
  type GarageCarView,
} from './garageModel';

const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_SERIES: Series[] = [];
const EMPTY_ENTRIES: GarageEntry[] = [];

export interface GarageDashboard {
  /** Garage + catalogue (+ off-catalogue lookups) still loading for the first time. */
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  /** Visible garage cars, newest first (pending removals and unresolved entries excluded). */
  cars: GarageCarView[];
  /** Product ids currently parked (visible cars only). */
  ownedIds: ReadonlySet<string>;
  /** The active catalogue (for the add-a-car picker and missing models). */
  catalogue: Product[];
  catalogueById: ReadonlyMap<string, Product>;
  catalogueLoading: boolean;
  catalogueError: Error | null;
  refetchCatalogue: () => void;
  seriesList: Series[];
  seriesLoading: boolean;
  seriesError: Error | null;
  refetchSeries: () => void;
  stats: DashboardStats;
  profile: UserProfile | null;
  profileLoading: boolean;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Everything the My Garage page renders, from the existing data hooks:
 * garage entries are joined with the cached active catalogue first; ids that are not in it
 * (retired or deleted cars) are looked up individually via `useProductsByIds`. Entries whose
 * lookup is still in flight are held back, so a freshly parked car never flashes as "retired".
 *
 * @param hiddenIds entries to leave out (removals waiting for their undo window to close).
 */
export function useGarageDashboard(hiddenIds: ReadonlySet<string>): GarageDashboard {
  const { user, profile, isProfileLoading } = useAuth();
  const garage = useGarage();
  const catalogueQuery = useProducts();
  const seriesQuery = useSeries();
  const wishlistCount = useWishlistCount();

  const entries = garage.data ?? EMPTY_ENTRIES;
  const catalogue = catalogueQuery.data ?? EMPTY_PRODUCTS;
  const seriesList = seriesQuery.data ?? EMPTY_SERIES;

  const catalogueById = useMemo(
    () => new Map(catalogue.map((product) => [product.id, product])),
    [catalogue],
  );

  const offCatalogueIds = useMemo(
    () =>
      catalogueQuery.data
        ? entries.map((entry) => entry.productId).filter((id) => !catalogueById.has(id))
        : [],
    [catalogueQuery.data, entries, catalogueById],
  );

  const offCatalogue = useProductsByIds(offCatalogueIds);
  const offCatalogueResolving =
    offCatalogueIds.length > 0 && (offCatalogue.isPending || offCatalogue.isPlaceholderData);

  const productsById = useMemo(() => {
    const map = new Map(catalogueById);
    (offCatalogue.isPlaceholderData
      ? EMPTY_PRODUCTS
      : (offCatalogue.data ?? EMPTY_PRODUCTS)
    ).forEach((product) => map.set(product.id, product));
    return map;
  }, [catalogueById, offCatalogue.data, offCatalogue.isPlaceholderData]);

  const cars = useMemo(() => {
    const visible = entries.filter((entry) => {
      if (hiddenIds.has(entry.productId)) return false;
      // Off-catalogue lookups still in flight: hold the entry back instead of showing "retired".
      if (offCatalogueResolving && !catalogueById.has(entry.productId)) return false;
      return true;
    });
    return joinGarage(visible, productsById);
  }, [entries, hiddenIds, offCatalogueResolving, catalogueById, productsById]);

  const ownedIds = useMemo(() => new Set(cars.map((car) => car.entry.productId)), [cars]);

  const stats = useMemo(
    () => computeDashboardStats(cars, seriesList, wishlistCount),
    [cars, seriesList, wishlistCount],
  );

  const { refetch: refetchGarage } = garage;
  const { refetch: refetchProducts } = catalogueQuery;
  const { refetch: refetchOffCatalogue } = offCatalogue;
  const { refetch: refetchSeriesQuery } = seriesQuery;

  return {
    isLoading:
      garage.isLoading ||
      catalogueQuery.isLoading ||
      (offCatalogueIds.length > 0 && offCatalogue.isLoading),
    isError: garage.isError || catalogueQuery.isError,
    error: garage.error ?? catalogueQuery.error ?? null,
    refetch: () => {
      void refetchGarage();
      void refetchProducts();
      if (offCatalogueIds.length > 0) void refetchOffCatalogue();
    },
    cars,
    ownedIds,
    catalogue,
    catalogueById,
    catalogueLoading: catalogueQuery.isLoading,
    catalogueError: catalogueQuery.error ?? null,
    refetchCatalogue: () => void refetchProducts(),
    seriesList,
    seriesLoading: seriesQuery.isLoading,
    seriesError: seriesQuery.error ?? null,
    refetchSeries: () => void refetchSeriesQuery(),
    stats,
    profile,
    profileLoading: isProfileLoading,
    displayName: profile?.displayName || user?.displayName || null,
    photoURL: profile?.photoURL ?? user?.photoURL ?? null,
  };
}
