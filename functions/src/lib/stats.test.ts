import { describe, expect, it } from 'vitest';
import type { UserStats } from '../../../shared/index.js';
import { computeUserStats, statsEqual, type StatsProduct } from './stats.js';

const facts = new Map<string, StatsProduct>([
  ['racer-1', { category: 'racing', rarity: 'common' }],
  ['racer-2', { category: 'racing', rarity: 'limited' }],
  ['suv', { category: 'off-road', rarity: 'rare' }],
  ['coupe', { category: 'sports', rarity: 'common' }],
  ['gone', null], // product document deleted
]);

const series = [
  { id: 'track-legends', carIds: ['racer-1', 'racer-2'] },
  { id: 'dirt-kings', carIds: ['suv', 'missing-car'] },
  { id: 'empty-series', carIds: [] },
];

const previous: UserStats = {
  carsOwned: 99,
  uniqueCars: 99,
  seriesCompleted: 99,
  ordersPlaced: 3,
  racingCars: 99,
  rareCars: 99,
  totalSpent: 2500.5,
};

describe('computeUserStats', () => {
  it('derives garage counters from the full garage + products + series', () => {
    const stats = computeUserStats(
      [
        { productId: 'racer-1', quantity: 2 },
        { productId: 'racer-2', quantity: 1 },
        { productId: 'suv', quantity: 3 },
        { productId: 'coupe', quantity: 1 },
      ],
      facts,
      series,
      previous,
    );
    expect(stats).toEqual({
      carsOwned: 7, // Σ quantities (duplicates count)
      uniqueCars: 4,
      seriesCompleted: 1, // track-legends complete; dirt-kings missing a car; empty never counts
      ordersPlaced: 3, // preserved
      racingCars: 2, // distinct racing products
      rareCars: 2, // racer-2 (limited) + suv (rare)
      totalSpent: 2500.5, // preserved
    });
  });

  it('counts cars whose product document is missing as owned, but not racing / rare', () => {
    const stats = computeUserStats([{ productId: 'gone', quantity: 2 }], facts, series, null);
    expect(stats.carsOwned).toBe(2);
    expect(stats.uniqueCars).toBe(1);
    expect(stats.racingCars).toBe(0);
    expect(stats.rareCars).toBe(0);
  });

  it('applies order increments on top of the preserved counters (rounded to paise)', () => {
    const stats = computeUserStats([{ productId: 'coupe', quantity: 1 }], facts, [], previous, {
      ordersPlaced: 1,
      totalSpent: 627.1,
    });
    expect(stats.ordersPlaced).toBe(4);
    expect(stats.totalSpent).toBe(3127.6);
  });

  it('ignores negative increments and starts from zero without previous stats', () => {
    const stats = computeUserStats([], facts, series, undefined, {
      ordersPlaced: -2,
      totalSpent: -50,
    });
    expect(stats).toEqual({
      carsOwned: 0,
      uniqueCars: 0,
      seriesCompleted: 0,
      ordersPlaced: 0,
      racingCars: 0,
      rareCars: 0,
      totalSpent: 0,
    });
  });

  it('accepts any iterable of garage entries (e.g. Map values)', () => {
    const garage = new Map([['racer-1', { productId: 'racer-1', quantity: 1 }]]);
    expect(computeUserStats(garage.values(), facts, series, null).racingCars).toBe(1);
  });
});

describe('statsEqual', () => {
  it('compares every counter', () => {
    expect(statsEqual(previous, { ...previous })).toBe(true);
    expect(statsEqual(previous, { ...previous, totalSpent: 2500.51 })).toBe(false);
    expect(statsEqual(previous, { ...previous, rareCars: 1 })).toBe(false);
  });
});
