/**
 * Pure derivations for the My Garage dashboard: joining garage entries with products, collection
 * value, duplicates, series progress (missing models), breakdowns, sorting / filtering, tab
 * parsing and the level ladder. No React, no Firestore — everything here is unit tested.
 */
import { GARAGE_TABS, type GarageTab } from '@/config/routes';
import {
  BADGES,
  MAX_LEVEL,
  ORDER_BASE_XP,
  RARITY_XP_BONUS,
  XP_PER_CAR,
  computeGarageStats,
  levelForXp,
  levelTitle,
  seriesCompletion,
  xpForLevel,
} from '@/config/gamification';
import { CATEGORY_DISPLAY, CATEGORY_ORDER } from '@/config/site';
import { RARITY_LABELS, RARITY_ORDER } from '@/lib/product';
import { RARITIES } from '@shared/types';
import type { CategorySlug, GarageEntry, Product, Rarity, Series } from '@/types';

/* -------------------------------------------------------------------------- */
/*                                    Join                                    */
/* -------------------------------------------------------------------------- */

/** One garage entry with its product (null when the product document no longer exists). */
export interface GarageCarView {
  entry: GarageEntry;
  product: Product | null;
  /** Retired from the catalogue (`isActive === false`) or the product was deleted. */
  retired: boolean;
}

/** Joins entries (kept in their given order) with products by id. */
export function joinGarage(
  entries: readonly GarageEntry[],
  productsById: ReadonlyMap<string, Product>,
): GarageCarView[] {
  return entries.map((entry) => {
    const product = productsById.get(entry.productId) ?? null;
    return { entry, product, retired: !product || !product.isActive };
  });
}

/** Copies owned of one entry (never below 1, like the server's stats). */
export function copiesOf(car: Pick<GarageCarView, 'entry'>): number {
  const quantity = car.entry.quantity;
  return Number.isFinite(quantity) && quantity > 1 ? Math.floor(quantity) : 1;
}

/** Display name of a garage car (`Unknown model` for deleted products). */
export function carName(car: Pick<GarageCarView, 'product'>): string {
  return car.product?.name ?? 'Unknown model';
}

/** Current catalogue price × copies (0 when the product is gone). */
export function carValue(car: GarageCarView): number {
  return (car.product?.price ?? 0) * copiesOf(car);
}

/** Σ current price × quantity. */
export function collectionValue(cars: readonly GarageCarView[]): number {
  return cars.reduce((sum, car) => sum + carValue(car), 0);
}

/** Σ quantities (`carsOwned`). */
export function countCarsOwned(cars: readonly GarageCarView[]): number {
  return cars.reduce((sum, car) => sum + copiesOf(car), 0);
}

/* -------------------------------------------------------------------------- */
/*                                 Duplicates                                 */
/* -------------------------------------------------------------------------- */

export interface DuplicateRow {
  car: GarageCarView;
  copies: number;
  /** Copies beyond the first. */
  spares: number;
  /** Current value of the spare copies. */
  spareValue: number;
}

/** Entries with quantity > 1, most spares first (then by name). */
export function findDuplicates(cars: readonly GarageCarView[]): DuplicateRow[] {
  return cars
    .filter((car) => copiesOf(car) > 1)
    .map((car) => {
      const copies = copiesOf(car);
      const spares = copies - 1;
      return { car, copies, spares, spareValue: (car.product?.price ?? 0) * spares };
    })
    .sort((a, b) => b.spares - a.spares || carName(a.car).localeCompare(carName(b.car)));
}

/** `×2 — 1 spare`. */
export function duplicateLabel(copies: number): string {
  const spares = Math.max(0, copies - 1);
  return `×${copies} — ${spares} ${spares === 1 ? 'spare' : 'spares'}`;
}

/* -------------------------------------------------------------------------- */
/*                               Series progress                              */
/* -------------------------------------------------------------------------- */

export interface SeriesProgress {
  series: Series;
  owned: number;
  total: number;
  /** 0–100. */
  pct: number;
  complete: boolean;
  /** Missing cars that are still in the active catalogue, in series order. */
  missing: Product[];
  /** Missing cars that are no longer available (retired / unknown). */
  unavailable: number;
}

export interface SeriesProgressOptions {
  /** Only series with at least one owned car (the "missing models" panel). Default false. */
  startedOnly?: boolean;
}

/**
 * Completion of every series against the garage. Sorted: in progress (closest to complete first),
 * then complete series, then untouched ones; ties by series order.
 */
export function seriesProgressList(
  seriesList: readonly Series[],
  ownedIds: ReadonlySet<string>,
  catalogueById: ReadonlyMap<string, Product>,
  options: SeriesProgressOptions = {},
): SeriesProgress[] {
  const rows = seriesList.map((series, index) => {
    const completion = seriesCompletion(series, ownedIds);
    const missing: Product[] = [];
    let unavailable = 0;
    completion.missing.forEach((id) => {
      const product = catalogueById.get(id);
      if (product && product.isActive) missing.push(product);
      else unavailable += 1;
    });
    const row: SeriesProgress = {
      series,
      owned: completion.owned,
      total: completion.total,
      pct: completion.pct,
      complete: completion.complete,
      missing,
      unavailable,
    };
    return { row, index };
  });

  const rank = (row: SeriesProgress): number => {
    if (row.owned > 0 && !row.complete) return 0;
    if (row.complete) return 1;
    return 2;
  };

  return rows
    .filter(({ row }) => !options.startedOnly || row.owned > 0)
    .sort((a, b) => rank(a.row) - rank(b.row) || b.row.pct - a.row.pct || a.index - b.index)
    .map(({ row }) => row);
}

/** Series completed by the current garage (same rule as the server's `computeGarageStats`). */
export function countSeriesCompleted(
  cars: readonly GarageCarView[],
  seriesList: readonly Series[],
): number {
  return computeGarageStats(
    cars.map((car) => ({
      productId: car.entry.productId,
      quantity: copiesOf(car),
      category: car.product?.category ?? '',
      rarity: car.product?.rarity ?? '',
    })),
    seriesList,
  ).seriesCompleted;
}

/* -------------------------------------------------------------------------- */
/*                             Recently added etc.                            */
/* -------------------------------------------------------------------------- */

const addedAtOf = (car: GarageCarView): number => car.entry.addedAt ?? Number.NEGATIVE_INFINITY;

/** Newest first (entries without a timestamp last). */
export function recentlyAdded(cars: readonly GarageCarView[], limit = 5): GarageCarView[] {
  return [...cars]
    .sort((a, b) => addedAtOf(b) - addedAtOf(a) || carName(a).localeCompare(carName(b)))
    .slice(0, Math.max(0, limit));
}

/** The most valuable entry by price × copies, or null. */
export function mostValuable(cars: readonly GarageCarView[]): GarageCarView | null {
  return cars.reduce<GarageCarView | null>(
    (best, car) => (best === null || carValue(car) > carValue(best) ? car : best),
    null,
  );
}

/* -------------------------------------------------------------------------- */
/*                              Filter and sort                               */
/* -------------------------------------------------------------------------- */

export type CollectionFilter = 'all' | 'favorites' | 'duplicates';
export type CollectionSort = 'recent' | 'name' | 'value' | 'rarity';

export const COLLECTION_FILTERS: ReadonlyArray<{ id: CollectionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'duplicates', label: 'Duplicates' },
];

export const COLLECTION_SORTS: ReadonlyArray<{ value: CollectionSort; label: string }> = [
  { value: 'recent', label: 'Recently added' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'value', label: 'Value (high to low)' },
  { value: 'rarity', label: 'Rarity (rarest first)' },
];

export function isCollectionSort(value: string): value is CollectionSort {
  return COLLECTION_SORTS.some((option) => option.value === value);
}

export function filterCars(
  cars: readonly GarageCarView[],
  filter: CollectionFilter,
): GarageCarView[] {
  switch (filter) {
    case 'favorites':
      return cars.filter((car) => car.entry.isFavorite);
    case 'duplicates':
      return cars.filter((car) => copiesOf(car) > 1);
    default:
      return [...cars];
  }
}

const rarityRank = (car: GarageCarView): number =>
  car.product ? (RARITY_ORDER[car.product.rarity] ?? 0) : -1;

export function sortCars(cars: readonly GarageCarView[], sort: CollectionSort): GarageCarView[] {
  const byName = (a: GarageCarView, b: GarageCarView): number =>
    carName(a).localeCompare(carName(b));
  const sorted = [...cars];
  switch (sort) {
    case 'name':
      return sorted.sort(byName);
    case 'value':
      return sorted.sort((a, b) => carValue(b) - carValue(a) || byName(a, b));
    case 'rarity':
      return sorted.sort(
        (a, b) =>
          rarityRank(b) - rarityRank(a) ||
          (b.product?.rarityScore ?? 0) - (a.product?.rarityScore ?? 0) ||
          byName(a, b),
      );
    default:
      return sorted.sort((a, b) => addedAtOf(b) - addedAtOf(a) || byName(a, b));
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Breakdowns                                 */
/* -------------------------------------------------------------------------- */

export interface BreakdownRow<K extends string = string> {
  key: K;
  label: string;
  /** Cars (copies) in this bucket. */
  count: number;
  /** Share of all cars, 0–100. */
  share: number;
  /** Relative to the largest bucket, 0–100 (bar width). */
  ratio: number;
}

function buildBreakdown<K extends string>(
  cars: readonly GarageCarView[],
  keys: readonly K[],
  keyOf: (product: Product) => K,
  labelOf: (key: K) => string,
): BreakdownRow<K>[] {
  const counts = new Map<K, number>(keys.map((key) => [key, 0]));
  let total = 0;
  cars.forEach((car) => {
    if (!car.product) return;
    const key = keyOf(car.product);
    const copies = copiesOf(car);
    counts.set(key, (counts.get(key) ?? 0) + copies);
    total += copies;
  });
  const max = Math.max(0, ...counts.values());
  return keys.map((key) => {
    const count = counts.get(key) ?? 0;
    return {
      key,
      label: labelOf(key),
      count,
      share: total === 0 ? 0 : (count / total) * 100,
      ratio: max === 0 ? 0 : (count / max) * 100,
    };
  });
}

/** Cars per category, in storefront order (every category listed, zeros included). */
export function categoryBreakdown(cars: readonly GarageCarView[]): BreakdownRow<CategorySlug>[] {
  return buildBreakdown(
    cars,
    CATEGORY_ORDER,
    (product) => product.category,
    (key) => CATEGORY_DISPLAY[key]?.label ?? key.toUpperCase(),
  );
}

/** Cars per rarity, common → limited. */
export function rarityBreakdown(cars: readonly GarageCarView[]): BreakdownRow<Rarity>[] {
  return buildBreakdown(
    cars,
    RARITIES,
    (product) => product.rarity,
    (key) => RARITY_LABELS[key] ?? key.toUpperCase(),
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Dashboard                                 */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  carsOwned: number;
  uniqueCars: number;
  seriesCompleted: number;
  seriesTotal: number;
  favorites: number;
  wishlist: number;
  value: number;
  spares: number;
  retired: number;
}

export function computeDashboardStats(
  cars: readonly GarageCarView[],
  seriesList: readonly Series[],
  wishlistCount: number,
): DashboardStats {
  const carsOwned = countCarsOwned(cars);
  return {
    carsOwned,
    uniqueCars: cars.length,
    seriesCompleted: countSeriesCompleted(cars, seriesList),
    seriesTotal: seriesList.length,
    favorites: cars.filter((car) => car.entry.isFavorite).length,
    wishlist: Math.max(0, wishlistCount),
    value: collectionValue(cars),
    spares: carsOwned - cars.length,
    retired: cars.filter((car) => car.retired).length,
  };
}

/* -------------------------------------------------------------------------- */
/*                                    Tabs                                    */
/* -------------------------------------------------------------------------- */

export function isGarageTab(value: string | null | undefined): value is GarageTab {
  return value != null && (GARAGE_TABS as readonly string[]).includes(value);
}

/** `?tab=` → a valid tab (unknown / missing → `collection`). */
export function parseGarageTab(value: string | null | undefined): GarageTab {
  return isGarageTab(value) ? value : 'collection';
}

/* -------------------------------------------------------------------------- */
/*                               Levels and XP                                */
/* -------------------------------------------------------------------------- */

export interface LevelStep {
  level: number;
  title: string;
  /** Total XP required to reach the level. */
  threshold: number;
  /** XP still needed from the current total. */
  remaining: number;
}

/** The next `count` levels after the one `xp` is in (fewer near the cap). */
export function upcomingLevels(xp: number, count = 3): LevelStep[] {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  const current = levelForXp(total);
  const steps: LevelStep[] = [];
  for (let level = current + 1; level <= Math.min(MAX_LEVEL, current + count); level += 1) {
    const threshold = xpForLevel(level);
    steps.push({
      level,
      title: levelTitle(level),
      threshold,
      remaining: Math.max(0, threshold - total),
    });
  }
  return steps;
}

/** Header tachometer needle from level progress: idle 1,000 rpm → 9,000 rpm at the next level. */
export function progressToRpm(pct: number): number {
  const safe = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
  return 1000 + safe * 80;
}

export interface XpRule {
  id: string;
  label: string;
  detail: string;
  xp: number;
  /** `+25 XP` vs `+25 XP each`. */
  per?: 'order' | 'car' | 'badge';
}

/** "How to earn XP" rows, straight from the shared constants (server uses the same values). */
export function buildXpRules(): XpRule[] {
  const rarityRules: XpRule[] = RARITIES.filter((rarity) => RARITY_XP_BONUS[rarity] > 0).map(
    (rarity) => ({
      id: `rarity-${rarity}`,
      label: `${RARITY_LABELS[rarity]} bonus`,
      detail: `Extra XP for every ${RARITY_LABELS[rarity].toLowerCase()} car you buy.`,
      xp: RARITY_XP_BONUS[rarity],
      per: 'car',
    }),
  );
  return [
    {
      id: 'order',
      label: 'Place an order',
      detail: 'Every order you place through checkout.',
      xp: ORDER_BASE_XP,
      per: 'order',
    },
    {
      id: 'car',
      label: 'Every car purchased',
      detail: 'Each car in an order, duplicates included.',
      xp: XP_PER_CAR,
      per: 'car',
    },
    ...rarityRules,
    ...BADGES.map<XpRule>((badge) => ({
      id: `badge-${badge.id}`,
      label: badge.title,
      detail: badge.requirement,
      xp: badge.xpReward,
      per: 'badge',
    })),
  ];
}
