import { describe, expect, it } from 'vitest';
import { EMPTY_USER_STATS, type UserStats } from '../../../shared/index.js';
import { computeProgression } from './progression.js';

const stats = (overrides: Partial<UserStats>): UserStats => ({ ...EMPTY_USER_STATS, ...overrides });

describe('computeProgression', () => {
  it('awards the action XP plus the reward of every newly unlocked badge', () => {
    const result = computeProgression({
      xp: 0,
      badges: [],
      stats: stats({ ordersPlaced: 1, rareCars: 1, carsOwned: 3 }),
      baseXp: 200,
    });
    expect(result.badgesUnlocked).toEqual(['first-ride', 'treasure-hunter']);
    expect(result.badges).toEqual(['first-ride', 'treasure-hunter']);
    expect(result.xpEarned).toBe(200 + 100 + 150);
    expect(result.xp).toBe(450);
    expect(result.previousLevel).toBe(1);
    expect(result.level).toBe(4); // 360 ≤ 450 < 560
    expect(result.leveledUp).toBe(true);
  });

  it('is idempotent: badges already owned are never re-awarded', () => {
    const result = computeProgression({
      xp: 450,
      badges: ['first-ride', 'treasure-hunter'],
      stats: stats({ ordersPlaced: 2, rareCars: 1 }),
    });
    expect(result.badgesUnlocked).toEqual([]);
    expect(result.xpEarned).toBe(0);
    expect(result.xp).toBe(450);
    expect(result.leveledUp).toBe(false);
  });

  it('never removes badges or XP when the stats that earned them drop', () => {
    const result = computeProgression({
      xp: 1650,
      badges: ['master-collector', 'first-ride'],
      stats: stats({}),
    });
    expect(result.badges).toEqual(['master-collector', 'first-ride']);
    expect(result.xp).toBe(1650);
    expect(result.level).toBe(8);
  });

  it('appends new badges after the existing ones, in BADGES order', () => {
    const result = computeProgression({
      xp: 0,
      badges: ['treasure-hunter'],
      stats: stats({
        ordersPlaced: 1,
        racingCars: 10,
        rareCars: 2,
        carsOwned: 30,
        seriesCompleted: 1,
      }),
    });
    expect(result.badgesUnlocked).toEqual([
      'first-ride',
      'speed-demon',
      'garage-builder',
      'master-collector',
    ]);
    expect(result.badges[0]).toBe('treasure-hunter');
    expect(result.xpEarned).toBe(100 + 250 + 300 + 500);
  });

  it('sanitises invalid XP input', () => {
    const result = computeProgression({
      xp: Number.NaN,
      badges: [],
      stats: stats({}),
      baseXp: -40,
    });
    expect(result.xp).toBe(0);
    expect(result.xpEarned).toBe(0);
    expect(result.level).toBe(1);
  });

  it('reports no level-up when the XP stays inside the level', () => {
    const result = computeProgression({ xp: 100, badges: [], stats: stats({}), baseXp: 50 });
    expect(result.previousLevel).toBe(2);
    expect(result.level).toBe(2);
    expect(result.leveledUp).toBe(false);
  });
});
