/** Pure helpers for the wishlist grid (shared by /wishlist and the garage WISHLIST tab). */
import { MAX_QTY_PER_ITEM } from '@shared/commerce';
import { formatNumber } from '@/lib/format';
import { compareByRarityDesc } from '@/lib/product';
import type { Product } from '@/types';

export type WishlistSort = 'recent' | 'price-asc' | 'price-desc' | 'rarity';

export const WISHLIST_SORTS: ReadonlyArray<{ value: WishlistSort; label: string }> = [
  { value: 'recent', label: 'Recently saved' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  { value: 'rarity', label: 'Rarity (rarest first)' },
];

export function isWishlistSort(value: string): value is WishlistSort {
  return WISHLIST_SORTS.some((option) => option.value === value);
}

/**
 * Sorted copy. Retired products always sink to the end; `recent` uses the wishlist `addedAt`
 * (newest first, unknown last).
 */
export function sortWishlist(
  products: readonly Product[],
  sort: WishlistSort,
  addedAtById: ReadonlyMap<string, number | null>,
): Product[] {
  const addedAt = (product: Product): number =>
    addedAtById.get(product.id) ?? Number.NEGATIVE_INFINITY;
  const byName = (a: Product, b: Product): number => a.name.localeCompare(b.name);
  const compare = (a: Product, b: Product): number => {
    switch (sort) {
      case 'price-asc':
        return a.price - b.price || byName(a, b);
      case 'price-desc':
        return b.price - a.price || byName(a, b);
      case 'rarity':
        return compareByRarityDesc(a, b) || b.rarityScore - a.rarityScore || byName(a, b);
      default:
        return addedAt(b) - addedAt(a) || byName(a, b);
    }
  };
  return [...products].sort((a, b) => Number(!a.isActive) - Number(!b.isActive) || compare(a, b));
}

/** Result of moving one wishlisted car to the pit stop. */
export type MoveOutcome = 'moved' | 'sold-out' | 'unavailable' | 'capped';

/**
 * Toast for a car that could not be moved. Every refusal used to say "Max per collector reached",
 * even for a sold-out or retired car, or one capped by its stock rather than the per-order cap.
 */
export function blockedMoveToast(
  outcome: Exclude<MoveOutcome, 'moved'>,
  product: Pick<Product, 'name' | 'stock'>,
): { title: string; description: string } {
  if (outcome === 'sold-out') return { title: 'Sold out', description: product.name };
  if (outcome === 'unavailable') {
    return { title: 'No longer available', description: product.name };
  }
  return product.stock < MAX_QTY_PER_ITEM
    ? { title: `Only ${formatNumber(product.stock)} in stock`, description: product.name }
    : { title: 'Max per collector reached', description: product.name };
}
