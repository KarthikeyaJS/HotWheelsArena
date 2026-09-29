/**
 * TanStack Query key factory. Every user-scoped key starts with `['user', uid]` so sign-out can
 * drop them all with `queryClient.removeQueries({ queryKey: queryKeys.user(uid) })`.
 */
export const queryKeys = {
  /** Prefix for every product query. */
  products: () => ['products'] as const,
  /** All active products (the catalogue; filtered client-side). */
  productList: () => ['products', 'list'] as const,
  product: (slug: string) => ['products', 'detail', slug] as const,
  productsByIds: (ids: readonly string[]) =>
    ['products', 'byIds', [...new Set(ids)].sort().join(',')] as const,

  categories: () => ['categories'] as const,

  /** Prefix for every series query. */
  seriesAll: () => ['series'] as const,
  seriesList: () => ['series', 'list'] as const,
  series: (slug: string) => ['series', 'detail', slug] as const,

  reviews: (productId: string) => ['reviews', productId] as const,

  siteSettings: () => ['settings', 'site'] as const,

  /** Prefix for everything belonging to all users (sign-out safety net). */
  userAll: () => ['user'] as const,
  /** Prefix for everything belonging to one user. */
  user: (uid: string) => ['user', uid] as const,
  profile: (uid: string) => ['user', uid, 'profile'] as const,
  garage: (uid: string) => ['user', uid, 'garage'] as const,
  wishlist: (uid: string) => ['user', uid, 'wishlist'] as const,
  orders: (uid: string) => ['user', uid, 'orders'] as const,
  order: (uid: string, orderId: string) => ['user', uid, 'orders', orderId] as const,
  addresses: (uid: string) => ['user', uid, 'addresses'] as const,
} as const;

/** Mutation keys (used to detect concurrent optimistic mutations before invalidating). */
export const mutationKeys = {
  garage: ['garage'] as const,
  wishlist: ['wishlist'] as const,
  placeOrder: ['placeOrder'] as const,
  submitReview: ['submitReview'] as const,
  newsletter: ['newsletter'] as const,
  saveAddress: ['saveAddress'] as const,
  deleteAddress: ['deleteAddress'] as const,
} as const;

/** Placeholder uid for disabled (signed-out) user-scoped queries. Never fetched. */
export const ANONYMOUS_UID = '__anonymous__';

/** staleTime presets (ms). Default for anything else: 60s (QueryClient default). */
export const STALE_TIMES = {
  /** Catalogue (products) — fetched once, filtered client-side. */
  products: 5 * 60_000,
  /** Categories / series / site settings — rarely change. */
  catalog: 10 * 60_000,
  reviews: 60_000,
  /** Garage / wishlist / orders / addresses. */
  user: 60_000,
} as const;
