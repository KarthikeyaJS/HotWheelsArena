import { describe, expect, it } from 'vitest';
import type { BadgeId } from '@/types';
import { diffBadgeSnapshots, type BadgeSnapshot } from '../badgeSnapshot';

const snap = (uid: string, badges: BadgeId[], level = 1): BadgeSnapshot => ({ uid, badges, level });

describe('diffBadgeSnapshots', () => {
  it('treats the first snapshot as a baseline', () => {
    expect(diffBadgeSnapshots(null, snap('a', ['first-ride'], 3))).toEqual({
      baseline: true,
      unlocked: [],
      levelUp: null,
    });
  });

  it('treats a user switch as a baseline', () => {
    const diff = diffBadgeSnapshots(snap('a', []), snap('b', ['first-ride', 'treasure-hunter'], 5));
    expect(diff.baseline).toBe(true);
    expect(diff.unlocked).toEqual([]);
    expect(diff.levelUp).toBeNull();
  });

  it('reports newly unlocked badges and level-ups for the same user', () => {
    const diff = diffBadgeSnapshots(
      snap('a', ['first-ride'], 2),
      snap('a', ['first-ride', 'treasure-hunter', 'speed-demon'], 4),
    );
    expect(diff).toEqual({
      baseline: false,
      unlocked: ['treasure-hunter', 'speed-demon'],
      levelUp: 4,
    });
  });

  it('ignores unchanged profiles, duplicates, removals and unknown ids', () => {
    expect(diffBadgeSnapshots(snap('a', ['first-ride'], 2), snap('a', ['first-ride'], 2))).toEqual({
      baseline: false,
      unlocked: [],
      levelUp: null,
    });
    const weird = ['garage-builder', 'garage-builder', 'not-a-badge'] as unknown as BadgeId[];
    expect(diffBadgeSnapshots(snap('a', ['first-ride'], 3), snap('a', weird, 2))).toEqual({
      baseline: false,
      unlocked: ['garage-builder'],
      levelUp: null,
    });
  });
});
