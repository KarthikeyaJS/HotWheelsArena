import { QueryClient } from '@tanstack/react-query';
import { shouldRetryQuery } from '@/lib/errors';

/**
 * App-wide QueryClient: 60s default staleTime, one retry (never for permission / auth /
 * not-found / validation errors), no refetch-on-focus storms for a small catalogue.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: shouldRetryQuery,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Singleton used by AppProviders (import it for imperative cache access outside React). */
export const queryClient = createQueryClient();
