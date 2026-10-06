import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';
import { getCurrentUid } from '@/services/auth';
import {
  addGarageEntry,
  clampGarageQuantity,
  removeGarageEntry,
  setGarageFavorite,
  setGarageQuantity,
} from '@/services/firestore/garage';
import { useGarageStore, type GarageMirrorEntry } from '@/store/garageStore';
import { toast } from '@/store/toastStore';
import type { GarageEntry, Product } from '@/types';
import { garageQueryOptions } from './useGarage';
import { useRequireAuthAction } from './useRequireAuthAction';

/** A product id, or any object with `id` (+ optional `name` for toast copy). */
export type ProductRef = string | (Pick<Product, 'id'> & { name?: string });

type GarageChange =
  | { type: 'add' }
  | { type: 'remove' }
  | { type: 'favorite'; isFavorite: boolean }
  | { type: 'quantity'; quantity: number };

type GarageVariables = GarageChange & { uid: string; productId: string; name?: string };

interface GarageContext {
  previousEntries: GarageEntry[] | undefined;
  previousMirror: GarageMirrorEntry | undefined;
}

function applyChange(entries: readonly GarageEntry[], variables: GarageVariables): GarageEntry[] {
  const { productId } = variables;
  switch (variables.type) {
    case 'add':
      return entries.some((entry) => entry.productId === productId)
        ? [...entries]
        : [
            { productId, addedAt: Date.now(), source: 'manual', isFavorite: false, quantity: 1 },
            ...entries,
          ];
    case 'remove':
      return entries.filter((entry) => entry.productId !== productId);
    case 'favorite':
      return entries.map((entry) =>
        entry.productId === productId ? { ...entry, isFavorite: variables.isFavorite } : entry,
      );
    case 'quantity':
      return entries.map((entry) =>
        entry.productId === productId ? { ...entry, quantity: variables.quantity } : entry,
      );
    default:
      return [...entries];
  }
}

function applyMirror(variables: GarageVariables): void {
  const store = useGarageStore.getState();
  switch (variables.type) {
    case 'add':
      store.upsertGarageEntry(variables.productId, {
        isFavorite: false,
        quantity: 1,
        addedAt: Date.now(),
        source: 'manual',
      });
      break;
    case 'remove':
      store.removeGarageEntry(variables.productId);
      break;
    case 'favorite':
      store.patchGarageEntry(variables.productId, { isFavorite: variables.isFavorite });
      break;
    case 'quantity':
      store.patchGarageEntry(variables.productId, { quantity: variables.quantity });
      break;
    default:
      break;
  }
}

function persistChange(variables: GarageVariables): Promise<void> {
  const { uid, productId } = variables;
  switch (variables.type) {
    case 'add':
      return addGarageEntry(uid, productId);
    case 'remove':
      return removeGarageEntry(uid, productId);
    case 'favorite':
      return setGarageFavorite(uid, productId, variables.isFavorite);
    case 'quantity':
      return setGarageQuantity(uid, productId, variables.quantity);
    default:
      return Promise.resolve();
  }
}

const refOf = (product: ProductRef): { productId: string; name?: string } =>
  typeof product === 'string'
    ? { productId: product }
    : { productId: product.id, ...(product.name ? { name: product.name } : {}) };

type ResolvedGarageEntry = Pick<GarageEntry, 'isFavorite' | 'quantity'> | undefined;

/**
 * `uid`'s garage entry for `productId`: from the mirror once it is hydrated, else from the garage
 * query (joins UserDataSync's in-flight fetch right after sign-in). Rejects when the garage can't
 * be read — the caller then writes nothing.
 */
function resolveGarageEntry(
  queryClient: QueryClient,
  uid: string,
  productId: string,
): ResolvedGarageEntry | Promise<ResolvedGarageEntry> {
  const store = useGarageStore.getState();
  if (store.garageHydrated) return store.garage[productId];
  return queryClient
    .ensureQueryData(garageQueryOptions(uid))
    .then((entries) => entries.find((entry) => entry.productId === productId));
}

/** False when `change` would not change `entry` (or can't apply to it). */
function shouldPersist(change: GarageChange, entry: ResolvedGarageEntry): boolean {
  switch (change.type) {
    case 'add':
      return !entry;
    case 'favorite':
      return entry !== undefined && entry.isFavorite !== change.isFavorite;
    case 'remove':
    case 'quantity':
      return entry !== undefined;
    default:
      return false;
  }
}

export interface UseGarageActionsOptions {
  /** Show success toasts (errors are always toasted). Default true. */
  toasts?: boolean;
}

export interface GarageActions {
  /** Parks a car (source 'manual'). No-op when already in the garage. Prompts sign-in if needed. */
  addToGarage: (product: ProductRef) => void;
  removeFromGarage: (product: ProductRef) => void;
  /** Flips the favourite flag (only for cars already in the garage). */
  toggleFavorite: (product: ProductRef) => void;
  /** Sets copies owned, clamped to 1..99 (duplicates tracker). */
  setQuantity: (product: ProductRef, quantity: number) => void;
  /** True while any garage mutation from this hook instance is in flight. */
  isPending: boolean;
  /** Product id of the in-flight mutation (for per-button spinners). */
  pendingProductId: string | null;
}

/**
 * Optimistic garage mutations: updates the TanStack cache AND `garageStore` immediately, rolls
 * both back (and toasts) on failure, then refetches the garage once no other garage mutation is
 * running. Signed-out calls open the SignInPrompt and run after sign-in, deciding from the
 * collector's real garage (mirror or query), so re-parking a parked car is a quiet no-op.
 */
export function useGarageActions(options: UseGarageActionsOptions = {}): GarageActions {
  const showToasts = options.toasts ?? true;
  const queryClient = useQueryClient();
  const requireAuth = useRequireAuthAction();

  const mutation = useMutation<void, Error, GarageVariables, GarageContext>({
    mutationKey: mutationKeys.garage,
    mutationFn: persistChange,
    onMutate: async (variables) => {
      const key = queryKeys.garage(variables.uid);
      await queryClient.cancelQueries({ queryKey: key });
      const previousEntries = queryClient.getQueryData<GarageEntry[]>(key);
      const previousMirror = useGarageStore.getState().garage[variables.productId];
      queryClient.setQueryData<GarageEntry[]>(key, (old) => applyChange(old ?? [], variables));
      applyMirror(variables);
      return { previousEntries, previousMirror };
    },
    onError: (error, variables, context) => {
      const key = queryKeys.garage(variables.uid);
      if (context?.previousEntries) queryClient.setQueryData(key, context.previousEntries);
      const store = useGarageStore.getState();
      if (context?.previousMirror)
        store.upsertGarageEntry(variables.productId, context.previousMirror);
      else store.removeGarageEntry(variables.productId);
      toast.error("Couldn't update your garage", getFriendlyErrorMessage(error));
    },
    onSuccess: (_data, variables) => {
      if (!showToasts) return;
      const name = variables.name;
      if (variables.type === 'add') {
        toast.success(
          'Parked in your garage',
          name ? `${name} joined your collection.` : undefined,
        );
      } else if (variables.type === 'remove') {
        toast({ title: 'Removed from your garage', ...(name ? { description: name } : {}) });
      } else if (variables.type === 'favorite') {
        toast.success(variables.isFavorite ? 'Added to favorites' : 'Removed from favorites', name);
      }
    },
    onSettled: (_data, _error, variables) => {
      if (queryClient.isMutating({ mutationKey: mutationKeys.garage }) === 1) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.garage(variables.uid) });
      }
    },
  });

  const { mutate } = mutation;

  const run = useCallback(
    (change: GarageChange, product: ProductRef, reason: string) => {
      const ref = refOf(product);
      requireAuth(() => {
        const uid = getCurrentUid();
        if (!uid) return;
        const apply = (entry: ResolvedGarageEntry): void => {
          if (!entry && change.type === 'favorite') {
            toast({
              title: 'Not in your garage yet',
              description: 'Park the car in your garage to mark it as a favorite.',
            });
            return;
          }
          if (shouldPersist(change, entry)) mutate({ ...change, ...ref, uid });
        };
        const entry = resolveGarageEntry(queryClient, uid, ref.productId);
        if (entry instanceof Promise) return entry.then(apply);
        return apply(entry);
      }, reason);
    },
    [mutate, queryClient, requireAuth],
  );

  const addToGarage = useCallback(
    (product: ProductRef) => run({ type: 'add' }, product, 'Sign in to park cars in your garage.'),
    [run],
  );

  const removeFromGarage = useCallback(
    (product: ProductRef) => run({ type: 'remove' }, product, 'Sign in to manage your garage.'),
    [run],
  );

  const toggleFavorite = useCallback(
    (product: ProductRef) => {
      const { productId } = refOf(product);
      const current = useGarageStore.getState().garage[productId]?.isFavorite ?? false;
      run({ type: 'favorite', isFavorite: !current }, product, 'Sign in to mark favorites.');
    },
    [run],
  );

  const setQuantity = useCallback(
    (product: ProductRef, quantity: number) =>
      run(
        { type: 'quantity', quantity: clampGarageQuantity(quantity) },
        product,
        'Sign in to manage your garage.',
      ),
    [run],
  );

  return {
    addToGarage,
    removeFromGarage,
    toggleFavorite,
    setQuantity,
    isPending: mutation.isPending,
    pendingProductId: mutation.isPending ? (mutation.variables?.productId ?? null) : null,
  };
}
