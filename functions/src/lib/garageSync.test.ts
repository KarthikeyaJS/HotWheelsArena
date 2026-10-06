import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { EMPTY_USER_STATS, type UserStats } from '../../../shared/index.js';
import { NOW, findUndefinedPaths } from '../testing/fixtures.js';
import {
  affectsStats,
  garageQuantityOf,
  garageWriteCommitBoundMs,
  isSuperseded,
  planGarageSync,
  timeUpperBoundMs,
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
  it('only stamps statsSyncedAt when the profile already matches the garage', () => {
    const plan = planGarageSync(input({}), NOW);
    expect(plan.changed).toBe(false);
    expect(plan.write).toEqual({ kind: 'stamp', data: { statsSyncedAt: NOW } });
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
        statsSyncedAt: NOW,
      },
    });
    expect(plan.changed).toBe(true);
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
    expect(replay.changed).toBe(false);
    expect(replay.write).toEqual({ kind: 'stamp', data: { statsSyncedAt: NOW } });
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
        statsSyncedAt: NOW,
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
    expect(plan.write?.kind).toBe('update');
    expect(plan.write?.kind === 'update' ? plan.write.data.xp : null).toBe(800);
    expect(plan.level).toBe(6);
  });

  it('repairs a stale stored level even when stats are unchanged', () => {
    const plan = planGarageSync(input({ profileData: profile({ level: 9 }) }), NOW);
    expect(plan.write).toEqual({
      kind: 'update',
      data: {
        xp: 300,
        level: 3,
        badges: ['first-ride'],
        stats: baseStats,
        updatedAt: NOW,
        statsSyncedAt: NOW,
      },
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
        statsSyncedAt: NOW,
      },
    });
    expect(findUndefinedPaths(plan.write)).toEqual([]);
  });

  it('writes nothing for a missing profile with an empty garage (no stamp-only profile)', () => {
    const plan = planGarageSync(input({ profileData: undefined, garage: [] }), NOW);
    expect(plan.write).toBeNull();
    expect(plan.changed).toBe(false);
  });

  it('always stamps statsSyncedAt whenever a profile write is planned', () => {
    const cases: GarageSyncInput[] = [
      input({}),
      input({ profileData: profile({ level: 9 }) }),
      input({ garage: [{ productId: 'gem', quantity: 2 }] }),
      input({ profileData: undefined }),
      input({ profileData: profile({ statsSyncedAt: Timestamp.fromMillis(1) }) }),
    ];
    for (const syncInput of cases) {
      const plan = planGarageSync(syncInput, NOW);
      expect(plan.write?.data.statsSyncedAt).toBe(NOW);
    }
  });
});

describe('timeUpperBoundMs', () => {
  const base = Date.parse('2026-10-06T12:00:38Z');

  it('rounds a truncated time up to the end of its precision', () => {
    // The Firestore emulator sends whole seconds: 38Z covers [38.000, 39.000).
    expect(timeUpperBoundMs('2026-10-06T12:00:38Z')).toBe(base + 1000);
    expect(timeUpperBoundMs('2026-10-06T12:00:38.2Z')).toBe(base + 300);
    expect(timeUpperBoundMs('2026-10-06T12:00:38.25Z')).toBe(base + 260);
    expect(timeUpperBoundMs('2026-10-06T12:00:38.250Z')).toBe(base + 251);
    expect(timeUpperBoundMs('2026-10-06T12:00:38.250999999Z')).toBe(base + 251);
    expect(timeUpperBoundMs('2026-10-06T17:30:38.25+05:30')).toBe(base + 260);
  });

  it('is NaN for anything that is not an RFC 3339 date-time', () => {
    expect(timeUpperBoundMs('not a time')).toBeNaN();
    expect(timeUpperBoundMs('2026-10-06')).toBeNaN();
    expect(timeUpperBoundMs('')).toBeNaN();
  });
});

describe('garageWriteCommitBoundMs', () => {
  it("uses the written document's updateTime (truncated to ms, so + 1)", () => {
    const updateTime = new Timestamp(1_791_288_038, 196_640_000);
    expect(garageWriteCommitBoundMs(updateTime, '2026-10-06T12:00:38Z')).toBe(
      updateTime.toMillis() + 1,
    );
  });

  it('falls back to the upper bound of the event time for deletes (no after document)', () => {
    expect(garageWriteCommitBoundMs(undefined, '2026-10-06T12:00:38Z')).toBe(
      Date.parse('2026-10-06T12:00:39Z'),
    );
    expect(garageWriteCommitBoundMs(undefined, 'garbage')).toBeNaN();
  });
});

describe('isSuperseded', () => {
  // The garage write committed at 12:00:38.196640 (document updateTime).
  const writeTime = new Timestamp(Date.parse('2026-10-06T12:00:38Z') / 1000, 196_640_000);
  const bound = garageWriteCommitBoundMs(writeTime, '2026-10-06T12:00:38Z');
  const syncedAt = (seconds: number, nanos: number) => ({
    statsSyncedAt: new Timestamp(writeTime.seconds + seconds, nanos),
  });

  it('is true only when the last full recompute provably committed after the write', () => {
    expect(isSuperseded(syncedAt(0, 197_000_000), bound)).toBe(true); // next millisecond
    expect(isSuperseded(syncedAt(60, 0), bound)).toBe(true);
  });

  it('is false for a recompute in the same millisecond or earlier (it may predate the write)', () => {
    expect(isSuperseded(syncedAt(0, 196_999_999), bound)).toBe(false); // same ms, later µs
    expect(isSuperseded(syncedAt(0, 196_640_000), bound)).toBe(false);
    expect(isSuperseded(syncedAt(0, 100_000_000), bound)).toBe(false);
    expect(isSuperseded(syncedAt(-1, 900_000_000), bound)).toBe(false);
  });

  it('never trusts a whole-second event time for a recompute inside that second', () => {
    // Regression (emulator): a delete at 38.300 reported as "…:38Z" must not be skipped by a
    // recompute stamped at 38.251, which may have run before the delete.
    const deleteBound = garageWriteCommitBoundMs(undefined, '2026-10-06T12:00:38Z');
    expect(isSuperseded(syncedAt(0, 251_000_000), deleteBound)).toBe(false);
    expect(isSuperseded(syncedAt(0, 999_999_999), deleteBound)).toBe(false);
    expect(isSuperseded(syncedAt(1, 0), deleteBound)).toBe(true);
  });

  it('is false when the stamp is missing or not a Timestamp', () => {
    const future = writeTime.toMillis() + 1000;
    expect(isSuperseded(undefined, bound)).toBe(false);
    expect(isSuperseded(profile(), bound)).toBe(false);
    expect(isSuperseded({ statsSyncedAt: future }, bound)).toBe(false);
    expect(isSuperseded({ statsSyncedAt: '2099-01-01T00:00:00Z' }, bound)).toBe(false);
    expect(isSuperseded({ statsSyncedAt: new Date(future) }, bound)).toBe(false);
    expect(isSuperseded({ statsSyncedAt: null }, bound)).toBe(false);
  });

  it('is false when the commit bound is not a finite number', () => {
    const stamp = syncedAt(60, 0);
    expect(isSuperseded(stamp, Number.NaN)).toBe(false);
    expect(isSuperseded(stamp, garageWriteCommitBoundMs(undefined, 'not a time'))).toBe(false);
    expect(isSuperseded(stamp, Number.POSITIVE_INFINITY)).toBe(false);
  });
});
