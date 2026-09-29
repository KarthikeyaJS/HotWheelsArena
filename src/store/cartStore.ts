/**
 * Pit Stop cart — persisted to localStorage (`hwa-cart-v1`). Prices are display snapshots only;
 * `placeOrder` recomputes everything server-side.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MAX_QTY_PER_ITEM, clampQty, computeOrderTotals } from '@shared/commerce';
import { primaryImageOf } from '@/lib/product';
import type { CartItem, Product } from '@/types';

export const CART_STORAGE_KEY = 'hwa-cart-v1';

export interface AddToCartResult {
  /** Line quantity after the call (0 when nothing was added). */
  qty: number;
  /** Units actually added. */
  added: number;
  /** True when the request was capped by stock or MAX_QTY_PER_ITEM (or the car is sold out). */
  limited: boolean;
}

export interface CartState {
  items: CartItem[];
  /** Adds `qty` (default 1) units, merging with an existing line and clamping to 1..min(stock, 10). */
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => AddToCartResult;
  removeItem: (productId: string) => void;
  /** Sets a line quantity, clamped to 1..min(stock, 10). Use removeItem to delete. */
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  /** Refreshes price / stock / name / image snapshots from fresh product data. */
  reconcile: (products: readonly Product[]) => void;
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === 'string' &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.image === 'string' &&
    typeof item.qty === 'number' &&
    typeof item.stock === 'number'
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) => {
        const existing = get().items.find((line) => line.productId === item.productId);
        const currentQty = existing?.qty ?? 0;
        if (item.stock <= 0) return { qty: currentQty, added: 0, limited: true };
        const requested = currentQty + Math.max(1, Math.floor(qty));
        const nextQty = clampQty(requested, item.stock, MAX_QTY_PER_ITEM);
        const added = Math.max(0, nextQty - currentQty);
        set((state) => ({
          items: existing
            ? state.items.map((line) =>
                line.productId === item.productId ? { ...line, ...item, qty: nextQty } : line,
              )
            : [...state.items, { ...item, qty: nextQty }],
        }));
        return { qty: nextQty, added, limited: requested > nextQty };
      },

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((line) => line.productId !== productId) })),

      setQty: (productId, qty) =>
        set((state) => ({
          items: state.items.map((line) =>
            line.productId === productId
              ? { ...line, qty: clampQty(qty, line.stock, MAX_QTY_PER_ITEM) }
              : line,
          ),
        })),

      clear: () => set({ items: [] }),

      reconcile: (products) => {
        if (products.length === 0) return;
        const byId = new Map(products.map((product) => [product.id, product]));
        let changed = false;
        const items = get().items.map((line) => {
          const product = byId.get(line.productId);
          if (!product) return line;
          const next: CartItem = {
            ...line,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: primaryImageOf(product).url,
            stock: product.stock,
            seriesName: product.seriesName,
            collectionNumber: product.collectionNumber,
            qty: product.stock > 0 ? clampQty(line.qty, product.stock, MAX_QTY_PER_ITEM) : line.qty,
          };
          const differs = (Object.keys(next) as Array<keyof CartItem>).some(
            (key) => next[key] !== line[key],
          );
          if (differs) changed = true;
          return differs ? next : line;
        });
        if (changed) set({ items });
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as { items?: unknown };
        const items = Array.isArray(stored.items) ? stored.items.filter(isCartItem) : [];
        return { ...current, items };
      },
    },
  ),
);

/* -------------------------------- Selectors ------------------------------- */

export const useCartItems = (): CartItem[] => useCartStore((state) => state.items);

/** Total units in the cart (navbar badge). */
export const useCartCount = (): number =>
  useCartStore((state) => state.items.reduce((sum, line) => sum + line.qty, 0));

/** Display subtotal in rupees. */
export const useCartSubtotal = (): number =>
  useCartStore((state) => computeOrderTotals(state.items).subtotal);

export const useCartLine = (productId: string): CartItem | undefined =>
  useCartStore((state) => state.items.find((line) => line.productId === productId));

/** Units of a product in the cart (0 when absent). */
export const useCartQty = (productId: string): number =>
  useCartStore((state) => state.items.find((line) => line.productId === productId)?.qty ?? 0);
