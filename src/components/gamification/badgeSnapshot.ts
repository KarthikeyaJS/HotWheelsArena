import { BADGE_MAP } from '@/config/gamification';
import type { BadgeId, UserProfile } from '@/types';

/** The bits of a profile BadgeWatcher compares between updates. */
export interface BadgeSnapshot {
  uid: string;
  badges: readonly BadgeId[];
  level: number;
}

export interface BadgeSnapshotDiff {
  /** True when there was nothing to compare against (first load / different user): celebrate nothing. */
  baseline: boolean;
  /** Badges present now but not before (known ids only, de-duplicated, profile order). */
  unlocked: BadgeId[];
  /** The new level when it went up, else null. */
  levelUp: number | null;
}

export function snapshotFromProfile(
  profile: Pick<UserProfile, 'uid' | 'badges' | 'level'>,
): BadgeSnapshot {
  return { uid: profile.uid, badges: [...profile.badges], level: profile.level };
}

/**
 * Compares two profile snapshots. A missing previous snapshot or a user switch is a
 * `baseline` (no toasts / modals), so unlocks are only celebrated when they happen live.
 */
export function diffBadgeSnapshots(
  previous: BadgeSnapshot | null,
  next: BadgeSnapshot,
): BadgeSnapshotDiff {
  if (!previous || previous.uid !== next.uid) {
    return { baseline: true, unlocked: [], levelUp: null };
  }
  const before = new Set(previous.badges);
  const unlocked = Array.from(new Set(next.badges)).filter(
    (id) => !before.has(id) && Object.prototype.hasOwnProperty.call(BADGE_MAP, id),
  );
  const levelUp = next.level > previous.level ? next.level : null;
  return { baseline: false, unlocked, levelUp };
}
