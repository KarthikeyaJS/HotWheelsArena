/**
 * "Build Your Garage" teaser numbers: sample stats for visitors, the collector's real stats when
 * signed in.
 */
import type { GarageCar, UserProfile } from '@/types';

export interface GarageTeaserStats {
  carsOwned: number;
  seriesCompleted: number;
  /** ₹ — `null` while the garage is still loading. */
  collectionValue: number | null;
  level: number;
}

/** Demo garage shown to signed-out visitors. */
export const SAMPLE_GARAGE_STATS: Readonly<GarageTeaserStats> = {
  carsOwned: 42,
  seriesCompleted: 3,
  collectionValue: 18400,
  level: 7,
};

/** Σ price × quantity over the parked cars (duplicates count). */
export function collectionValueOf(cars: readonly GarageCar[]): number {
  return cars.reduce(
    (total, car) => total + Math.max(0, car.product.price) * Math.max(1, car.entry.quantity),
    0,
  );
}

export function garageTeaserStats(
  profile: UserProfile,
  cars: readonly GarageCar[] | null,
): GarageTeaserStats {
  return {
    carsOwned: profile.stats.carsOwned,
    seriesCompleted: profile.stats.seriesCompleted,
    collectionValue: cars ? collectionValueOf(cars) : null,
    level: profile.level,
  };
}

/** Speedometer scale that always leaves headroom above the current count. */
export function garageDialMax(carsOwned: number): number {
  return Math.max(60, Math.ceil((Math.max(0, carsOwned) * 1.4) / 20) * 20);
}
