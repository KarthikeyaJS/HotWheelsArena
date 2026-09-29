import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { STALE_TIMES, queryKeys } from '@/lib/queryKeys';
import { fetchSiteSettings } from '@/services/firestore/settings';
import type { SiteSettings } from '@/types';

/**
 * `settings/site` query. `DEFAULT_SITE_SETTINGS` is used as placeholder data and as the fallback
 * when the document is missing/unreadable, so `data` is effectively always present.
 */
export function useSiteSettings(): UseQueryResult<SiteSettings> {
  return useQuery({
    queryKey: queryKeys.siteSettings(),
    queryFn: fetchSiteSettings,
    staleTime: STALE_TIMES.catalog,
    placeholderData: DEFAULT_SITE_SETTINGS,
  });
}

/** Convenience: the current site settings, never undefined. */
export function useSettings(): SiteSettings {
  return useSiteSettings().data ?? DEFAULT_SITE_SETTINGS;
}
