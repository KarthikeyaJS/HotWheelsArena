/**
 * Vault filtering & sorting (pure). Remaining counts are static values from the product docs
 * (`limitedEdition` + `stock`); nothing here ticks down live.
 */
import { limitedEditionInfo } from '@/lib/product';
import type { Product } from '@/types';

export const VAULT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'sold-out', label: 'Sold out' },
] as const;

export type VaultFilter = (typeof VAULT_FILTERS)[number]['id'];

export const VAULT_SORTS = [
  { id: 'remaining-asc', label: 'Fewest remaining' },
  { id: 'remaining-desc', label: 'Most remaining' },
] as const;

export type VaultSort = (typeof VAULT_SORTS)[number]['id'];

export const DEFAULT_VAULT_FILTER: VaultFilter = 'all';
export const DEFAULT_VAULT_SORT: VaultSort = 'remaining-asc';

export function parseVaultFilter(value: string | null | undefined): VaultFilter {
  return VAULT_FILTERS.find((filter) => filter.id === value)?.id ?? DEFAULT_VAULT_FILTER;
}

export function parseVaultSort(value: string | null | undefined): VaultSort {
  return VAULT_SORTS.find((sort) => sort.id === value)?.id ?? DEFAULT_VAULT_SORT;
}

/** Cars left in the edition (static), or plain stock for vault cars without an edition. */
export function vaultRemaining(product: Pick<Product, 'limitedEdition' | 'stock'>): number {
  const info = limitedEditionInfo(product);
  if (info) return info.remaining;
  return Number.isFinite(product.stock) ? Math.max(0, Math.floor(product.stock)) : 0;
}

export function isVaultSoldOut(product: Pick<Product, 'limitedEdition' | 'stock'>): boolean {
  return vaultRemaining(product) <= 0;
}

export function filterVaultProducts(products: readonly Product[], filter: VaultFilter): Product[] {
  switch (filter) {
    case 'available':
      return products.filter((product) => !isVaultSoldOut(product));
    case 'sold-out':
      return products.filter((product) => isVaultSoldOut(product));
    default:
      return [...products];
  }
}

const editionSize = (product: Product): number =>
  product.limitedEdition?.editionSize ?? Number.POSITIVE_INFINITY;

/**
 * Sort by remaining count. Ties: the smaller (rarer) run first, then name. Sold-out editions
 * always sink to the end so available cars lead either way.
 */
export function sortVaultProducts(products: readonly Product[], sort: VaultSort): Product[] {
  const direction = sort === 'remaining-desc' ? -1 : 1;
  return [...products].sort((a, b) => {
    const soldA = isVaultSoldOut(a);
    const soldB = isVaultSoldOut(b);
    if (soldA !== soldB) return soldA ? 1 : -1;
    const byRemaining = (vaultRemaining(a) - vaultRemaining(b)) * direction;
    if (byRemaining !== 0) return byRemaining;
    const bySize = editionSize(a) - editionSize(b);
    if (bySize !== 0 && Number.isFinite(bySize)) return bySize;
    return a.name.localeCompare(b.name);
  });
}

export interface VaultCounts {
  all: number;
  available: number;
  'sold-out': number;
}

export function vaultCounts(products: readonly Product[]): VaultCounts {
  const soldOut = products.filter((product) => isVaultSoldOut(product)).length;
  return { all: products.length, available: products.length - soldOut, 'sold-out': soldOut };
}

export interface VaultSummary {
  editions: number;
  /** Σ remaining across available editions. */
  remaining: number;
  /** Σ edition sizes (numbered runs only). */
  totalRun: number;
  /** Claimed share of all numbered runs, 0–100. */
  claimedPct: number;
  /** Smallest numbered run size, or null when there are none. */
  rarestRun: number | null;
}

/** Headline numbers for the vault hero HUD. */
export function vaultSummary(products: readonly Product[]): VaultSummary {
  let remaining = 0;
  let totalRun = 0;
  let editionRemaining = 0;
  let rarestRun: number | null = null;
  for (const product of products) {
    const left = vaultRemaining(product);
    remaining += left;
    const info = limitedEditionInfo(product);
    if (info) {
      totalRun += info.editionSize;
      editionRemaining += info.remaining;
      rarestRun = rarestRun === null ? info.editionSize : Math.min(rarestRun, info.editionSize);
    }
  }
  const claimedPct = totalRun > 0 ? ((totalRun - editionRemaining) / totalRun) * 100 : 0;
  return { editions: products.length, remaining, totalRun, claimedPct, rarestRun };
}
