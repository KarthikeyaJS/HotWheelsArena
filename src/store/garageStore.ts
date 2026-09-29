/**
 * Optimistic mirror of the signed-in collector's garage + wishlist (NOT persisted).
 * Hydrated from the garage / wishlist queries (see `UserDataSync` in AuthProvider) and updated
 * optimistically by `useGarageActions` / `useWishlistActions`. Reset on sign-out.
 */
import { create } from 'zustand';
import type { GarageEntry, GarageSource, WishlistEntry } from '@/types';

export interface GarageMirrorEntry {
  isFavorite: boolean;
  quantity: number;
  addedAt: number | null;
  source: GarageSource;
}

export interface WishlistMirrorEntry {
  addedAt: number | null;
}

export interface GarageState {
  garage: Record<string, GarageMirrorEntry>;
  wishlist: Record<string, WishlistMirrorEntry>;
  garageHydrated: boolean;
  wishlistHydrated: boolean;

  hydrateGarage: (entries: readonly GarageEntry[]) => void;
  hydrateWishlist: (entries: readonly WishlistEntry[]) => void;
  upsertGarageEntry: (productId: string, entry: GarageMirrorEntry) => void;
  patchGarageEntry: (productId: string, patch: Partial<GarageMirrorEntry>) => void;
  removeGarageEntry: (productId: string) => void;
  setWishlisted: (productId: string, wishlisted: boolean, addedAt?: number | null) => void;
  reset: () => void;
}

const initialState = {
  garage: {} as Record<string, GarageMirrorEntry>,
  wishlist: {} as Record<string, WishlistMirrorEntry>,
  garageHydrated: false,
  wishlistHydrated: false,
};

export const useGarageStore = create<GarageState>()((set) => ({
  ...initialState,

  hydrateGarage: (entries) =>
    set({
      garage: Object.fromEntries(
        entries.map((entry) => [
          entry.productId,
          {
            isFavorite: entry.isFavorite,
            quantity: entry.quantity,
            addedAt: entry.addedAt,
            source: entry.source,
          },
        ]),
      ),
      garageHydrated: true,
    }),

  hydrateWishlist: (entries) =>
    set({
      wishlist: Object.fromEntries(
        entries.map((entry) => [entry.productId, { addedAt: entry.addedAt }]),
      ),
      wishlistHydrated: true,
    }),

  upsertGarageEntry: (productId, entry) =>
    set((state) => ({ garage: { ...state.garage, [productId]: entry } })),

  patchGarageEntry: (productId, patch) =>
    set((state) => {
      const current = state.garage[productId];
      if (!current) return state;
      return { garage: { ...state.garage, [productId]: { ...current, ...patch } } };
    }),

  removeGarageEntry: (productId) =>
    set((state) => {
      if (!(productId in state.garage)) return state;
      const garage = { ...state.garage };
      delete garage[productId];
      return { garage };
    }),

  setWishlisted: (productId, wishlisted, addedAt = Date.now()) =>
    set((state) => {
      if (wishlisted) {
        return { wishlist: { ...state.wishlist, [productId]: { addedAt } } };
      }
      if (!(productId in state.wishlist)) return state;
      const wishlist = { ...state.wishlist };
      delete wishlist[productId];
      return { wishlist };
    }),

  reset: () => set({ ...initialState, garage: {}, wishlist: {} }),
}));

/* -------------------------------- Selectors ------------------------------- */

export const useIsInGarage = (productId: string): boolean =>
  useGarageStore((state) => productId in state.garage);

export const useIsWishlisted = (productId: string): boolean =>
  useGarageStore((state) => productId in state.wishlist);

export const useIsFavorite = (productId: string): boolean =>
  useGarageStore((state) => state.garage[productId]?.isFavorite ?? false);

/** Copies owned (0 when not in the garage). */
export const useGarageQuantity = (productId: string): number =>
  useGarageStore((state) => state.garage[productId]?.quantity ?? 0);

/** Distinct cars in the garage. */
export const useGarageCount = (): number =>
  useGarageStore((state) => Object.keys(state.garage).length);

export const useWishlistCount = (): number =>
  useGarageStore((state) => Object.keys(state.wishlist).length);
