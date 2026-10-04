import { DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import type { CartItem, Product, SiteSettings } from '@/types';

/** A complete, realistic product for commerce tests. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 'porsche-911-gt3-rs';
  return {
    id,
    slug: id,
    name: 'Porsche 911 GT3 RS',
    description: 'Track weapon.',
    make: 'Porsche',
    model: '911 GT3 RS',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    seriesNumber: 3,
    collectionNumber: 142,
    year: 2026,
    scale: '1:64',
    color: 'Blue',
    material: 'Die-cast metal',
    vehicleType: 'Sports Coupe',
    category: 'sports',
    rarity: 'rare',
    rarityScore: 7,
    collectorScore: 8,
    themedStats: { topSpeedKmh: 312, powerHp: 518 },
    price: 499,
    compareAtPrice: null,
    currency: 'INR',
    stock: 26,
    limitedEdition: null,
    images: [
      { publicId: `hotwheelsarena/${id}`, url: '/placeholders/sports-blue.svg', alt: 'Blue 911' },
    ],
    primaryImage: '/placeholders/sports-blue.svg',
    ratingAvg: 4.5,
    ratingCount: 3,
    tags: [],
    isNew: false,
    isFeatured: true,
    isVault: false,
    isActive: true,
    createdAt: 1_760_000_000_000,
    updatedAt: 1_760_000_000_000,
    ...overrides,
  };
}

/** Cart line snapshot for `product` (optionally with stale values). */
export function makeCartItem(product: Product, overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.primaryImage,
    qty: 1,
    stock: product.stock,
    seriesName: product.seriesName,
    collectionNumber: product.collectionNumber,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return { ...DEFAULT_SITE_SETTINGS, ...overrides };
}

/** react-router v7 future flags (silences the v6 upgrade warnings in tests). */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;
