/**
 * Picks the Collector's Vault line-up for the home page: the lowest numbered edition leads
 * (the `#001` piece), the rest follow by scarcity (fewest remaining first, sold-out last).
 */
import type { Product } from '@/types';

export const HOME_VAULT_COUNT = 4;

const remainingOf = (product: Product): number =>
  product.stock > 0 ? product.stock : Number.POSITIVE_INFINITY;

const editionNumberOf = (product: Product): number =>
  product.limitedEdition?.editionNumber ?? Number.POSITIVE_INFINITY;

function byScarcity(a: Product, b: Product): number {
  return remainingOf(a) - remainingOf(b) || a.name.localeCompare(b.name);
}

export interface VaultLineup {
  lead: Product | null;
  rest: Product[];
}

export function pickVaultLineup(
  products: readonly Product[],
  count = HOME_VAULT_COUNT,
): VaultLineup {
  const vault = products.filter((product) => product.isVault);
  if (vault.length === 0 || count <= 0) return { lead: null, rest: [] };

  const available = vault.filter((product) => product.stock > 0);
  const pool = available.length > 0 ? available : vault;
  const lead =
    [...pool].sort((a, b) => editionNumberOf(a) - editionNumberOf(b) || byScarcity(a, b))[0] ??
    null;
  const rest = vault
    .filter((product) => product !== lead)
    .sort(byScarcity)
    .slice(0, Math.max(0, count - 1));
  return { lead, rest };
}
