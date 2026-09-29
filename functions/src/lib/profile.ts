/**
 * Collector profile documents (`users/{uid}`): defaults for new profiles and a backfill for
 * existing documents that are missing required fields. Generic over the timestamp type so the
 * Firestore layer can pass `FieldValue.serverTimestamp()` and tests can pass plain values.
 */
import {
  EMPTY_USER_STATS,
  levelForXp,
  normalizeStats,
  type BadgeId,
  type UserRole,
  type UserStats,
} from '../../../shared/index.js';
import { readNumber, readObject, type RawData } from './firestoreData.js';

export interface ProfileSeed {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export const DEFAULT_DISPLAY_NAME = 'Collector';
const MAX_DISPLAY_NAME = 80;

export interface ProfileDoc<T> {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  xp: number;
  level: number;
  badges: BadgeId[];
  stats: UserStats;
  role: UserRole;
  createdAt: T;
  updatedAt: T;
}

/**
 * Server-owned progression fields on `users/{uid}` (written only by Cloud Functions).
 * A type alias (not an interface) so it satisfies Firestore's indexable `UpdateData` type.
 */
export type ProfileProgressFields<T> = {
  xp: number;
  level: number;
  badges: BadgeId[];
  stats: UserStats;
  updatedAt: T;
};

function cleanString(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Display name from the seed, else the email's local part, else "Collector" (max 80 chars). */
export function resolveDisplayName(seed: Pick<ProfileSeed, 'displayName' | 'email'>): string {
  const name = cleanString(seed.displayName);
  if (name) return name.slice(0, MAX_DISPLAY_NAME);
  const local = cleanString(seed.email).split('@')[0] ?? '';
  return local ? local.slice(0, MAX_DISPLAY_NAME) : DEFAULT_DISPLAY_NAME;
}

function resolveEmail(seed: Pick<ProfileSeed, 'email'>): string {
  return cleanString(seed.email).toLowerCase();
}

function resolvePhotoUrl(seed: Pick<ProfileSeed, 'photoURL'>): string | null {
  return cleanString(seed.photoURL) || null;
}

/** A brand-new profile: xp 0, level 1, no badges, zeroed stats, role `customer`. */
export function buildProfileDoc<T>(seed: ProfileSeed, timestamp: T): ProfileDoc<T> {
  return {
    uid: seed.uid,
    displayName: resolveDisplayName(seed),
    email: resolveEmail(seed),
    photoURL: resolvePhotoUrl(seed),
    xp: 0,
    level: 1,
    badges: [],
    stats: { ...EMPTY_USER_STATS },
    role: 'customer',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const STAT_KEYS = Object.keys(EMPTY_USER_STATS) as Array<keyof UserStats>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Fields to add to an existing profile that is missing required data (e.g. a document created
 * before the profile schema was complete). Never overwrites valid values — gamification fields
 * are only filled in when absent / malformed. `null` when nothing needs fixing.
 */
export function profileBackfill<T>(
  existing: RawData,
  seed: ProfileSeed,
  timestamp: T,
): Partial<ProfileDoc<T>> | null {
  const patch: Partial<ProfileDoc<T>> = {};

  if (existing.uid !== seed.uid) patch.uid = seed.uid;
  if (!isNonEmptyString(existing.displayName)) patch.displayName = resolveDisplayName(seed);
  if (!isNonEmptyString(existing.email)) {
    const email = resolveEmail(seed);
    if (email || typeof existing.email !== 'string') patch.email = email;
  }
  if (!isNonEmptyString(existing.photoURL)) {
    // Fill a missing photo from the sign-in token; normalise malformed values ('', numbers,
    // an absent field) to null. A stored `null` with no photo on the token is already valid.
    const photoURL = resolvePhotoUrl(seed);
    if (photoURL !== null || existing.photoURL !== null) patch.photoURL = photoURL;
  }

  const xpValid = isFiniteNumber(existing.xp) && existing.xp >= 0;
  if (!xpValid) patch.xp = 0;
  if (!isFiniteNumber(existing.level) || existing.level < 1) {
    patch.level = levelForXp(xpValid ? readNumber(existing.xp) : 0);
  }
  if (!Array.isArray(existing.badges)) patch.badges = [];

  const rawStats = existing.stats;
  const statsObject = readObject(rawStats);
  const statsComplete =
    rawStats === statsObject &&
    STAT_KEYS.every((key) => isFiniteNumber(statsObject[key]) && statsObject[key] >= 0);
  if (!statsComplete) patch.stats = normalizeStats(statsObject);

  if (existing.role !== 'customer') patch.role = 'customer';
  if (existing.createdAt === undefined || existing.createdAt === null) patch.createdAt = timestamp;

  if (Object.keys(patch).length === 0) return null;
  patch.updatedAt = timestamp;
  return patch;
}
