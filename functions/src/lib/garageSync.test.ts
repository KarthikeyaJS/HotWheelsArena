import { describe, expect, it } from 'vitest';
import { EMPTY_USER_STATS, type UserStats } from '../../../shared/index.js';
import { NOW, findUndefinedPaths } from '../testing/fixtures.js';
import {
  affectsStats,
  garageQuantityOf,
  planGarageSync,
  type GarageSyncInput,
} from './garageSync.js';
import type { StatsProduct } from './stats.js';

const products = new Map<string, StatsProduct>([
  ['racer', { category: 'racing', rarity: 'common' }],
  ['gem', { category: 'special', rarity: 'limited' }],
  ['coupe', { category: 'sports', rarity: 'common' }],
]);
const series = [{ id: 'duo', carIds: ['racer', 'coupe'] }];

const baseStats: UserStats = {
  ...EMPTY_USER_STATS,
  carsOwned: 1,
  uniqueCars: 1,
  racingCars: 1,
  ordersPlaced: 2,
  totalSpent: 1800,
};

const profile = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  uid: 'u1',
  displayName: 'Asha Rao',
  xp: 300,
  level: 3,
  badges: ['first-ride'],
  stats: baseStats,
  role: 'customer',
  ...overrides,
});

function input(overrides: Partial<GarageSyncInput>): GarageSyncInput {
  return {
    uid: 'u1',
    profileData: profile(),
    garage: [{ productId: 'racer', quantity: 1 }],
    products,
    series,
    ...overrides,
  };
}

describe('affectsStats', () => {
  it('reacts to creations, deletions and quantity changes', () => {
    expect(affectsStats(undefined, { quantity: 1 })).toBe(true);
    expect(affectsStats({ quantity: 2 }, undefined)).toBe(true);
    expect(affectsStats({ quantity: 2 }, { quantity: 3 })).toBe(true);
  });

  it('skips favourite toggles and other metadata edits', () => {
    expect(
      affectsStats({ quantity: 2, isFavorite: false }, { quantity: 2, isFavorite: true }),
    ).toBe(false);
    expect(affectsStats({ quantity: 1 }, {})).toBe(false); // missing quantity reads as 1
    expect(affectsStats(undefined, undefined)).toBe(false);
  });

  it('reads quantities defensively', () => {
    expect(garageQuantityOf(undefined)).toBe(0);
    expect(garageQuantityOf({ quantity: 500 })).toBe(99);
    expect(garageQuantityOf({ quantity: 'x' })).toBe(1);
  });
});

describe('planGarageSync', () => {
  it('plans no write when the profile already matches the garage (skip no-op writes)', () => {
    const plan = planGarageSync(input({}), NOW);
    expect(plan.write).toBeNull();
    expect(plan.stats).toEqual(baseStats);
  });

  it('unlocks a badge from a manual garage add and awards its XP once', () => {
    const plan = planGarageSync(
      input({
        garage: [
          { productId: 'racer', quantity: 1 },
          { productId: 'gem', quantity: 1 },
        ],
      }),
      NOW,
    );
    expect(plan.badgesUnlocked).toEqual(['treasure-hunter']);
    expect(plan.xpEarned).toBe(150);
    expect(plan.write).toEqual({
      kind: 'update',
      data: {
        xp: 450,
        level: 4,
        badges: ['first-ride', 'treasure-hunter'],
        stats: { ...baseStats, carsOwned: 2, uniqueCars: 2, rareCars: 1 },
        updatedAt: NOW,
      },
    });
    expect(plan.leveledUp).toBe(true);

    // Re-delivery of the same event after the write: nothing left to do.
    const replay = planGarageSync(
      input({
        profileData: profile({
          xp: 450,
          level: 4,
          badges: ['first-ride', 'treasure-hunter'],
          stats: { ...baseStats, carsOwned: 2, uniqueCars: 2, rareCars: 1 },
        }),
        garage: [
          { productId: 'racer', quantity: 1 },
          { productId: 'gem', quantity: 1 },
        ],
      }),
      NOW,
    );
    expect(replay.write).toBeNull();
    expect(replay.xpEarned).toBe(0);
  });

  it('never removes badges or XP when cars leave the garage', () => {
    const plan = planGarageSync(
      input({
        profileData: profile({
          xp: 450,
          level: 4,
          badges: ['first-ride', 'treasure-hunter'],
          stats: { ...baseStats, carsOwned: 2, uniqueCars: 2, rareCars: 1 },
        }),
        garage: [{ productId: 'racer', quantity: 1 }],
      }),
      NOW,
    );
    expect(plan.write).toEqual({
      kind: 'update',
      data: {
        xp: 450,
        level: 4,
        badges: ['first-ride', 'treasure-hunter'],
        stats: baseStats,
        updatedAt: NOW,
      },
    });
    expect(plan.badgesUnlocked).toEqual([]);
  });

  it('preserves the order counters and recomputes the garage ones (duplicates, series)', () => {
    const plan = planGarageSync(
      input({
        garage: [
          { productId: 'racer', quantity: 3 },
          { productId: 'coupe', quantity: 1 },
        ],
      }),
      NOW,
    );
    expect(plan.stats).toEqual({
      carsOwned: 4,
      uniqueCars: 2,
      seriesCompleted: 1,
      ordersPlaced: 2,
      racingCars: 1,
      rareCars: 0,
      totalSpent: 1800,
    });
    expect(plan.badgesUnlocked).toEqual(['master-collector']);
    expect(plan.write?.data.xp).toBe(800);
    expect(plan.level).toBe(6);
  });

  it('repairs a stale stored level even when stats are unchanged', () => {
    const plan = planGarageSync(input({ profileData: profile({ level: 9 }) }), NOW);
    expect(plan.write).toEqual({
      kind: 'update',
      data: { xp: 300, level: 3, badges: ['first-ride'], stats: baseStats, updatedAt: NOW },
    });
  });

  it('merges server-owned fields when the profile document does not exist yet', () => {
    const plan = planGarageSync(input({ profileData: undefined }), NOW);
    expect(plan.write).toEqual({
      kind: 'merge',
      data: {
        uid: 'u1',
        role: 'customer',
        xp: 0,
        level: 1,
        badges: [],
        stats: { ...EMPTY_USER_STATS, carsOwned: 1, uniqueCars: 1, racingCars: 1 },
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    expect(findUndefinedPaths(plan.write)).toEqual([]);
  });

  it('writes nothing for a missing profile with an empty garage', () => {
    const plan = planGarageSync(input({ profileData: undefined, garage: [] }), NOW);
    expect(plan.write).toBeNull();
  });
});
