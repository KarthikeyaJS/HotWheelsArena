import { skipToken, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import { fetchSeries, fetchSeriesBySlug } from '@/services/firestore/series';
import type { Series } from '@/types';

/** Active series, newest year first. */
export function useSeries(): UseQueryResult<Series[]> {
  return useQuery({
    queryKey: queryKeys.seriesList(),
    queryFn: fetchSeries,
    staleTime: STALE_TIMES.catalog,
  });
}

/** One series by slug (instant from the cached list when present). `data === null` → not found. */
export function useSeriesBySlug(slug: string | undefined): UseQueryResult<Series | null> {
  const queryClient = useQueryClient();
  const fromList = (): Series | undefined =>
    slug
      ? queryClient
          .getQueryData<Series[]>(queryKeys.seriesList())
          ?.find((series) => series.slug === slug)
      : undefined;

  return useQuery<Series | null>({
    queryKey: queryKeys.series(slug ?? ''),
    queryFn: slug ? async () => fromList() ?? fetchSeriesBySlug(slug) : skipToken,
    initialData: fromList,
    initialDataUpdatedAt: () => queryClient.getQueryState(queryKeys.seriesList())?.dataUpdatedAt,
    staleTime: STALE_TIMES.catalog,
  });
}
