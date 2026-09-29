import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';
import { getCurrentUid } from '@/services/auth';
import { addToWishlist, removeFromWishlist } from '@/services/firestore/wishlist';
import { useGarageStore, type WishlistMirrorEntry } from '@/store/garageStore';
import { toast } from '@/store/toastStore';
import type { WishlistEntry } from '@/types';
import type { ProductRef } from './useGarageActions';
import { useRequireAuthAction } from './useRequireAuthAction';

interface WishlistVariables {
  uid: string;
  productId: string;
  name?: string;
  wishlisted: boolean;
}

interface WishlistContext {
  previousEntries: WishlistEntry[] | undefined;
  previousMirror: WishlistMirrorEntry | undefined;
}

export interface UseWishlistActionsOptions {
  /** Show success toasts (errors are always toasted). Default true. */
  toasts?: boolean;
}

export interface WishlistActions {
  /** Adds or removes the product. Prompts sign-in when signed out. */
  toggleWishlist: (product: ProductRef) => void;
  addToWishlist: (product: ProductRef) => void;
  removeFromWishlist: (product: ProductRef) => void;
  isPending: boolean;
  pendingProductId: string | null;
}

const refOf = (product: ProductRef): { productId: string; name?: string } =>
  typeof product === 'string'
    ? { productId: product }
    : { productId: product.id, ...(product.name ? { name: product.name } : {}) };

/**
 * Optimistic wishlist mutations (cache + garageStore mirror, rollback + error toast), same
 * contract as `useGarageActions`.
 */
export function useWishlistActions(options: UseWishlistActionsOptions = {}): WishlistActions {
  const showToasts = options.toasts ?? true;
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuthAction();

  const mutation = useMutation<void, Error, WishlistVariables, WishlistContext>({
    mutationKey: mutationKeys.wishlist,
    mutationFn: ({ uid, productId, wishlisted }) =>
      wishlisted ? addToWishlist(uid, productId) : removeFromWishlist(uid, productId),
    onMutate: async ({ uid, productId, wishlisted }) => {
      const key = queryKeys.wishlist(uid);
      await queryClient.cancelQueries({ queryKey: key });
      const previousEntries = queryClient.getQueryData<WishlistEntry[]>(key);
      const previousMirror = useGarageStore.getState().wishlist[productId];
      queryClient.setQueryData<WishlistEntry[]>(key, (old = []) =>
        wishlisted
          ? old.some((entry) => entry.productId === productId)
            ? old
            : [{ productId, addedAt: Date.now() }, ...old]
          : old.filter((entry) => entry.productId !== productId),
      );
      useGarageStore.getState().setWishlisted(productId, wishlisted);
      return { previousEntries, previousMirror };
    },
    onError: (error, { uid, productId }, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKeys.wishlist(uid), context.previousEntries);
      }
      const store = useGarageStore.getState();
      if (context?.previousMirror)
        store.setWishlisted(productId, true, context.previousMirror.addedAt);
      else store.setWishlisted(productId, false);
      toast.error("Couldn't update your wishlist", getFriendlyErrorMessage(error));
    },
    onSuccess: (_data, { wishlisted, name }) => {
      if (!showToasts) return;
      if (wishlisted) toast.success('Added to wishlist', name);
      else toast({ title: 'Removed from wishlist', ...(name ? { description: name } : {}) });
    },
    onSettled: (_data, _error, { uid }) => {
      if (queryClient.isMutating({ mutationKey: mutationKeys.wishlist }) === 1) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist(uid) });
      }
    },
  });

  const { mutate } = mutation;

  const set = useCallback(
    (product: ProductRef, wishlisted: boolean | 'toggle') => {
      const ref = refOf(product);
      requireAuth(() => {
        const uid = getCurrentUid();
        if (!uid) return;
        const current = ref.productId in useGarageStore.getState().wishlist;
        const next = wishlisted === 'toggle' ? !current : wishlisted;
        if (next === current) return;
        mutate({ ...ref, uid, wishlisted: next });
      }, 'Sign in to save cars to your wishlist.');
    },
    [mutate, requireAuth],
  );

  return {
    toggleWishlist: useCallback((product: ProductRef) => set(product, 'toggle'), [set]),
    addToWishlist: useCallback((product: ProductRef) => set(product, true), [set]),
    removeFromWishlist: useCallback((product: ProductRef) => set(product, false), [set]),
    isPending: mutation.isPending,
    pendingProductId: mutation.isPending ? (mutation.variables?.productId ?? null) : null,
  };
}
