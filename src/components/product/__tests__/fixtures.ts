import type { Product } from '@/types';

/** A complete, realistic product document for component tests. */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'twin-mill-orange',
    slug: 'twin-mill-orange',
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
      {
        publicId: 'hotwheelsarena/twin-mill-orange',
        url: '/placeholders/supercar-orange.svg',
        alt: 'Orange Twin Mill concept car',
      },
    ],
    primaryImage: '/placeholders/supercar-orange.svg',
    ratingAvg: 4.5,
    ratingCount: 12,
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

/** react-router v7 future flags (silences the v6 upgrade warnings in tests). */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;
