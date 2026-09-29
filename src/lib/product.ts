/**
 * Product domain helpers (pure). Used by product cards, detail page, cart and garage.
 */
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import { isRareRarity } from '@shared/gamification';
import type {
  CartItem,
  LimitedEditionInfo,
  Product,
  ProductImage,
  Rarity,
  StockInfo,
} from '@/types';
import { formatCollectionNumber, formatEdition, formatNumber, formatSeriesLabel } from './format';

/** Stock at or below this (and above 0) is "low". */
export const LOW_STOCK_THRESHOLD = 10;

export function isSoldOut(stock: number): boolean {
  return !Number.isFinite(stock) || stock <= 0;
}

export function isLowStock(stock: number): boolean {
  return !isSoldOut(stock) && stock <= LOW_STOCK_THRESHOLD;
}

/** Stock status + label: `IN STOCK` / `ONLY 3 LEFT` / `SOLD OUT`. */
export function stockStatus(stock: number): StockInfo {
  if (isSoldOut(stock)) return { status: 'sold-out', label: 'SOLD OUT' };
  if (isLowStock(stock)) return { status: 'low', label: `ONLY ${formatNumber(stock)} LEFT` };
  return { status: 'in-stock', label: 'IN STOCK' };
}

/** Sort rank: common 0 → limited 3. */
export const RARITY_ORDER: Readonly<Record<Rarity, number>> = {
  common: 0,
  rare: 1,
  'super-rare': 2,
  limited: 3,
};

export const RARITY_LABELS: Readonly<Record<Rarity, string>> = {
  common: 'COMMON',
  rare: 'RARE',
  'super-rare': 'SUPER RARE',
  limited: 'LIMITED',
};

export function rarityLabel(rarity: Rarity): string {
  return RARITY_LABELS[rarity] ?? String(rarity).toUpperCase();
}

/** Comparator: rarest first. */
export function compareByRarityDesc(
  a: Pick<Product, 'rarity'>,
  b: Pick<Product, 'rarity'>,
): number {
  return (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0);
}

/** rare | super-rare | limited (yellow highlight territory). */
export function isRare(productOrRarity: Pick<Product, 'rarity'> | Rarity): boolean {
  const rarity = typeof productOrRarity === 'string' ? productOrRarity : productOrRarity.rarity;
  return isRareRarity(rarity);
}

/** The primary `ProductImage` (matching `primaryImage`, else first image, else a placeholder). */
export function primaryImageOf(
  product: Pick<Product, 'images' | 'primaryImage' | 'name'>,
): ProductImage {
  const match = product.images.find((image) => image.url === product.primaryImage);
  const first = match ?? product.images[0];
  if (first) return { ...first, alt: first.alt || product.name };
  return { publicId: '', url: product.primaryImage || FALLBACK_CAR_IMAGE, alt: product.name };
}

/** Cart line (without qty) from a product. */
export function toCartItem(product: Product): Omit<CartItem, 'qty'> {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: primaryImageOf(product).url,
    stock: product.stock,
    seriesName: product.seriesName,
    collectionNumber: product.collectionNumber,
  };
}

/**
 * Related cars ranked by similarity: same series (+3), same category (+2), same make (+2),
 * same rarity (+1); ties broken by collector score. Excludes the product itself and inactive ones.
 */
export function getRelatedProducts(
  product: Product,
  all: readonly Product[],
  limit = 8,
): Product[] {
  return all
    .filter((candidate) => candidate.id !== product.id && candidate.isActive)
    .map((candidate) => {
      let score = 0;
      if (candidate.series === product.series) score += 3;
      if (candidate.category === product.category) score += 2;
      if (candidate.make.toLowerCase() === product.make.toLowerCase()) score += 2;
      if (candidate.rarity === product.rarity) score += 1;
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.collectorScore - a.candidate.collectorScore)
    .slice(0, Math.max(0, limit))
    .map(({ candidate }) => candidate);
}

/** Whole-number discount % when `compareAtPrice` > `price`, else null. */
export function discountPercent(product: Pick<Product, 'price' | 'compareAtPrice'>): number | null {
  const { price, compareAtPrice } = product;
  if (compareAtPrice == null || compareAtPrice <= price || compareAtPrice <= 0) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Vault edition info (`#001/500`, remaining, claimed %) or null for non-limited products. */
export function limitedEditionInfo(
  product: Pick<Product, 'limitedEdition' | 'stock'>,
): LimitedEditionInfo | null {
  const edition = product.limitedEdition;
  if (!edition || edition.editionSize <= 0) return null;
  const remaining = Math.max(0, Math.min(Math.floor(product.stock), edition.editionSize));
  const claimedPct = Math.min(
    100,
    Math.max(0, ((edition.editionSize - remaining) / edition.editionSize) * 100),
  );
  return {
    label: formatEdition(edition.editionNumber, edition.editionSize),
    editionNumber: edition.editionNumber,
    editionSize: edition.editionSize,
    remaining,
    claimedPct,
  };
}

/** `HW EXOTICS · 2026 SERIES`. */
export function productMetaLine(product: Pick<Product, 'seriesName' | 'year'>): string {
  return `${product.seriesName.toUpperCase()} · ${product.year} SERIES`;
}

/** `SERIES 03  #142` HUD line. */
export function productHudLine(product: Pick<Product, 'seriesNumber' | 'collectionNumber'>): {
  series: string;
  collection: string;
} {
  return {
    series: formatSeriesLabel(product.seriesNumber),
    collection: formatCollectionNumber(product.collectionNumber),
  };
}

export interface ProductSpec {
  label: string;
  value: string;
}

/** Spec table rows: SCALE, YEAR, SERIES, COLOR, MATERIAL, TYPE. */
export function productSpecs(product: Product): ProductSpec[] {
  return [
    { label: 'SCALE', value: product.scale },
    { label: 'YEAR', value: String(product.year) },
    { label: 'SERIES', value: product.seriesName },
    { label: 'COLOR', value: product.color },
    { label: 'MATERIAL', value: product.material },
    { label: 'TYPE', value: product.vehicleType },
  ].filter((spec) => spec.value !== '');
}
