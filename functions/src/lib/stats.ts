/**
 * Collector stats derived from the full garage (joined with product category / rarity) and the
 * active series list. Order counters (`ordersPlaced`, `totalSpent`) are not derivable from the
 * garage, so they are carried over from the previous stats (plus optional increments).
 */
import {
  computeGarageStats,
  normalizeStats,
  roundCurrency,
  type GarageStatsSeries,
  type UserStats,
} from '../../../shared/index.js';
import type { GarageRecord } from './firestoreData.js';

/** The product fields stats depend on. `null` = product document missing (still counted as owned). */
export type StatsProduct = { category: string; rarity: string } | null;

export interface OrderIncrements {
  ordersPlaced?: number;
  /** Rupees to add to `totalSpent`. */
  totalSpent?: number;
}

export function computeUserStats(
  garage: Iterable<Pick<GarageRecord, 'productId' | 'quantity'>>,
  products: ReadonlyMap<string, StatsProduct>,
  seriesList: readonly GarageStatsSeries[],
  previous: Partial<UserStats> | null | undefined,
  increments: OrderIncrements = {},
): UserStats {
  const entries = Array.from(garage, (entry) => {
    const product = products.get(entry.productId) ?? null;
    return {
      productId: entry.productId,
      quantity: entry.quantity,
      category: product?.category ?? '',
      rarity: product?.rarity ?? '',
    };
  });
  const derived = computeGarageStats(entries, seriesList);
  const prev = normalizeStats(previous);
  const addOrders = Math.max(0, Math.floor(increments.ordersPlaced ?? 0));
  const addSpent = Math.max(0, increments.totalSpent ?? 0);
  return {
    carsOwned: derived.carsOwned,
    uniqueCars: derived.uniqueCars,
    seriesCompleted: derived.seriesCompleted,
    ordersPlaced: prev.ordersPlaced + addOrders,
    racingCars: derived.racingCars,
    rareCars: derived.rareCars,
    totalSpent: roundCurrency(prev.totalSpent + addSpent),
  };
}

const STAT_KEYS: ReadonlyArray<keyof UserStats> = [
  'carsOwned',
  'uniqueCars',
  'seriesCompleted',
  'ordersPlaced',
  'racingCars',
  'rareCars',
  'totalSpent',
];

export function statsEqual(a: UserStats, b: UserStats): boolean {
  return STAT_KEYS.every((key) => a[key] === b[key]);
}
