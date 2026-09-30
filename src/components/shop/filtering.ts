/**
 * Pure catalogue filtering for /shop and /search: view + category base, rail filters, standard
 * faceting (each group counted with every OTHER group applied), sorting and price bounds.
 * Framework-free and synchronous — the catalogue is small and cached (`useProducts()`).
 */
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_ORDER,
  SORT_OPTION_MAP,
  getShopView,
} from '@/config/shop';
import type { ShopViewId, SortId } from '@/config/shop';
import { rarityLabel, stockStatus } from '@/lib/product';
import { RARITIES } from '@shared/types';
import type { CategorySlug, Product, Rarity, StockStatus } from '@/types';

/** Multi-select rail groups (URL: comma-separated lists). */
export const LIST_FACET_KEYS = [
  'make',
  'model',
  'series',
  'year',
  'color',
  'scale',
  'rarity',
  'availability',
] as const;

export type ListFacetKey = (typeof LIST_FACET_KEYS)[number];

/** Everything that narrows the grid (sort, paging and the text query live beside it). */
export interface ProductFilters {
  view: ShopViewId;
  /** Extra category filter (only when the view does not already represent it). */
  category: CategorySlug | null;
  make: string[];
  model: string[];
  /** Series ids (== slugs). */
  series: string[];
  /** Years as strings (`'2026'`), matching the URL. */
  year: string[];
  color: string[];
  scale: string[];
  rarity: Rarity[];
  availability: StockStatus[];
  /** Whole rupees; `null` = open. */
  priceMin: number | null;
  priceMax: number | null;
}

export function createEmptyFilters(view: ShopViewId = 'all'): ProductFilters {
  return {
    view,
    category: null,
    make: [],
    model: [],
    series: [],
    year: [],
    color: [],
    scale: [],
    rarity: [],
    availability: [],
    priceMin: null,
    priceMax: null,
  };
}

/** Case/space-insensitive key for comparing facet values (URLs may be typed by hand). */
export function normalizeFacetValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The product's value for a facet group. */
export function facetValueOf(product: Product, key: ListFacetKey): string {
  switch (key) {
    case 'make':
      return product.make.trim();
    case 'model':
      return product.model.trim();
    case 'series':
      return product.series;
    case 'year':
      return String(product.year);
    case 'color':
      return product.color.trim();
    case 'scale':
      return product.scale.trim();
    case 'rarity':
      return product.rarity;
    case 'availability':
      return stockStatus(product.stock).status;
  }
}

export function isPriceFilterActive(
  filters: Pick<ProductFilters, 'priceMin' | 'priceMax'>,
): boolean {
  return filters.priceMin !== null || filters.priceMax !== null;
}

/** Number of active rail filters + category + price (for "FILTERS (3)"). */
export function countActiveFilters(filters: ProductFilters): number {
  return (
    LIST_FACET_KEYS.reduce((total, key) => total + filters[key].length, 0) +
    (isPriceFilterActive(filters) ? 1 : 0) +
    (filters.category ? 1 : 0)
  );
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/** Same view, everything else cleared. */
export function clearFilters(filters: ProductFilters): ProductFilters {
  return createEmptyFilters(filters.view);
}

/** View predicate + extra category. */
export function matchesBase(
  product: Product,
  filters: Pick<ProductFilters, 'view' | 'category'>,
): boolean {
  if (filters.category && product.category !== filters.category) return false;
  return getShopView(filters.view).predicate(product);
}

type Skip = ListFacetKey | 'price' | null;

function selectedSets(filters: ProductFilters): Record<ListFacetKey, Set<string>> {
  const sets = {} as Record<ListFacetKey, Set<string>>;
  for (const key of LIST_FACET_KEYS) {
    sets[key] = new Set(filters[key].map((value) => normalizeFacetValue(value)));
  }
  return sets;
}

function matchesRail(
  product: Product,
  filters: ProductFilters,
  sets: Record<ListFacetKey, Set<string>>,
  skip: Skip,
): boolean {
  for (const key of LIST_FACET_KEYS) {
    if (key === skip) continue;
    const set = sets[key];
    if (set.size > 0 && !set.has(normalizeFacetValue(facetValueOf(product, key)))) return false;
  }
  if (skip !== 'price') {
    if (filters.priceMin !== null && product.price < filters.priceMin) return false;
    if (filters.priceMax !== null && product.price > filters.priceMax) return false;
  }
  return true;
}

/** Products matching the view, category and every rail filter (input order preserved). */
export function applyFilters(products: readonly Product[], filters: ProductFilters): Product[] {
  const sets = selectedSets(filters);
  return products.filter(
    (product) => matchesBase(product, filters) && matchesRail(product, filters, sets, null),
  );
}

/* ─────────────────────────────── Price ─────────────────────────────── */

export interface PriceBounds {
  min: number;
  max: number;
}

/** Lowest / highest price in `products` (whole rupees), or null when empty. */
export function priceBounds(products: readonly Product[]): PriceBounds | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const product of products) {
    if (!Number.isFinite(product.price)) continue;
    min = Math.min(min, product.price);
    max = Math.max(max, product.price);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min: Math.floor(min), max: Math.ceil(max) };
}

export type PriceRange = [number, number];

/** Slider position for the current price filter, clamped to `bounds`. */
export function priceToRange(
  filters: Pick<ProductFilters, 'priceMin' | 'priceMax'>,
  bounds: PriceBounds,
): PriceRange {
  const clamp = (value: number): number => Math.min(bounds.max, Math.max(bounds.min, value));
  const low = clamp(filters.priceMin ?? bounds.min);
  const high = clamp(filters.priceMax ?? bounds.max);
  return low <= high ? [low, high] : [high, low];
}

/** Price filter for a slider position: ends touching the bounds stay open (`null`). */
export function rangeToPrice(
  range: readonly [number, number],
  bounds: PriceBounds,
): Pick<ProductFilters, 'priceMin' | 'priceMax'> {
  const low = Math.round(Math.min(range[0], range[1]));
  const high = Math.round(Math.max(range[0], range[1]));
  return {
    priceMin: low > bounds.min ? low : null,
    priceMax: high < bounds.max ? high : null,
  };
}

/* ─────────────────────────────── Facets ─────────────────────────────── */

export interface FacetOption {
  /** Canonical value (as written to the URL). */
  value: string;
  /** Default display label (series → series name; rarity/availability → labels). */
  label: string;
  /** Matches if this option were toggled on with all OTHER groups applied. */
  count: number;
  selected: boolean;
  /** No matches and not selected → shown disabled. */
  disabled: boolean;
  /** Series only: the series year (for labels / ordering). */
  year?: number;
}

export type Facets = Record<ListFacetKey, FacetOption[]> & {
  /** Price range of the view (before rail filters), or null when the view is empty. */
  price: PriceBounds | null;
  /** Products in the view before rail filters. */
  baseCount: number;
  /** Products after every filter. */
  resultCount: number;
};

const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

/** `1:64` → 64 (larger denominators = smaller cars; mainline 1:64 first). */
function scaleDenominator(scale: string): number {
  const match = /^\s*1\s*:\s*(\d+(?:\.\d+)?)\s*$/.exec(scale);
  return match?.[1] ? Number(match[1]) : 0;
}

interface OptionSeed {
  value: string;
  label: string;
  year?: number;
}

function optionLabel(key: ListFacetKey, value: string, product?: Product): string {
  switch (key) {
    case 'series':
      return product?.seriesName || value;
    case 'rarity':
      return rarityLabel(value as Rarity);
    case 'availability':
      return AVAILABILITY_LABELS[value as StockStatus] ?? value;
    default:
      return value;
  }
}

function sortSeeds(key: ListFacetKey, seeds: OptionSeed[]): OptionSeed[] {
  switch (key) {
    case 'rarity': {
      const order = new Map<string, number>(RARITIES.map((rarity, index) => [rarity, index]));
      return seeds.sort((a, b) => (order.get(a.value) ?? 99) - (order.get(b.value) ?? 99));
    }
    case 'availability': {
      const order = new Map<string, number>(
        AVAILABILITY_ORDER.map((status, index) => [status, index]),
      );
      return seeds.sort((a, b) => (order.get(a.value) ?? 99) - (order.get(b.value) ?? 99));
    }
    case 'year':
      return seeds.sort((a, b) => Number(b.value) - Number(a.value));
    case 'scale':
      return seeds.sort(
        (a, b) =>
          scaleDenominator(b.value) - scaleDenominator(a.value) || naturalCompare(a.value, b.value),
      );
    case 'series':
      return seeds.sort(
        (a, b) => (b.year ?? 0) - (a.year ?? 0) || naturalCompare(a.label, b.label),
      );
    default:
      return seeds.sort((a, b) => naturalCompare(a.label, b.label));
  }
}

/**
 * Facet options with counts for every rail group. Options come from the view's products (so they
 * don't vanish while filtering; zero-count options are disabled), plus any selected value the
 * view doesn't contain (so it can still be removed). MODEL options are narrowed to the selected
 * makes. Rarity and availability always list every level.
 */
export function computeFacets(products: readonly Product[], filters: ProductFilters): Facets {
  const base = products.filter((product) => matchesBase(product, filters));
  const sets = selectedSets(filters);

  const build = (key: ListFacetKey): FacetOption[] => {
    const pool = base.filter((product) => matchesRail(product, filters, sets, key));
    const counts = new Map<string, number>();
    for (const product of pool) {
      const normalized = normalizeFacetValue(facetValueOf(product, key));
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    const seeds = new Map<string, OptionSeed>();
    const optionSource =
      key === 'model' && sets.make.size > 0
        ? base.filter((product) => sets.make.has(normalizeFacetValue(product.make)))
        : base;
    for (const product of optionSource) {
      const value = facetValueOf(product, key);
      const normalized = normalizeFacetValue(value);
      if (!value || seeds.has(normalized)) continue;
      seeds.set(normalized, {
        value,
        label: optionLabel(key, value, product),
        ...(key === 'series' ? { year: product.year } : {}),
      });
    }
    if (key === 'rarity') {
      for (const rarity of RARITIES) {
        if (!seeds.has(rarity)) seeds.set(rarity, { value: rarity, label: rarityLabel(rarity) });
      }
    }
    if (key === 'availability') {
      for (const status of AVAILABILITY_ORDER) {
        if (!seeds.has(status))
          seeds.set(status, { value: status, label: AVAILABILITY_LABELS[status] });
      }
    }
    for (const value of filters[key]) {
      const normalized = normalizeFacetValue(value);
      if (!seeds.has(normalized)) {
        seeds.set(normalized, { value, label: optionLabel(key, value) });
      }
    }

    return sortSeeds(key, [...seeds.values()]).map((seed) => {
      const normalized = normalizeFacetValue(seed.value);
      const count = counts.get(normalized) ?? 0;
      const selected = sets[key].has(normalized);
      return { ...seed, count, selected, disabled: count === 0 && !selected };
    });
  };

  const facets = {} as Record<ListFacetKey, FacetOption[]>;
  for (const key of LIST_FACET_KEYS) facets[key] = build(key);

  return {
    ...facets,
    price: priceBounds(base),
    baseCount: base.length,
    resultCount: base.filter((product) => matchesRail(product, filters, sets, null)).length,
  };
}

/* ─────────────────────────────── Sorting ─────────────────────────────── */

/** New sorted array (stable). `relevance` keeps the incoming (search-ranked) order. */
export function sortProducts(products: readonly Product[], sort: SortId): Product[] {
  const compare = SORT_OPTION_MAP[sort]?.compare ?? null;
  const copy = [...products];
  return compare ? copy.sort(compare) : copy;
}
