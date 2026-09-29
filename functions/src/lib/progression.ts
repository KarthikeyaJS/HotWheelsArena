/**
 * Badge / XP / level deltas, built on the shared gamification rules.
 *
 * Idempotent by construction: XP is awarded only for badges not already owned, existing badges
 * are never removed (even when the stats that earned them drop) and XP never decreases.
 */
import {
  badgeXpTotal,
  levelForXp,
  newlyUnlockedBadges,
  type BadgeId,
  type UserStats,
} from '../../../shared/index.js';
import { readBadges } from './firestoreData.js';

export interface ProgressionInput {
  /** Current total XP. */
  xp: number;
  /** Badges already owned. */
  badges: readonly BadgeId[];
  /** Stats AFTER the change being processed. */
  stats: UserStats;
  /** XP earned by the action itself (e.g. `computeOrderXp`), before badge rewards. */
  baseXp?: number;
}

export interface ProgressionResult {
  /** Badges newly satisfied by `stats`, in BADGES order. */
  badgesUnlocked: BadgeId[];
  /** Existing badges (order kept) followed by the new ones. */
  badges: BadgeId[];
  /** baseXp + xpReward of every newly unlocked badge. */
  xpEarned: number;
  /** New XP total. */
  xp: number;
  previousLevel: number;
  level: number;
  leveledUp: boolean;
}

function safeXp(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function computeProgression(input: ProgressionInput): ProgressionResult {
  const currentXp = safeXp(input.xp);
  const owned = readBadges(input.badges);
  const badgesUnlocked = newlyUnlockedBadges(owned, input.stats);
  const xpEarned = safeXp(input.baseXp) + badgeXpTotal(badgesUnlocked);
  const xp = currentXp + xpEarned;
  const previousLevel = levelForXp(currentXp);
  const level = levelForXp(xp);
  return {
    badgesUnlocked,
    badges: [...owned, ...badgesUnlocked],
    xpEarned,
    xp,
    previousLevel,
    level,
    leveledUp: level > previousLevel,
  };
}
