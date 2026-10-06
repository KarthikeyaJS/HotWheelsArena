/**
 * Pure planning for the `onGarageWrite` trigger.
 *
 * After any garage change (manual add / remove / quantity change, or a purchase written by
 * `placeOrder`) the trigger re-reads the FULL garage and recomputes the collector's stats with
 * the shared rules, unlocks newly satisfied badges and awards their XP.
 *
 * Idempotent by construction:
 *  - re-running on unchanged data changes no progression field (stats equal, no new badges,
 *    level consistent); only the `statsSyncedAt` stamp is refreshed;
 *  - badge XP is awarded only for badges not already on the profile, so each badge pays out once;
 *  - badges and XP are never removed when cars leave the garage;
 *  - order counters (`ordersPlaced`, `totalSpent`) are carried over untouched.
 *
 * Superseded events: every full recompute stamps the server-only `statsSyncedAt` (its commit
 * time). An event whose garage write provably committed BEFORE that stamp was already seen by
 * that recompute (Firestore transactions are serializable, and the recompute read the garage
 * inside its transaction), so the trigger skips it after reading only the profile
 * (`isSuperseded` with the bound from `garageWriteCommitBoundMs`).
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

/**
 * Server-only stamp on `users/{uid}`: when the last full stats recompute committed. Clients can
 * never write it (the profile rules only let them change displayName / photoURL / updatedAt).
 */
export type StatsSyncStamp<T> = { statsSyncedAt: T };

export type GarageSyncWrite<T> =
  /** Profile exists and progression changed: update the progression fields (+ the stamp). */
  | { kind: 'update'; data: ProfileProgressFields<T> & StatsSyncStamp<T> }
  /**
   * Profile missing (created before `ensureUserProfile` ran): merge the server-owned fields;
   * identity fields (displayName, email, photoURL) are backfilled by `ensureUserProfile`.
   */
  | { kind: 'merge'; data: ProfileSeedFields<T> & StatsSyncStamp<T> }
  /** Profile already up to date: only record that a full recompute happened. */
  | { kind: 'stamp'; data: StatsSyncStamp<T> };

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
  /**
   * What to write. Always carries `statsSyncedAt`; `null` only when the profile does not exist
   * and there is nothing to record (no profile document is created just for the stamp).
   */
  write: GarageSyncWrite<T> | null;
  /** Whether any progression field (xp, level, badges, stats) changes. */
  changed: boolean;
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
      changed: !nothingToRecord,
      write: nothingToRecord
        ? null
        : {
            kind: 'merge',
            data: {
              uid: input.uid,
              role: 'customer',
              ...progress,
              createdAt: timestamp,
              statsSyncedAt: timestamp,
            },
          },
    };
  }

  const upToDate =
    progression.badgesUnlocked.length === 0 &&
    statsEqual(stats, profile.stats) &&
    profile.level === progression.level;
  return {
    ...summary,
    changed: !upToDate,
    write: upToDate
      ? { kind: 'stamp', data: { statsSyncedAt: timestamp } }
      : { kind: 'update', data: { ...progress, statsSyncedAt: timestamp } },
  };
}

/** Structural Firestore `Timestamp` (keeps this module free of firebase-admin). */
interface TimestampLike {
  toMillis(): number;
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  );
}

/** Millis of a Firestore `Timestamp`, else `null`. */
function timestampMillis(value: unknown): number | null {
  if (!isTimestampLike(value)) return null;
  const millis = value.toMillis();
  return Number.isFinite(millis) ? millis : null;
}

const RFC3339_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d+))?(?:Z|[+-]\d{2}:\d{2})$/i;

/**
 * Exclusive upper bound (epoch ms) of the instant an RFC 3339 time stands for, assuming its
 * fraction may be truncated to whatever precision it shows: `…:38Z` covers [38.000, 39.000), so
 * the bound is 39.000; `…:38.25Z` → 38.260; three or more digits → the next millisecond.
 * `NaN` when the string is not an RFC 3339 date-time.
 */
export function timeUpperBoundMs(time: string): number {
  const match = RFC3339_TIME.exec(time.trim());
  const parsed = Date.parse(time);
  if (!match || !Number.isFinite(parsed)) return Number.NaN;
  const fractionDigits = match[1]?.length ?? 0;
  return parsed + (fractionDigits >= 3 ? 1 : 10 ** (3 - fractionDigits));
}

/**
 * Exclusive upper bound (epoch ms) of the commit time of the garage write behind an event.
 *
 * Creates and updates use the written document's `updateTime` (the commit time, full precision;
 * `toMillis()` truncates, hence `+ 1`). Deletes have no "after" document, so they fall back to the
 * event time, whose precision varies — the Firestore emulator sends whole seconds — so its upper
 * bound is used (`timeUpperBoundMs`). `NaN` when neither is usable.
 */
export function garageWriteCommitBoundMs(afterUpdateTime: unknown, eventTime: string): number {
  const updateMs = timestampMillis(afterUpdateTime);
  return updateMs !== null ? updateMs + 1 : timeUpperBoundMs(eventTime);
}

/**
 * Whether a garage event is already covered by a later full recompute: the profile's
 * `statsSyncedAt` is at or after `commitBoundMs`, the exclusive upper bound of the garage write's
 * commit time (`garageWriteCommitBoundMs`), so that recompute provably committed after the write.
 *
 * `false` when the stamp is missing or not a Timestamp, or the bound is not a finite number — the
 * trigger then runs the full recompute.
 */
export function isSuperseded(profileData: RawData | undefined, commitBoundMs: number): boolean {
  if (!Number.isFinite(commitBoundMs)) return false;
  const syncedAtMs = timestampMillis(profileData?.statsSyncedAt);
  return syncedAtMs !== null && syncedAtMs >= commitBoundMs;
}
