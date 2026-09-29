import { describe, expect, it } from 'vitest';
import {
  BADGES,
  BADGE_MAP,
  EMPTY_USER_STATS,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
  ORDER_BASE_XP,
  RARITY_XP_BONUS,
  XP_PER_CAR,
  badgeProgress,
  badgeXpTotal,
  computeGarageStats,
  computeOrderXp,
  evaluateBadges,
  levelForXp,
  levelTitle,
  newlyUnlockedBadges,
  normalizeStats,
  seriesCompletion,
  xpForLevel,
  xpProgress,
} from './gamification.js';
import { BADGE_IDS } from './types.js';

describe('level thresholds', () => {
  it('defines at least 20 strictly increasing levels starting at 0', () => {
    expect(LEVEL_THRESHOLDS.length).toBeGreaterThanOrEqual(20);
    expect(LEVEL_THRESHOLDS[0]).toBe(0);
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
      expect(LEVEL_THRESHOLDS[i]).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1] ?? 0);
    }
    expect(MAX_LEVEL).toBe(LEVEL_THRESHOLDS.length);
  });
});

describe('levelForXp', () => {
  it('maps xp to levels at the boundaries', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(79)).toBe(1);
    expect(levelForXp(80)).toBe(2);
    expect(levelForXp(1240)).toBe(7);
    expect(levelForXp(1400)).toBe(8);
  });

  it('clamps invalid and huge values', () => {
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(Number.NaN)).toBe(1);
    expect(levelForXp(10_000_000)).toBe(MAX_LEVEL);
  });

  it('xpForLevel is the inverse at thresholds', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
    }
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(999)).toBe(LEVEL_THRESHOLDS[MAX_LEVEL - 1]);
  });
});

describe('xpProgress', () => {
  it('reports progress inside a level', () => {
    const progress = xpProgress(1240);
    expect(progress.level).toBe(7);
    expect(progress.levelStart).toBe(1080);
    expect(progress.levelEnd).toBe(1400);
    expect(progress.current).toBe(160);
    expect(progress.next).toBe(320);
    expect(progress.toNext).toBe(160);
    expect(progress.pct).toBeCloseTo(50);
    expect(progress.isMax).toBe(false);
  });

  it('is 100% at max level', () => {
    const progress = xpProgress(1_000_000);
    expect(progress.level).toBe(MAX_LEVEL);
    expect(progress.isMax).toBe(true);
    expect(progress.levelEnd).toBeNull();
    expect(progress.pct).toBe(100);
    expect(progress.toNext).toBe(0);
  });

  it('starts at 0% for a new collector', () => {
    expect(xpProgress(0)).toMatchObject({ level: 1, current: 0, pct: 0 });
  });
});

describe('levelTitle', () => {
  it('picks the highest matching rank', () => {
    expect(levelTitle(1)).toBe('ROOKIE');
    expect(levelTitle(5)).toBe('STREET RACER');
    expect(levelTitle(12)).toBe('PRO DRIVER');
    expect(levelTitle(MAX_LEVEL)).toBe('ARENA CHAMPION');
  });
});

describe('badges', () => {
  it('defines the five required badges', () => {
    expect(BADGES.map((badge) => badge.id)).toEqual([...BADGE_IDS]);
    for (const id of BADGE_IDS) {
      expect(BADGE_MAP[id].xpReward).toBeGreaterThan(0);
    }
  });

  it('evaluates nothing for empty stats', () => {
    expect(evaluateBadges(EMPTY_USER_STATS)).toEqual([]);
  });

  it('unlocks badges by their metrics', () => {
    expect(evaluateBadges({ ordersPlaced: 1 })).toEqual(['first-ride']);
    expect(evaluateBadges({ racingCars: 9 })).toEqual([]);
    expect(evaluateBadges({ racingCars: 10 })).toEqual(['speed-demon']);
    expect(evaluateBadges({ rareCars: 1 })).toEqual(['treasure-hunter']);
    expect(evaluateBadges({ carsOwned: 25 })).toEqual(['garage-builder']);
    expect(evaluateBadges({ seriesCompleted: 1 })).toEqual(['master-collector']);
    expect(
      evaluateBadges({
        ordersPlaced: 3,
        racingCars: 12,
        rareCars: 2,
        carsOwned: 30,
        seriesCompleted: 2,
      }),
    ).toEqual([...BADGE_IDS]);
  });

  it('diffs newly unlocked badges', () => {
    expect(newlyUnlockedBadges(['first-ride'], { ordersPlaced: 2, rareCars: 1 })).toEqual([
      'treasure-hunter',
    ]);
    expect(
      newlyUnlockedBadges(['first-ride', 'treasure-hunter'], { ordersPlaced: 2, rareCars: 1 }),
    ).toEqual([]);
  });

  it('reports per-badge progress', () => {
    const progress = badgeProgress({ racingCars: 4, carsOwned: 30 });
    const speedDemon = progress.find((entry) => entry.id === 'speed-demon');
    const builder = progress.find((entry) => entry.id === 'garage-builder');
    expect(speedDemon).toMatchObject({ current: 4, target: 10, pct: 40, unlocked: false });
    expect(builder).toMatchObject({ current: 25, target: 25, pct: 100, unlocked: true });
    expect(progress).toHaveLength(BADGES.length);
  });

  it('sums badge xp', () => {
    expect(badgeXpTotal([])).toBe(0);
    expect(badgeXpTotal(['first-ride', 'master-collector'])).toBe(
      BADGE_MAP['first-ride'].xpReward + BADGE_MAP['master-collector'].xpReward,
    );
  });
});

describe('computeOrderXp', () => {
  it('returns 0 for an empty order', () => {
    expect(computeOrderXp([])).toBe(0);
  });

  it('adds base, per-car and rarity bonus xp', () => {
    const xp = computeOrderXp([
      { qty: 2, rarity: 'common' },
      { qty: 1, rarity: 'limited' },
    ]);
    expect(xp).toBe(ORDER_BASE_XP + 2 * XP_PER_CAR + (XP_PER_CAR + RARITY_XP_BONUS.limited));
  });

  it('ignores invalid quantities', () => {
    expect(computeOrderXp([{ qty: -3, rarity: 'rare' }])).toBe(ORDER_BASE_XP);
  });
});

describe('normalizeStats', () => {
  it('fills missing counters with zero', () => {
    expect(normalizeStats(undefined)).toEqual(EMPTY_USER_STATS);
    expect(normalizeStats({ carsOwned: 3.7, totalSpent: 1299 })).toMatchObject({
      carsOwned: 3,
      totalSpent: 1299,
      rareCars: 0,
    });
  });
});

describe('garage statistics', () => {
  const series = [
    { id: 'hw-racing-2025', carIds: ['r1', 'r2'] },
    { id: 'hw-empty', carIds: [] },
  ];

  it('computes series completion', () => {
    expect(seriesCompletion(series[0]!, new Set(['r1']))).toMatchObject({
      owned: 1,
      total: 2,
      missing: ['r2'],
      pct: 50,
      complete: false,
    });
    expect(seriesCompletion(series[1]!, new Set(['r1'])).complete).toBe(false);
  });

  it('derives counters from garage entries', () => {
    const stats = computeGarageStats(
      [
        { productId: 'r1', quantity: 2, category: 'racing', rarity: 'common' },
        { productId: 'r2', quantity: 1, category: 'racing', rarity: 'limited' },
        { productId: 's1', quantity: 0, category: 'sports', rarity: 'rare' },
      ],
      series,
    );
    expect(stats).toEqual({
      carsOwned: 4,
      uniqueCars: 3,
      racingCars: 2,
      rareCars: 2,
      seriesCompleted: 1,
    });
  });
});
