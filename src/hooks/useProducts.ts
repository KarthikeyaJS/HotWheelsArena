import {
  keepPreviousData,
  queryOptions,
  skipToken,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import {
  fetchActiveProducts,
  fetchProductBySlug,
  fetchProductsByIds,
} from '@/services/firestore/products';
import type { Product } from '@/types';

/** Query options for the full active catalogue (use with `queryClient.ensureQueryData`). */
export const productListQueryOptions = queryOptions({
  queryKey: queryKeys.productList(),
  queryFn: fetchActiveProducts,
  staleTime: STALE_TIMES.products,
});

/**
 * All active products (newest first). Derive new / featured / vault / filtered lists client-side,
 * optionally via `select` (define it outside the component or memoize it).
 * @example const vault = useProducts(selectVault);
 */
export function useProducts<TData = Product[]>(
  select?: (products: Product[]) => TData,
): UseQueryResult<TData> {
  return useQuery<Product[], Error, TData, ReturnType<typeof queryKeys.productList>>({
    queryKey: queryKeys.productList(),
    queryFn: fetchActiveProducts,
    staleTime: STALE_TIMES.products,
    ...(select ? { select } : {}),
  });
}

/** Ready-made selectors for `useProducts(select)`. */
export const productSelectors = {
  newArrivals: (products: Product[]): Product[] => products.filter((product) => product.isNew),
  featured: (products: Product[]): Product[] => products.filter((product) => product.isFeatured),
  vault: (products: Product[]): Product[] => products.filter((product) => product.isVault),
} as const;

/**
 * One product by slug. Served instantly from the cached catalogue when available, else queried.
 * `data === null` → not found (render the 404 state).
 */
export function useProduct(slug: string | undefined): UseQueryResult<Product | null> {
  const queryClient = useQueryClient();
  const fromList = (): Product | undefined =>
    slug
      ? queryClient
          .getQueryData<Product[]>(queryKeys.productList())
          ?.find((product) => product.slug === slug)
      : undefined;

  return useQuery<Product | null>({
    queryKey: queryKeys.product(slug ?? ''),
    queryFn: slug ? async () => fromList() ?? fetchProductBySlug(slug) : skipToken,
    initialData: fromList,
    initialDataUpdatedAt: () => queryClient.getQueryState(queryKeys.productList())?.dataUpdatedAt,
    staleTime: STALE_TIMES.products,
  });
}

/**
 * Products for a list of ids, in the given order (missing / retired ones are skipped). Uses the
 * cached catalogue first, then fetches the rest individually (e.g. inactive cars in a garage).
 * Keeps the previous result while `ids` change.
 */
export function useProductsByIds(ids: readonly string[]): UseQueryResult<Product[]> {
  const queryClient = useQueryClient();
  const uniqueIds = [...new Set(ids)];

  return useQuery<Product[]>({
    queryKey: queryKeys.productsByIds(uniqueIds),
    queryFn: async () => {
      if (uniqueIds.length === 0) return [];
      const catalogue = await queryClient.ensureQueryData(productListQueryOptions);
      const byId = new Map(catalogue.map((product) => [product.id, product]));
      const missing = uniqueIds.filter((id) => !byId.has(id));
      if (missing.length > 0) {
        (await fetchProductsByIds(missing)).forEach((product) => byId.set(product.id, product));
      }
      return uniqueIds
        .map((id) => byId.get(id))
        .filter((product): product is Product => product !== undefined);
    },
    staleTime: STALE_TIMES.products,
    placeholderData: keepPreviousData,
  });
}
