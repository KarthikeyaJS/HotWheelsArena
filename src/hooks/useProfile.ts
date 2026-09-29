import { queryOptions, skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ANONYMOUS_UID, queryKeys } from '@/lib/queryKeys';
import { fetchProfile } from '@/services/firestore/users';
import type { UserProfile } from '@/types';
import { useUid } from './useAuth';

/**
 * Profile query options. Data is pushed live by AuthProvider's `onSnapshot(users/{uid})`
 * (setQueryData), so it never goes stale on its own.
 */
export function profileQueryOptions(uid: string | null) {
  return queryOptions<UserProfile | null>({
    queryKey: queryKeys.profile(uid ?? ANONYMOUS_UID),
    queryFn: uid ? () => fetchProfile(uid) : skipToken,
    staleTime: Infinity,
  });
}

/** The signed-in collector's live profile (`data: null` when the doc doesn't exist yet). */
export function useProfile(): UseQueryResult<UserProfile | null> {
  return useQuery(profileQueryOptions(useUid()));
}
