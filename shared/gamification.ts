/**
 * Gamification rules — pure, deterministic and shared by the web app and Cloud Functions.
 * The server is the only writer of xp / level / badges / stats; the client uses these
 * functions purely for display (progress bars, locked badge hints, previews).
 */
import type {
  BadgeDefinition,
  BadgeId,
  BadgeProgress,
  Rarity,
  UserStats,
  XpProgress,
} from './types.js';

/* -------------------------------------------------------------------------- */
/*                                   Levels                                   */
/* -------------------------------------------------------------------------- */

/**
 * `LEVEL_THRESHOLDS[i]` = total XP required to reach level `i + 1`.
 * Curve: 20·(n−1)² + 60·(n−1). e.g. 1,240 XP → LEVEL 07.
 */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, 80, 200, 360, 560, 800, 1080, 1400, 1760, 2160, 2600, 3080, 3600, 4160, 4760, 5400, 6080, 6800,
  7560, 8360, 9200, 10080, 11000, 11960, 12960,
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/** Rank titles by minimum level (highest matching entry wins). */
export const LEVEL_TITLES: ReadonlyArray<{ minLevel: number; title: string }> = [
  { minLevel: 1, title: 'ROOKIE' },
  { minLevel: 5, title: 'STREET RACER' },
  { minLevel: 10, title: 'PRO DRIVER' },
  { minLevel: 15, title: 'TRACK LEGEND' },
  { minLevel: 20, title: 'HALL OF FAME' },
  { minLevel: 25, title: 'ARENA CHAMPION' },
];

/* -------------------------------------------------------------------------- */
/*                                 XP values                                  */
/* -------------------------------------------------------------------------- */

/** Flat XP for every placed order. */
export const ORDER_BASE_XP = 100;
/** XP per car unit purchased. */
export const XP_PER_CAR = 25;
/** Extra XP per unit by rarity. */
export const RARITY_XP_BONUS: Readonly<Record<Rarity, number>> = {
  common: 0,
  rare: 25,
  'super-rare': 50,
  limited: 100,
};

/** Upper bound for `GarageEntry.quantity` (duplicates tracker). */
export const MAX_GARAGE_QUANTITY = 99;

/** Rarities that count as "rare" for the Treasure Hunter badge and `stats.rareCars`. */
export const RARE_RARITIES: readonly Rarity[] = ['rare', 'super-rare', 'limited'];

/** Category slug that counts towards `stats.racingCars`. */
export const RACING_CATEGORY = 'racing';

/* -------------------------------------------------------------------------- */
/*                                   Badges                                   */
/* -------------------------------------------------------------------------- */

export const BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first-ride',
    emoji: '🔥',
    title: 'FIRST RIDE',
    description: 'Your first purchase is in. The engine is officially warm.',
    requirement: 'Place your first order',
    xpReward: 100,
    metric: 'ordersPlaced',
    target: 1,
  },
  {
    id: 'speed-demon',
    emoji: '🏁',
    title: 'SPEED DEMON',
    description: 'Ten racing machines lined up on your starting grid.',
    requirement: 'Own 10 racing cars',
    xpReward: 250,
    metric: 'racingCars',
    target: 10,
  },
  {
    id: 'treasure-hunter',
    emoji: '💎',
    title: 'TREASURE HUNTER',
    description: 'You tracked down a rare edition. Keep your eyes on the vault.',
    requirement: 'Own a rare, super-rare or limited edition car',
    xpReward: 150,
    metric: 'rareCars',
    target: 1,
  },
  {
    id: 'garage-builder',
    emoji: '🏎️',
    title: 'GARAGE BUILDER',
    description: 'Twenty-five cars parked. That is a proper garage.',
    requirement: 'Own 25 cars',
    xpReward: 300,
    metric: 'carsOwned',
    target: 25,
  },
  {
    id: 'master-collector',
    emoji: '👑',
    title: 'MASTER COLLECTOR',
    description: 'Every car in a series, accounted for. Legendary.',
    requirement: 'Complete a full series',
    xpReward: 500,
    metric: 'seriesCompleted',
    target: 1,
  },
];

export const BADGE_MAP: Readonly<Record<BadgeId, BadgeDefinition>> = Object.fromEntries(
  BADGES.map((badge) => [badge.id, badge]),
) as Record<BadgeId, BadgeDefinition>;

export function getBadge(id: BadgeId): BadgeDefinition {
  return BADGE_MAP[id];
}

export const EMPTY_USER_STATS: Readonly<UserStats> = {
  carsOwned: 0,
  uniqueCars: 0,
  seriesCompleted: 0,
  ordersPlaced: 0,
  racingCars: 0,
  rareCars: 0,
  totalSpent: 0,
};

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Level (1..MAX_LEVEL) for a total XP amount. Negative / NaN XP → level 1. */
export function levelForXp(xp: number): number {
  const total = safeCount(xp);
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && total >= threshold) level = i + 1;
    else break;
  }
  return level;
}

/** Total XP required to reach `level` (clamped to 1..MAX_LEVEL). */
export function xpForLevel(level: number): number {
  const clamped = Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL);
  return LEVEL_THRESHOLDS[clamped - 1] ?? 0;
}

/** Progress through the current level. `pct` is 0–100. */
export function xpProgress(xp: number): XpProgress {
  const total = safeCount(xp);
  const level = levelForXp(total);
  const levelStart = xpForLevel(level);
  const isMax = level >= MAX_LEVEL;
  const levelEnd = isMax ? null : xpForLevel(level + 1);
  const current = total - levelStart;
  const next = levelEnd === null ? 0 : levelEnd - levelStart;
  const toNext = levelEnd === null ? 0 : levelEnd - total;
  const pct = isMax || next === 0 ? 100 : Math.min(100, Math.max(0, (current / next) * 100));
  return { level, xp: total, levelStart, levelEnd, current, next, toNext, pct, isMax };
}

/** Rank title for a level, e.g. `STREET RACER`. */
export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0]?.title ?? 'ROOKIE';
  for (const entry of LEVEL_TITLES) {
    if (level >= entry.minLevel) title = entry.title;
  }
  return title;
}

/** Fills missing / invalid counters with 0. */
export function normalizeStats(stats: Partial<UserStats> | null | undefined): UserStats {
  return {
    carsOwned: safeCount(stats?.carsOwned ?? 0),
    uniqueCars: safeCount(stats?.uniqueCars ?? 0),
    seriesCompleted: safeCount(stats?.seriesCompleted ?? 0),
    ordersPlaced: safeCount(stats?.ordersPlaced ?? 0),
    racingCars: safeCount(stats?.racingCars ?? 0),
    rareCars: safeCount(stats?.rareCars ?? 0),
    totalSpent: Math.max(0, Number.isFinite(stats?.totalSpent) ? (stats?.totalSpent ?? 0) : 0),
  };
}

/** Every badge whose requirement is satisfied by `stats`, in `BADGES` order. */
export function evaluateBadges(stats: Partial<UserStats>): BadgeId[] {
  const normalized = normalizeStats(stats);
  return BADGES.filter((badge) => normalized[badge.metric] >= badge.target).map(
    (badge) => badge.id,
  );
}

/** Badges satisfied by `stats` that are not yet in `existing` (what the server should award). */
export function newlyUnlockedBadges(
  existing: readonly BadgeId[],
  stats: Partial<UserStats>,
): BadgeId[] {
  const owned = new Set(existing);
  return evaluateBadges(stats).filter((id) => !owned.has(id));
}

/** Per-badge progress, in `BADGES` order. `pct` is 0–100. */
export function badgeProgress(stats: Partial<UserStats>): BadgeProgress[] {
  const normalized = normalizeStats(stats);
  return BADGES.map((badge) => {
    const current = normalized[badge.metric];
    const unlocked = current >= badge.target;
    const pct = unlocked ? 100 : Math.min(100, Math.max(0, (current / badge.target) * 100));
    return {
      id: badge.id,
      current: Math.min(current, badge.target),
      target: badge.target,
      pct,
      unlocked,
    };
  });
}

/** Sum of `xpReward` for the given badges. */
export function badgeXpTotal(ids: readonly BadgeId[]): number {
  return ids.reduce((sum, id) => sum + (BADGE_MAP[id]?.xpReward ?? 0), 0);
}

/** XP for an order (excluding badge rewards): base + per-unit XP + rarity bonus per unit. */
export function computeOrderXp(items: ReadonlyArray<{ qty: number; rarity: Rarity }>): number {
  if (items.length === 0) return 0;
  const perUnit = items.reduce((sum, item) => {
    const qty = safeCount(item.qty);
    return sum + qty * (XP_PER_CAR + (RARITY_XP_BONUS[item.rarity] ?? 0));
  }, 0);
  return ORDER_BASE_XP + perUnit;
}

export function isRareRarity(rarity: string): boolean {
  return (RARE_RARITIES as readonly string[]).includes(rarity);
}

/* -------------------------------------------------------------------------- */
/*                              Garage statistics                             */
/* -------------------------------------------------------------------------- */

export interface GarageStatsEntry {
  productId: string;
  quantity: number;
  category: string;
  rarity: string;
}

export interface GarageStatsSeries {
  id: string;
  carIds: readonly string[];
}

export type GarageDerivedStats = Pick<
  UserStats,
  'carsOwned' | 'uniqueCars' | 'racingCars' | 'rareCars' | 'seriesCompleted'
>;

export interface SeriesCompletion {
  owned: number;
  total: number;
  /** Product ids of the series not in the garage. */
  missing: string[];
  /** 0–100. */
  pct: number;
  complete: boolean;
}

/** Completion of one series against a set of owned product ids. Empty series are never complete. */
export function seriesCompletion(
  series: GarageStatsSeries,
  ownedIds: ReadonlySet<string>,
): SeriesCompletion {
  const unique = Array.from(new Set(series.carIds));
  const missing = unique.filter((id) => !ownedIds.has(id));
  const total = unique.length;
  const owned = total - missing.length;
  const pct = total === 0 ? 0 : (owned / total) * 100;
  return { owned, total, missing, pct, complete: total > 0 && missing.length === 0 };
}

/**
 * Derives garage stats from the full garage (joined with product category/rarity) and series list.
 * Used by the `onGarageWrite` trigger and by the client for previews.
 */
export function computeGarageStats(
  entries: readonly GarageStatsEntry[],
  seriesList: readonly GarageStatsSeries[],
): GarageDerivedStats {
  const byId = new Map<string, GarageStatsEntry>();
  for (const entry of entries) {
    if (!entry.productId) continue;
    byId.set(entry.productId, entry);
  }
  const unique = Array.from(byId.values());
  const ownedIds = new Set(byId.keys());
  const carsOwned = unique.reduce((sum, entry) => sum + Math.max(1, safeCount(entry.quantity)), 0);
  const racingCars = unique.filter((entry) => entry.category === RACING_CATEGORY).length;
  const rareCars = unique.filter((entry) => isRareRarity(entry.rarity)).length;
  const seriesCompleted = seriesList.filter(
    (series) => seriesCompletion(series, ownedIds).complete,
  ).length;
  return { carsOwned, uniqueCars: unique.length, racingCars, rareCars, seriesCompleted };
}
