import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import { fetchCategories } from '@/services/firestore/categories';
import type { Category } from '@/types';

/** Active categories sorted by `order`. (UI labels/icons come from `CATEGORY_DISPLAY`.) */
export function useCategories(): UseQueryResult<Category[]> {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: STALE_TIMES.catalog,
  });
}
