/**
 * Pure planning for the `onGarageWrite` trigger.
 *
 * After any garage change (manual add / remove / quantity change, or a purchase written by
 * `placeOrder`) the trigger re-reads the FULL garage and recomputes the collector's stats with
 * the shared rules, unlocks newly satisfied badges and awards their XP.
 *
 * Idempotent by construction:
 *  - re-running on unchanged data plans no write (stats equal, no new badges, level consistent);
 *  - badge XP is awarded only for badges not already on the profile, so each badge pays out once;
 *  - badges and XP are never removed when cars leave the garage;
 *  - order counters (`ordersPlaced`, `totalSpent`) are carried over untouched.
 */
import {
  normalizeStats,
  type BadgeId,
  type GarageStatsSeries,
  type UserStats,
} from '../../../shared/index.js';
import {
  readGarageRecord,
  readProfileState,
  type GarageRecord,
  type RawData,
} from './firestoreData.js';
import type { ProfileProgressFields } from './profile.js';
import { computeProgression } from './progression.js';
import { computeUserStats, statsEqual, type StatsProduct } from './stats.js';

/** Copies a garage document contributes to stats (0 when the document does not exist). */
export function garageQuantityOf(data: RawData | undefined): number {
  return data === undefined ? 0 : readGarageRecord('', data).quantity;
}

/**
 * Whether a garage write can change stats: creations, deletions and quantity changes do;
 * favourite toggles (and other metadata edits) do not — those events are skipped.
 */
export function affectsStats(before: RawData | undefined, after: RawData | undefined): boolean {
  return garageQuantityOf(before) !== garageQuantityOf(after);
}

/** Server-owned fields written when the profile document does not exist yet. */
export interface ProfileSeedFields<T> extends ProfileProgressFields<T> {
  uid: string;
  role: 'customer';
  createdAt: T;
}

export type GarageSyncWrite<T> =
  /** Profile exists: update the progression fields. */
  | { kind: 'update'; data: ProfileProgressFields<T> }
  /**
   * Profile missing (created before `ensureUserProfile` ran): merge the server-owned fields;
   * identity fields (displayName, email, photoURL) are backfilled by `ensureUserProfile`.
   */
  | { kind: 'merge'; data: ProfileSeedFields<T> };

export interface GarageSyncInput {
  uid: string;
  /** Raw `users/{uid}` data; `undefined` when the profile does not exist. */
  profileData: RawData | undefined;
  /** The full garage AFTER the change. */
  garage: Iterable<Pick<GarageRecord, 'productId' | 'quantity'>>;
  /** Category / rarity per garage product (missing product documents → `null`). */
  products: ReadonlyMap<string, StatsProduct>;
  /** Active series, for `seriesCompleted`. */
  series: readonly GarageStatsSeries[];
}

export interface GarageSyncPlan<T> {
  /** `null` when the stored profile is already up to date. */
  write: GarageSyncWrite<T> | null;
  stats: UserStats;
  badgesUnlocked: BadgeId[];
  xpEarned: number;
  level: number;
  leveledUp: boolean;
}

export function planGarageSync<T>(input: GarageSyncInput, timestamp: T): GarageSyncPlan<T> {
  const profile = readProfileState(input.profileData);
  const stats = computeUserStats(input.garage, input.products, input.series, profile.stats);
  const progression = computeProgression({ xp: profile.xp, badges: profile.badges, stats });

  const summary = {
    stats,
    badgesUnlocked: progression.badgesUnlocked,
    xpEarned: progression.xpEarned,
    level: progression.level,
    leveledUp: progression.leveledUp,
  };
  const progress: ProfileProgressFields<T> = {
    xp: progression.xp,
    level: progression.level,
    badges: progression.badges,
    stats,
    updatedAt: timestamp,
  };

  if (!profile.exists) {
    const nothingToRecord =
      progression.badgesUnlocked.length === 0 && statsEqual(stats, normalizeStats(null));
    return {
      ...summary,
      write: nothingToRecord
        ? null
        : {
            kind: 'merge',
            data: { uid: input.uid, role: 'customer', ...progress, createdAt: timestamp },
          },
    };
  }

  const upToDate =
    progression.badgesUnlocked.length === 0 &&
    statsEqual(stats, profile.stats) &&
    profile.level === progression.level;
  return { ...summary, write: upToDate ? null : { kind: 'update', data: progress } };
}
