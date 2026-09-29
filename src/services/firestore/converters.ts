/**
 * Read converters: Firestore documents → typed client models.
 * - Timestamps become epoch millis (`number | null`); pending server timestamps are estimated.
 * - Every field is defensively defaulted so a half-written admin document never crashes the UI.
 * - Converters are READ-ONLY; writes go through the service helpers (client-writable data) or
 *   Cloud Functions (everything else).
 */
import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import { DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { normalizeStats } from '@shared/gamification';
import {
  BADGE_IDS,
  CATEGORY_SLUGS,
  GARAGE_SOURCES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_MODES,
  PAYMENT_PROVIDER_IDS,
  PAYMENT_STATUSES,
  RARITIES,
  type Address,
  type BadgeId,
  type Category,
  type GarageEntry,
  type LimitedEdition,
  type Order,
  type OrderItem,
  type Product,
  type ProductImage,
  type Review,
  type SavedAddress,
  type Series,
  type SiteSettings,
  type UserProfile,
  type WishlistEntry,
} from '@shared/types';

export type RawData = Record<string, unknown>;

/* --------------------------------- Readers -------------------------------- */

export const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const readNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

export const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const readNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const readObject = (value: unknown): RawData =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as RawData) : {};

export function readEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Timestamp | Date | millis | {seconds, nanoseconds} → epoch millis, else null. */
export function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { toMillis?: unknown; seconds?: unknown; nanoseconds?: unknown };
    if (typeof candidate.toMillis === 'function') {
      const result: unknown = (candidate.toMillis as () => unknown).call(value);
      return typeof result === 'number' && Number.isFinite(result) ? result : null;
    }
    if (typeof candidate.seconds === 'number') {
      const nanos = typeof candidate.nanoseconds === 'number' ? candidate.nanoseconds : 0;
      return candidate.seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }
  return null;
}

/* --------------------------------- Parsers -------------------------------- */

function parseImages(value: unknown, fallbackAlt: string): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ProductImage | null => {
      const image = readObject(item);
      const url = readString(image.url);
      const publicId = readString(image.publicId);
      if (!url && !publicId) return null;
      return { publicId, url, alt: readString(image.alt) || fallbackAlt };
    })
    .filter((image): image is ProductImage => image !== null);
}

function parseLimitedEdition(value: unknown): LimitedEdition | null {
  const edition = readObject(value);
  const editionNumber = readNumber(edition.editionNumber);
  const editionSize = readNumber(edition.editionSize);
  return editionNumber > 0 && editionSize > 0 ? { editionNumber, editionSize } : null;
}

export function parseProduct(id: string, data: RawData): Product {
  const name = readString(data.name, 'Unnamed car');
  const images = parseImages(data.images, name);
  const stats = readObject(data.themedStats);
  const compareAt = readNullableNumber(data.compareAtPrice);
  return {
    id,
    slug: readString(data.slug, id),
    name,
    description: readString(data.description),
    make: readString(data.make),
    model: readString(data.model),
    series: readString(data.series),
    seriesName: readString(data.seriesName),
    seriesNumber: readNumber(data.seriesNumber),
    collectionNumber: readNumber(data.collectionNumber),
    year: readNumber(data.year, new Date().getFullYear()),
    scale: readString(data.scale, '1:64'),
    color: readString(data.color),
    material: readString(data.material, 'Die-cast metal'),
    vehicleType: readString(data.vehicleType),
    category: readEnum(data.category, CATEGORY_SLUGS, 'special'),
    rarity: readEnum(data.rarity, RARITIES, 'common'),
    rarityScore: Math.min(10, Math.max(1, readNumber(data.rarityScore, 1))),
    collectorScore: Math.min(10, Math.max(1, readNumber(data.collectorScore, 1))),
    themedStats: {
      topSpeedKmh: readNumber(stats.topSpeedKmh),
      powerHp: readNumber(stats.powerHp),
    },
    price: Math.max(0, readNumber(data.price)),
    compareAtPrice: compareAt !== null && compareAt > 0 ? compareAt : null,
    currency: 'INR',
    stock: Math.max(0, Math.floor(readNumber(data.stock))),
    limitedEdition: parseLimitedEdition(data.limitedEdition),
    images,
    primaryImage: readString(data.primaryImage) || images[0]?.url || '',
    ratingAvg: Math.min(5, Math.max(0, readNumber(data.ratingAvg))),
    ratingCount: Math.max(0, Math.floor(readNumber(data.ratingCount))),
    tags: readStringArray(data.tags),
    isNew: readBoolean(data.isNew),
    isFeatured: readBoolean(data.isFeatured),
    isVault: readBoolean(data.isVault),
    isActive: readBoolean(data.isActive, true),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseCategory(id: string, data: RawData): Category {
  return {
    id,
    name: readString(data.name, id),
    slug: readEnum(data.slug ?? id, CATEGORY_SLUGS, 'special'),
    icon: readString(data.icon),
    order: readNumber(data.order),
    description: readString(data.description),
    isActive: readBoolean(data.isActive, true),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseSeries(id: string, data: RawData): Series {
  const carIds = readStringArray(data.carIds);
  return {
    id,
    name: readString(data.name, id),
    slug: readString(data.slug, id),
    year: readNumber(data.year),
    totalCars: Math.max(readNumber(data.totalCars), carIds.length),
    carIds,
    description: readString(data.description),
    isActive: readBoolean(data.isActive, true),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseReview(id: string, data: RawData, productId: string): Review {
  return {
    id,
    productId: readString(data.productId, productId),
    uid: readString(data.uid, id),
    displayName: readString(data.displayName, 'Collector') || 'Collector',
    photoURL: readNullableString(data.photoURL),
    rating: Math.min(5, Math.max(1, Math.round(readNumber(data.rating, 5)))),
    text: readString(data.text),
    verifiedBuyer: readBoolean(data.verifiedBuyer),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseUserProfile(uid: string, data: RawData): UserProfile {
  const badges = readStringArray(data.badges).filter((badge): badge is BadgeId =>
    (BADGE_IDS as readonly string[]).includes(badge),
  );
  return {
    uid,
    displayName: readString(data.displayName),
    email: readString(data.email),
    photoURL: readNullableString(data.photoURL),
    xp: Math.max(0, readNumber(data.xp)),
    level: Math.max(1, readNumber(data.level, 1)),
    badges: Array.from(new Set(badges)),
    stats: normalizeStats(readObject(data.stats)),
    role: 'customer',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseGarageEntry(id: string, data: RawData): GarageEntry {
  return {
    productId: readString(data.productId, id) || id,
    addedAt: toMillis(data.addedAt),
    source: readEnum(data.source, GARAGE_SOURCES, 'manual'),
    isFavorite: readBoolean(data.isFavorite),
    quantity: Math.max(1, Math.floor(readNumber(data.quantity, 1))),
  };
}

export function parseWishlistEntry(id: string, data: RawData): WishlistEntry {
  return {
    productId: readString(data.productId, id) || id,
    addedAt: toMillis(data.addedAt),
  };
}

export function parseAddress(value: unknown): Address {
  const data = readObject(value);
  const line2 = readString(data.line2).trim();
  const landmark = readString(data.landmark).trim();
  return {
    name: readString(data.name),
    phone: readString(data.phone),
    pincode: readString(data.pincode),
    line1: readString(data.line1),
    ...(line2 ? { line2 } : {}),
    ...(landmark ? { landmark } : {}),
    city: readString(data.city),
    state: readString(data.state),
  };
}

export function parseSavedAddress(id: string, data: RawData): SavedAddress {
  return {
    id,
    ...parseAddress(data),
    isDefault: readBoolean(data.isDefault),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function parseOrderItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const item = readObject(raw);
    return {
      productId: readString(item.productId),
      slug: readString(item.slug),
      name: readString(item.name, 'Car'),
      price: Math.max(0, readNumber(item.price)),
      qty: Math.max(1, Math.floor(readNumber(item.qty, 1))),
      image: readString(item.image),
    };
  });
}

export function parseOrder(id: string, data: RawData): Order {
  const payment = readObject(data.payment);
  return {
    id,
    uid: readString(data.uid),
    items: parseOrderItems(data.items),
    subtotal: readNumber(data.subtotal),
    shipping: readNumber(data.shipping),
    tax: readNumber(data.tax),
    total: readNumber(data.total),
    currency: 'INR',
    address: parseAddress(data.address),
    status: readEnum(data.status, ORDER_STATUSES, 'placed'),
    payment: {
      provider: readEnum(payment.provider, PAYMENT_PROVIDER_IDS, 'dummy'),
      status: readEnum(payment.status, PAYMENT_STATUSES, 'success'),
      transactionId: readString(payment.transactionId),
      mode: readEnum(payment.mode, PAYMENT_MODES, 'test'),
    },
    paymentMethod: readEnum(data.paymentMethod ?? payment.method, PAYMENT_METHODS, 'card'),
    xpEarned: Math.max(0, readNumber(data.xpEarned)),
    badgesUnlocked: readStringArray(data.badgesUnlocked).filter((badge): badge is BadgeId =>
      (BADGE_IDS as readonly string[]).includes(badge),
    ),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

export function parseSiteSettings(data: RawData): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  return {
    shippingThreshold: Math.max(0, readNumber(data.shippingThreshold, d.shippingThreshold)),
    shippingFee: Math.max(0, readNumber(data.shippingFee, d.shippingFee)),
    taxRate: Math.max(0, readNumber(data.taxRate, d.taxRate)),
    taxInclusive: readBoolean(data.taxInclusive, d.taxInclusive),
    showGstLine: readBoolean(data.showGstLine, d.showGstLine),
    codEnabled: readBoolean(data.codEnabled, d.codEnabled),
    maxQtyPerItem: Math.max(1, Math.floor(readNumber(data.maxQtyPerItem, d.maxQtyPerItem))),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

/* ------------------------------- Converters ------------------------------- */

function readOnlyConverter<T>(
  parse: (snapshot: QueryDocumentSnapshot, data: RawData) => T,
): FirestoreDataConverter<T> {
  return {
    toFirestore(): DocumentData {
      throw new Error('Read-only converter: write through the service helpers or Cloud Functions.');
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T {
      const data = snapshot.data({ ...options, serverTimestamps: 'estimate' }) as RawData;
      return parse(snapshot, data);
    },
  };
}

export const productConverter = readOnlyConverter((s, d) => parseProduct(s.id, d));
export const categoryConverter = readOnlyConverter((s, d) => parseCategory(s.id, d));
export const seriesConverter = readOnlyConverter((s, d) => parseSeries(s.id, d));
export const reviewConverter = readOnlyConverter((s, d) =>
  parseReview(s.id, d, s.ref.parent.parent?.id ?? ''),
);
export const userProfileConverter = readOnlyConverter((s, d) => parseUserProfile(s.id, d));
export const garageEntryConverter = readOnlyConverter((s, d) => parseGarageEntry(s.id, d));
export const wishlistEntryConverter = readOnlyConverter((s, d) => parseWishlistEntry(s.id, d));
export const orderConverter = readOnlyConverter((s, d) => parseOrder(s.id, d));
export const siteSettingsConverter = readOnlyConverter((_s, d) => parseSiteSettings(d));
export const savedAddressConverter = readOnlyConverter((s, d) => parseSavedAddress(s.id, d));
