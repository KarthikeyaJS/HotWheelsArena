import type { Product, Series } from '@/types';

/** React Router v7 future flags (silences the upgrade warnings in tests). */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

/** A complete product document for content/vault/collections tests (mirrors the seed shape). */
export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  const { id } = overrides;
  return {
    slug: id,
    name: id,
    description: '',
    make: 'Garage Originals',
    model: id,
    series: 'hw-rescue-2025',
    seriesName: 'HW Rescue',
    seriesNumber: 1,
    collectionNumber: 1,
    year: 2025,
    scale: '1:64',
    color: 'Red',
    material: 'Die-cast metal body, plastic base',
    vehicleType: 'Truck',
    category: 'rescue',
    rarity: 'common',
    rarityScore: 3,
    collectorScore: 5,
    themedStats: { topSpeedKmh: 180, powerHp: 300 },
    price: 249,
    compareAtPrice: null,
    currency: 'INR',
    stock: 50,
    limitedEdition: null,
    images: [],
    primaryImage: '/placeholders/car-generic.svg',
    ratingAvg: 0,
    ratingCount: 0,
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

/** A vault edition: `editionNumber/editionSize` with `stock` cars left. */
export function makeVaultProduct(
  id: string,
  name: string,
  stock: number,
  editionNumber: number,
  editionSize: number,
): Product {
  return makeProduct({
    id,
    name,
    stock,
    rarity: 'limited',
    category: 'limited',
    isVault: true,
    limitedEdition: { editionNumber, editionSize },
    price: 1999,
  });
}

export function makeSeries(overrides: Partial<Series> & Pick<Series, 'id'>): Series {
  const { id } = overrides;
  return {
    name: id,
    slug: id,
    year: 2025,
    totalCars: overrides.carIds?.length ?? 0,
    carIds: [],
    description: '',
    isActive: true,
    createdAt: 1_760_000_000_000,
    updatedAt: 1_760_000_000_000,
    ...overrides,
  };
}

/** The five HW Rescue cars (series order) used by the series tests. */
export const RESCUE_CARS: readonly Product[] = [
  makeProduct({
    id: 'force-traveller-ambulance',
    name: 'Force Traveller Ambulance',
    seriesNumber: 1,
  }),
  makeProduct({ id: 'tata-signa-fire-tender', name: 'Tata Signa Fire Tender', seriesNumber: 2 }),
  makeProduct({
    id: 'mahindra-scorpio-n-highway-patrol',
    name: 'Mahindra Scorpio-N Highway Patrol',
    seriesNumber: 3,
  }),
  makeProduct({ id: 'dodge-charger-pursuit', name: 'Dodge Charger Pursuit', seriesNumber: 4 }),
  makeProduct({
    id: 'ashok-leyland-crash-tender',
    name: 'Ashok Leyland Airport Crash Tender',
    seriesNumber: 5,
    rarity: 'rare',
    price: 499,
  }),
];

export const RESCUE_SERIES: Series = makeSeries({
  id: 'hw-rescue-2025',
  name: 'HW Rescue',
  year: 2025,
  description: 'Five first responders.',
  carIds: RESCUE_CARS.map((car) => car.id),
});
