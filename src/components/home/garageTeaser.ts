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

/**
 * Dial step: the speedometer labels a major tick every `max / 8`, so the maximum is a multiple
 * of 40 to keep every label a whole multiple of 5 (`0 10 20 … 80`, never `8 15 23 …`).
 */
const DIAL_STEP = 40;

/** Speedometer scale that always leaves headroom above the current count (≥ 80, step 40). */
export function garageDialMax(carsOwned: number): number {
  const safe = Number.isFinite(carsOwned) ? Math.max(0, carsOwned) : 0;
  return Math.max(2 * DIAL_STEP, Math.ceil((safe * 1.4) / DIAL_STEP) * DIAL_STEP);
}
