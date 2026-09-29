import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ANONYMOUS_UID, STALE_TIMES, mutationKeys, queryKeys } from '@/lib/queryKeys';
import { getCurrentUid, requireUid } from '@/services/auth';
import { deleteAddress, fetchAddresses, saveAddress } from '@/services/firestore/addresses';
import type { Address, SavedAddress } from '@/types';
import { useUid } from './useAuth';

/** Saved shipping addresses (default first). */
export function useSavedAddresses(): UseQueryResult<SavedAddress[]> {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.addresses(uid ?? ANONYMOUS_UID),
    queryFn: uid ? () => fetchAddresses(uid) : skipToken,
    staleTime: STALE_TIMES.user,
  });
}

export interface SaveAddressVariables {
  address: Address;
  /** Existing address id to update; omit to create. */
  id?: string;
  isDefault?: boolean;
}

/**
 * Creates / updates a saved address (validated with AddressSchema). Resolves the address id.
 * Errors are not toasted — show them inline.
 */
export function useSaveAddress(): UseMutationResult<string, Error, SaveAddressVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.saveAddress,
    mutationFn: async ({ address, id, isDefault }: SaveAddressVariables) => {
      const uid = requireUid();
      const otherIds = (
        queryClient.getQueryData<SavedAddress[]>(queryKeys.addresses(uid)) ?? []
      ).map((saved) => saved.id);
      return saveAddress(uid, address, {
        ...(id ? { id } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
        otherIds,
      });
    },
    onSuccess: () => {
      const uid = getCurrentUid();
      if (uid) void queryClient.invalidateQueries({ queryKey: queryKeys.addresses(uid) });
    },
  });
}

/** Deletes a saved address by id. */
export function useDeleteAddress(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.deleteAddress,
    mutationFn: async (addressId: string) => deleteAddress(requireUid(), addressId),
    onSuccess: () => {
      const uid = getCurrentUid();
      if (uid) void queryClient.invalidateQueries({ queryKey: queryKeys.addresses(uid) });
    },
  });
}
