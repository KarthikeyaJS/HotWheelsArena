/**
 * Defensive readers: raw Firestore document data → typed server-side records.
 *
 * Admin-edited documents may be half-written, so every field is validated and defaulted. The
 * settings reader mirrors the web client's `parseSiteSettings` exactly — both sides must feed the
 * same numbers into `computeOrderTotals` so the dummy payment amount equals the server total.
 */
import {
  BADGE_IDS,
  DEFAULT_SITE_SETTINGS,
  GARAGE_SOURCES,
  MAX_GARAGE_QUANTITY,
  RARITIES,
  levelForXp,
  normalizeStats,
  type BadgeId,
  type GarageSource,
  type Rarity,
  type TotalsSettings,
  type UserStats,
} from '../../../shared/index.js';

export type RawData = Record<string, unknown>;

/** Image used when a product has no usable image URL. */
export const FALLBACK_PRODUCT_IMAGE = '/placeholders/car-generic.svg';

/* --------------------------------- Readers -------------------------------- */

export const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const readObject = (value: unknown): RawData =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as RawData) : {};

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function isBadgeId(value: unknown): value is BadgeId {
  return typeof value === 'string' && (BADGE_IDS as readonly string[]).includes(value);
}

/** Valid, de-duplicated badge ids in their stored order. */
export function readBadges(value: unknown): BadgeId[] {
  return Array.from(new Set(readStringArray(value).filter(isBadgeId)));
}

/* -------------------------------- Products -------------------------------- */

export interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  /** Server price in whole rupees; `null` when the stored price is missing / invalid. */
  price: number | null;
  stock: number;
  isActive: boolean;
  rarity: Rarity;
  category: string;
  /** Image URL snapshot for order lines. */
  image: string;
}

/** `null` when the document does not exist. */
export function readProductRecord(id: string, data: RawData | undefined): ProductRecord | null {
  if (!data) return null;
  const rawPrice = data.price;
  const price =
    typeof rawPrice === 'number' && Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : null;
  const images = Array.isArray(data.images) ? data.images : [];
  const firstImageUrl = readString(readObject(images[0]).url);
  const name = readString(data.name).trim();
  return {
    id,
    slug: readString(data.slug).trim() || id,
    name: name || 'This car',
    price,
    stock: Math.max(0, Math.floor(readNumber(data.stock, 0))),
    // Mirrors the client converter: a missing flag means active.
    isActive: readBoolean(data.isActive, true),
    rarity: readEnum(data.rarity, RARITIES, 'common'),
    category: readString(data.category),
    image: readString(data.primaryImage) || firstImageUrl || FALLBACK_PRODUCT_IMAGE,
  };
}

/* -------------------------------- Settings -------------------------------- */

export interface ServerSettings extends TotalsSettings {
  codEnabled: boolean;
  maxQtyPerItem: number;
}

/** `settings/site` → pricing settings; missing document / fields fall back to `DEFAULT_SITE_SETTINGS`. */
export function readSiteSettings(data: RawData | undefined): ServerSettings {
  const source = data ?? {};
  const d = DEFAULT_SITE_SETTINGS;
  return {
    shippingThreshold: Math.max(0, readNumber(source.shippingThreshold, d.shippingThreshold)),
    shippingFee: Math.max(0, readNumber(source.shippingFee, d.shippingFee)),
    taxRate: Math.max(0, readNumber(source.taxRate, d.taxRate)),
    taxInclusive: readBoolean(source.taxInclusive, d.taxInclusive),
    codEnabled: readBoolean(source.codEnabled, d.codEnabled),
    maxQtyPerItem: Math.max(1, Math.floor(readNumber(source.maxQtyPerItem, d.maxQtyPerItem))),
  };
}

/* --------------------------------- Profile -------------------------------- */

export interface ProfileState {
  exists: boolean;
  xp: number;
  /** Stored level (may be stale); progression always recomputes from XP. */
  level: number;
  badges: BadgeId[];
  stats: UserStats;
}

export function readProfileState(data: RawData | undefined): ProfileState {
  if (!data) {
    return { exists: false, xp: 0, level: 1, badges: [], stats: normalizeStats(null) };
  }
  const xp = Math.max(0, Math.floor(readNumber(data.xp, 0)));
  return {
    exists: true,
    xp,
    level: Math.max(1, Math.floor(readNumber(data.level, levelForXp(xp)))),
    badges: readBadges(data.badges),
    stats: normalizeStats(readObject(data.stats)),
  };
}

/* --------------------------------- Garage --------------------------------- */

export interface GarageRecord {
  productId: string;
  /** Copies owned, clamped to 1..MAX_GARAGE_QUANTITY. */
  quantity: number;
  isFavorite: boolean;
  source: GarageSource;
}

export function clampGarageQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_GARAGE_QUANTITY, Math.max(1, Math.floor(value)));
}

export function readGarageRecord(id: string, data: RawData | undefined): GarageRecord {
  const source = data ?? {};
  return {
    productId: id,
    quantity: clampGarageQuantity(readNumber(source.quantity, 1)),
    isFavorite: readBoolean(source.isFavorite),
    source: readEnum(source.source, GARAGE_SOURCES, 'manual'),
  };
}

/* --------------------------------- Series --------------------------------- */

export interface SeriesRecord {
  id: string;
  carIds: string[];
}

export function readSeriesRecord(id: string, data: RawData | undefined): SeriesRecord {
  return { id, carIds: readStringArray(readObject(data).carIds) };
}

/* --------------------------------- Reviews -------------------------------- */

export interface RatingAggregate {
  ratingAvg: number;
  ratingCount: number;
}

export function readRatingAggregate(data: RawData | undefined): RatingAggregate {
  const source = data ?? {};
  return {
    ratingAvg: Math.min(5, Math.max(0, readNumber(source.ratingAvg, 0))),
    ratingCount: Math.max(0, Math.floor(readNumber(source.ratingCount, 0))),
  };
}

/** Stored star rating of an existing review (1–5), or `null` when missing / invalid. */
export function readReviewRating(data: RawData | undefined): number | null {
  const rating = readNumber(data?.rating, Number.NaN);
  if (!Number.isFinite(rating)) return null;
  return Math.min(5, Math.max(1, Math.round(rating)));
}
