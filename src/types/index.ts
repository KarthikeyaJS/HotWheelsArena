/**
 * Canonical type import point for the web app: `import type { Product, CartItem } from '@/types'`.
 * Re-exports every shared domain type plus client-only types.
 */
import type { ReactNode } from 'react';
import type { GarageEntry, Product } from '@shared/types';

export type {
  Address,
  BadgeDefinition,
  BadgeId,
  BadgeMetric,
  BadgeProgress,
  Category,
  CategorySlug,
  Currency,
  EnsureProfileResponse,
  GarageEntry,
  GarageSource,
  LimitedEdition,
  Millis,
  NewsletterRequest,
  NewsletterResponse,
  Order,
  OrderItem,
  OrderPayment,
  OrderStatus,
  PaymentMethod,
  PaymentMode,
  PaymentProviderId,
  PaymentResult,
  PaymentStatus,
  PlaceOrderItemInput,
  PlaceOrderRequest,
  PlaceOrderResponse,
  Product,
  ProductImage,
  Rarity,
  Review,
  SavedAddress,
  Series,
  SiteSettings,
  SubmitReviewRequest,
  SubmitReviewResponse,
  ThemedStats,
  UserProfile,
  UserRole,
  UserStats,
  WishlistEntry,
  XpProgress,
} from '@shared/types';

export type { IndianState } from '@shared/india';
export type { OrderLine, OrderTotals, TotalsSettings } from '@shared/commerce';
export type { GarageDerivedStats, SeriesCompletion } from '@shared/gamification';
export type { AddressInput, NewsletterInput, ReviewFormValues } from '@shared/schemas';

/* ------------------------------ Client-only ------------------------------ */

/** A cart line (persisted in localStorage under `hwa-cart-v1`). Prices are display-only. */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  /** Unit price snapshot (₹). The server recomputes on checkout. */
  price: number;
  /** Image URL (product `primaryImage`). */
  image: string;
  qty: number;
  /** Stock snapshot used to clamp `qty`. */
  stock: number;
  seriesName?: string;
  collectionNumber?: number;
}

export type Theme = 'dark' | 'light';
/** `auto` = on in dark theme, off in light theme. */
export type ScanlineMode = 'auto' | 'on' | 'off';

export type ToastVariant = 'default' | 'success' | 'error' | 'achievement';

/**
 * Optional action button inside a toast (e.g. "Undo"). Clicking it runs `onClick` and then
 * dismisses the toast. Keep an equivalent inline control for anything important: toasts time
 * out (paused while hovered/focused), so they must never be the only way to undo.
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title: string;
  description?: string;
  /** Defaults to `default`. */
  variant?: ToastVariant;
  /** Emoji or icon element rendered before the title. */
  icon?: ReactNode;
  /** Auto-dismiss delay in ms (Toaster enforces it). `Infinity` = sticky. */
  duration?: number;
  /** Optional action button (toasts with an action stay at least `MIN_ACTION_TOAST_DURATION`). */
  action?: ToastAction;
}

export interface Toast extends Required<Pick<ToastInput, 'title' | 'variant' | 'duration'>> {
  id: string;
  description?: string;
  icon?: ReactNode;
  action?: ToastAction;
  createdAt: number;
}

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

export interface SignInPromptState {
  open: boolean;
  /** Why sign-in is needed, e.g. "Sign in to park cars in your garage". */
  reason?: string;
}

export type StockStatus = 'in-stock' | 'low' | 'sold-out';

export interface StockInfo {
  status: StockStatus;
  /** Display label, e.g. `IN STOCK`, `ONLY 3 LEFT`, `SOLD OUT`. */
  label: string;
}

export interface LimitedEditionInfo {
  /** `#001/500`. */
  label: string;
  editionNumber: number;
  editionSize: number;
  /** Static remaining counter (product `stock`). */
  remaining: number;
  /** 0–100 share of the edition already claimed. */
  claimedPct: number;
}

/** A product joined with its garage entry (garage page). */
export interface GarageCar {
  entry: GarageEntry;
  product: Product;
}
