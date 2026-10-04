/**
 * Price / quantity change notices detected while reconciling the cart. Kept in a tiny
 * module-level store (not persisted) so a notice raised on /cart is still visible on
 * /checkout and survives page remounts until the collector dismisses it.
 */
import { create } from 'zustand';
import { mergeNoticeChanges, type CartChange } from './reconcile';

interface CartNoticeState {
  notices: CartChange[];
  /** Merge newly detected changes (keeps the original "from" value per product). */
  record: (changes: readonly CartChange[]) => void;
  /** Drop notices for products that are no longer in the cart. */
  prune: (productIds: readonly string[]) => void;
  dismiss: () => void;
}

export const useCartNoticeStore = create<CartNoticeState>()((set) => ({
  notices: [],
  record: (changes) => {
    if (changes.length === 0) return;
    set((state) => ({ notices: mergeNoticeChanges(state.notices, changes) }));
  },
  prune: (productIds) =>
    set((state) => {
      const keep = new Set(productIds);
      const next = state.notices.filter((notice) => keep.has(notice.productId));
      return next.length === state.notices.length ? state : { notices: next };
    }),
  dismiss: () => set({ notices: [] }),
}));
