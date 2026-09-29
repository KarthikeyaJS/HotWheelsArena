/**
 * HotWheelsArena — shared domain types.
 *
 * Consumed by the web app (via the `@shared/*` alias) and by Cloud Functions
 * (via relative imports). This folder may import ONLY `zod` — no Firebase, DOM
 * or Node APIs. Relative imports inside `shared/` use explicit `.js` extensions
 * so the files compile under bundler, NodeNext and CommonJS resolution alike.
 *
 * Timestamps on the client are epoch milliseconds (`number`) or `null` when the
 * server timestamp has not resolved yet / the field is missing. Converters in
 * `src/services/firestore/converters.ts` turn Firestore `Timestamp`s into millis.
 */

/* -------------------------------------------------------------------------- */
/*                                Enumerations                                */
/* -------------------------------------------------------------------------- */

export const RARITIES = ['common', 'rare', 'super-rare', 'limited'] as const;
export type Rarity = (typeof RARITIES)[number];

export const CATEGORY_SLUGS = [
  'sports',
  'off-road',
  'racing',
  'special',
  'rescue',
  'limited',
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const ORDER_STATUSES = [
  'placed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['card', 'upi', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** `razorpay` is reserved for the future real gateway; only `dummy` is implemented. */
export const PAYMENT_PROVIDER_IDS = ['dummy', 'razorpay'] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export const PAYMENT_STATUSES = ['success', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_MODES = ['test', 'live'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const GARAGE_SOURCES = ['purchase', 'manual'] as const;
export type GarageSource = (typeof GARAGE_SOURCES)[number];

export const BADGE_IDS = [
  'first-ride',
  'speed-demon',
  'treasure-hunter',
  'garage-builder',
  'master-collector',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export type Currency = 'INR';
export type UserRole = 'customer';

/** Epoch milliseconds, or `null` when unknown / pending server timestamp. */
export type Millis = number | null;

/* -------------------------------------------------------------------------- */
/*                                  Catalogue                                 */
/* -------------------------------------------------------------------------- */

export interface ProductImage {
  /** Cloudinary public id (used when `VITE_CLOUDINARY_CLOUD_NAME` is set). May be ''. */
  publicId: string;
  /** Always-valid fallback URL, e.g. `/placeholders/coupe-orange.svg`. */
  url: string;
  alt: string;
}

/** Themed, fictional "Meet the Machine" specs — NOT claims about the toy. */
export interface ThemedStats {
  topSpeedKmh: number;
  powerHp: number;
}

export interface LimitedEdition {
  /** 1-based edition number, rendered `#001/500`. */
  editionNumber: number;
  editionSize: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Marketing copy for the product page + meta description. '' when absent. */
  description: string;
  make: string;
  model: string;
  /** Series document id (== series slug), e.g. `hw-exotics-2026`. */
  series: string;
  /** Denormalised series display name, e.g. `HW Exotics`. */
  seriesName: string;
  /** Position of the car within its series → `SERIES 03`. */
  seriesNumber: number;
  /** Collector number → `#142`. */
  collectionNumber: number;
  year: number;
  /** e.g. `1:64`. */
  scale: string;
  color: string;
  material: string;
  /** Body type, e.g. `Coupe`, `Pickup`, `Buggy`. */
  vehicleType: string;
  category: CategorySlug;
  rarity: Rarity;
  /** 1–10. */
  rarityScore: number;
  /** 1–10. */
  collectorScore: number;
  themedStats: ThemedStats;
  /** Price in whole rupees (GST inclusive). */
  price: number;
  compareAtPrice: number | null;
  currency: Currency;
  /** Static stock counter (read once, never decremented by the UI). */
  stock: number;
  limitedEdition: LimitedEdition | null;
  images: ProductImage[];
  /** URL of the primary image (=== images[0].url in seed data). */
  primaryImage: string;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  isNew: boolean;
  isFeatured: boolean;
  isVault: boolean;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface Category {
  /** Document id === slug. */
  id: string;
  name: string;
  slug: CategorySlug;
  /** lucide-react icon name, e.g. `Gauge`. */
  icon: string;
  order: number;
  description: string;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface Series {
  /** Document id === slug. */
  id: string;
  name: string;
  slug: string;
  year: number;
  totalCars: number;
  /** Product document ids belonging to the series. */
  carIds: string[];
  description: string;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface Review {
  /** Document id === reviewer uid (one review per user per product). */
  id: string;
  productId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  /** Integer 1–5. */
  rating: number;
  text: string;
  verifiedBuyer: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

/* -------------------------------------------------------------------------- */
/*                                 Collectors                                 */
/* -------------------------------------------------------------------------- */

export interface UserStats {
  /** Total cars incl. duplicates (sum of garage quantities). */
  carsOwned: number;
  /** Distinct products in the garage. */
  uniqueCars: number;
  seriesCompleted: number;
  ordersPlaced: number;
  /** Distinct garage products whose category is `racing`. */
  racingCars: number;
  /** Distinct garage products whose rarity is rare | super-rare | limited. */
  rareCars: number;
  /** Lifetime order totals in rupees. */
  totalSpent: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  xp: number;
  level: number;
  badges: BadgeId[];
  stats: UserStats;
  role: UserRole;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface GarageEntry {
  /** Document id === productId. */
  productId: string;
  addedAt: Millis;
  source: GarageSource;
  isFavorite: boolean;
  /** Copies owned (≥ 1) — powers the duplicates tracker. */
  quantity: number;
}

export interface WishlistEntry {
  /** Document id === productId. */
  productId: string;
  addedAt: Millis;
}

/* -------------------------------------------------------------------------- */
/*                                  Commerce                                  */
/* -------------------------------------------------------------------------- */

export interface Address {
  name: string;
  /** 10-digit Indian mobile, `^[6-9]\d{9}$`. */
  phone: string;
  /** 6-digit PIN, `^[1-9]\d{5}$`. */
  pincode: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  /** One of `INDIAN_STATES`. */
  state: string;
}

export interface SavedAddress extends Address {
  id: string;
  isDefault: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  /** Server-verified unit price in rupees. */
  price: number;
  qty: number;
  /** Image URL snapshot. */
  image: string;
}

export interface OrderPayment {
  provider: PaymentProviderId;
  status: PaymentStatus;
  transactionId: string;
  mode: PaymentMode;
}

export interface Order {
  id: string;
  uid: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  /** GST portion (informational when prices are tax inclusive). */
  tax: number;
  total: number;
  currency: Currency;
  address: Address;
  status: OrderStatus;
  payment: OrderPayment;
  paymentMethod: PaymentMethod;
  xpEarned: number;
  badgesUnlocked: BadgeId[];
  createdAt: Millis;
  updatedAt: Millis;
}

/** Result of a client-side payment attempt, verified again on the server. */
export interface PaymentResult {
  provider: PaymentProviderId;
  status: PaymentStatus;
  /** Dummy provider: `test_` + 20 lowercase hex chars. */
  transactionId: string;
  mode: PaymentMode;
  method: PaymentMethod;
  /** Amount charged in rupees; must equal the server-computed order total. */
  amount: number;
  message?: string;
}

export interface SiteSettings {
  /** Free shipping at or above this subtotal (₹). */
  shippingThreshold: number;
  /** Flat shipping fee below the threshold (₹). */
  shippingFee: number;
  /** GST rate, e.g. 0.18. */
  taxRate: number;
  /** Prices already include GST (tax line is informational). */
  taxInclusive: boolean;
  showGstLine: boolean;
  codEnabled: boolean;
  maxQtyPerItem: number;
  createdAt: Millis;
  updatedAt: Millis;
}

/* -------------------------------------------------------------------------- */
/*                                Gamification                                */
/* -------------------------------------------------------------------------- */

/** The `UserStats` counter a badge is measured against. */
export type BadgeMetric = Exclude<keyof UserStats, 'totalSpent'>;

export interface BadgeDefinition {
  id: BadgeId;
  emoji: string;
  title: string;
  description: string;
  /** Human-readable unlock rule, e.g. "Own 10 racing cars". */
  requirement: string;
  xpReward: number;
  metric: BadgeMetric;
  /** Unlocked when `stats[metric] >= target`. */
  target: number;
}

export interface BadgeProgress {
  id: BadgeId;
  current: number;
  target: number;
  /** 0–100. */
  pct: number;
  unlocked: boolean;
}

export interface XpProgress {
  level: number;
  xp: number;
  /** XP required to reach the current level. */
  levelStart: number;
  /** XP required for the next level, `null` at max level. */
  levelEnd: number | null;
  /** XP earned inside the current level. */
  current: number;
  /** Size of the current level span (0 at max level). */
  next: number;
  /** XP still needed for the next level (0 at max level). */
  toNext: number;
  /** 0–100 progress through the current level (100 at max level). */
  pct: number;
  isMax: boolean;
}

/* -------------------------------------------------------------------------- */
/*                          Callable request/response                         */
/* -------------------------------------------------------------------------- */

export interface PlaceOrderItemInput {
  productId: string;
  qty: number;
}

export interface PlaceOrderRequest {
  items: PlaceOrderItemInput[];
  address: Address;
  payment: PaymentResult;
}

export interface PlaceOrderResponse {
  orderId: string;
  xpEarned: number;
  badgesUnlocked: BadgeId[];
  /** Level after the order. */
  level: number;
  leveledUp: boolean;
  /** Server-computed order total (₹). */
  total: number;
}

export interface SubmitReviewRequest {
  productId: string;
  rating: number;
  text: string;
}

export interface SubmitReviewResponse {
  /** === uid of the reviewer. */
  reviewId: string;
}

export interface NewsletterRequest {
  email: string;
}

export interface NewsletterResponse {
  status: 'subscribed' | 'already-subscribed';
}

export interface EnsureProfileResponse {
  created: boolean;
}
