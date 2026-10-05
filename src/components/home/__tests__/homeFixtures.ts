import type { Category, CategorySlug, Product } from '@/types';

/** A complete product document for home-page tests. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 'twin-mill-orange';
  return {
    id,
    slug: id,
    name: 'Twin Mill',
    description: 'A legendary twin-engine concept.',
    make: 'Hot Rod Co',
    model: 'Twin Mill',
    series: 'hw-legends-2025',
    seriesName: 'HW Legends',
    seriesNumber: 3,
    collectionNumber: 142,
    year: 2025,
    scale: '1:64',
    color: 'Orange',
    material: 'Die-cast metal',
    vehicleType: 'Concept',
    category: 'sports',
    rarity: 'rare',
    rarityScore: 7,
    collectorScore: 8,
    themedStats: { topSpeedKmh: 320, powerHp: 900 },
    price: 1299,
    compareAtPrice: null,
    currency: 'INR',
    stock: 25,
    limitedEdition: null,
    images: [
      { publicId: `hotwheelsarena/${id}`, url: '/placeholders/supercar-orange.svg', alt: 'Car' },
    ],
    primaryImage: '/placeholders/supercar-orange.svg',
    ratingAvg: 4.5,
    ratingCount: 12,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: 1_760_000_000_000,
    updatedAt: 1_760_000_000_000,
    ...overrides,
  };
}

export function makeCategory(slug: CategorySlug, order: number, isActive = true): Category {
  return {
    id: slug,
    slug,
    name: slug,
    icon: 'Gauge',
    order,
    description: '',
    isActive,
    createdAt: null,
    updatedAt: null,
  };
}

/** A small catalogue covering every home section. */
export const HOME_PRODUCTS: Product[] = [
  makeProduct({ id: 'new-sports', name: 'Neon Racer', category: 'sports', isNew: true }),
  makeProduct({ id: 'new-racing', name: 'Track Day GT', category: 'racing', isNew: true }),
  makeProduct({ id: 'featured-rescue', name: 'Ladder Unit', category: 'rescue', isFeatured: true }),
  makeProduct({
    id: 'vault-001',
    name: 'Countach Vault',
    category: 'limited',
    rarity: 'limited',
    isVault: true,
    stock: 37,
    limitedEdition: { editionNumber: 1, editionSize: 500 },
  }),
  makeProduct({
    id: 'vault-003',
    name: 'GT40 Vault',
    category: 'limited',
    rarity: 'limited',
    isVault: true,
    stock: 3,
    limitedEdition: { editionNumber: 3, editionSize: 50 },
  }),
];

/** react-router v7 future flags (silences the v6 upgrade warnings in tests). */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

/**
 * `window.matchMedia` stub answering `true` for every query that contains one of `matching`.
 * Returns a restore function.
 */
export function stubMatchMedia(matching: readonly string[]): () => void {
  const original = window.matchMedia;
  window.matchMedia = (query: string): MediaQueryList => {
    const list = new EventTarget() as MediaQueryList & EventTarget;
    Object.assign(list, {
      matches: matching.some((fragment) => query.includes(fragment)),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
    });
    return list;
  };
  return () => {
    window.matchMedia = original;
  };
}
