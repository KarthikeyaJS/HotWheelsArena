/**
 * Route paths + typed path builders. Use these instead of hand-written strings so links stay
 * in sync with src/router.tsx.
 */
import type { CategorySlug } from '@shared/types';

export const ROUTES = {
  home: '/',
  shop: '/shop',
  search: '/search',
  collections: '/collections',
  series: '/collections/:slug',
  product: '/product/:slug',
  vault: '/vault',
  cart: '/cart',
  checkout: '/checkout',
  orderSuccess: '/checkout/success/:orderId',
  orders: '/orders',
  orderDetail: '/orders/:orderId',
  garage: '/garage',
  wishlist: '/wishlist',
  about: '/about',
  contact: '/contact',
  faq: '/faq',
  shippingReturns: '/shipping-returns',
  privacy: '/privacy',
  terms: '/terms',
  newDrops: '/new-drops',
} as const;

export type GarageTab = 'collection' | 'wishlist' | 'favorites' | 'achievements' | 'stats';
export const GARAGE_TABS: readonly GarageTab[] = [
  'collection',
  'wishlist',
  'favorites',
  'achievements',
  'stats',
];

export const productPath = (slug: string): string => `/product/${encodeURIComponent(slug)}`;

export const seriesPath = (slug: string): string => `/collections/${encodeURIComponent(slug)}`;

export const orderPath = (orderId: string): string => `/orders/${encodeURIComponent(orderId)}`;

export const orderSuccessPath = (orderId: string): string =>
  `/checkout/success/${encodeURIComponent(orderId)}`;

export const garagePath = (tab?: GarageTab): string =>
  tab && tab !== 'collection' ? `/garage?tab=${tab}` : '/garage';

export const searchPath = (query?: string): string => {
  const q = query?.trim();
  return q ? `/search?q=${encodeURIComponent(q)}` : '/search';
};

/** Query params understood by /shop (the shop agent may accept more). */
export interface ShopPathParams {
  view?: string;
  category?: CategorySlug;
  series?: string;
  sort?: string;
  q?: string;
}

export const shopPath = (params: ShopPathParams = {}): string => {
  const search = new URLSearchParams();
  (Object.entries(params) as Array<[keyof ShopPathParams, string | undefined]>).forEach(
    ([key, value]) => {
      if (value) search.set(key, value);
    },
  );
  const qs = search.toString();
  return qs ? `/shop?${qs}` : '/shop';
};
