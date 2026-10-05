import type { GarageEntry, Series } from '@/types';
import { makeProduct } from '../../product/__tests__/fixtures';
import type { GarageCarView } from '../garageModel';

export { makeProduct };
export { ROUTER_FUTURE } from '../../product/__tests__/fixtures';

export const DAY = 24 * 60 * 60 * 1000;
export const NOW = 1_790_000_000_000;

export function makeEntry(overrides: Partial<GarageEntry> = {}): GarageEntry {
  return {
    productId: 'twin-mill-orange',
    addedAt: NOW - DAY,
    source: 'manual',
    isFavorite: false,
    quantity: 1,
    ...overrides,
  };
}

export function makeSeries(overrides: Partial<Series> = {}): Series {
  return {
    id: 'hw-exotics-2026',
    name: 'HW Exotics',
    slug: 'hw-exotics-2026',
    year: 2026,
    totalCars: 3,
    carIds: ['revuelto', 'mclaren-750s', 'gt3-rs'],
    description: 'Exotics.',
    isActive: true,
    createdAt: NOW - 100 * DAY,
    updatedAt: NOW - 100 * DAY,
    ...overrides,
  };
}

/** A small, realistic catalogue spread over two series. */
export const CATALOGUE = [
  makeProduct({
    id: 'revuelto',
    slug: 'revuelto',
    name: 'Lamborghini Revuelto',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    category: 'sports',
    rarity: 'super-rare',
    rarityScore: 9,
    price: 1299,
    collectionNumber: 12,
  }),
  makeProduct({
    id: 'mclaren-750s',
    slug: 'mclaren-750s',
    name: 'McLaren 750S',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    category: 'sports',
    rarity: 'rare',
    rarityScore: 6,
    price: 549,
    collectionNumber: 27,
  }),
  makeProduct({
    id: 'gt3-rs',
    slug: 'gt3-rs',
    name: 'Porsche 911 GT3 RS',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    category: 'sports',
    rarity: 'rare',
    rarityScore: 7,
    price: 499,
    collectionNumber: 31,
  }),
  makeProduct({
    id: 'swift-rally',
    slug: 'swift-rally',
    name: 'Maruti Suzuki Swift INRC Rally',
    series: 'hw-race-day-2024',
    seriesName: 'HW Race Day',
    category: 'racing',
    rarity: 'common',
    rarityScore: 3,
    price: 199,
    collectionNumber: 88,
  }),
  makeProduct({
    id: 'corvette-c8r',
    slug: 'corvette-c8r',
    name: 'Chevrolet Corvette C8.R',
    series: 'hw-race-day-2024',
    seriesName: 'HW Race Day',
    category: 'racing',
    rarity: 'common',
    rarityScore: 4,
    price: 279,
    collectionNumber: 64,
  }),
] as const;

export const SERIES_LIST: Series[] = [
  makeSeries(),
  makeSeries({
    id: 'hw-race-day-2024',
    slug: 'hw-race-day-2024',
    name: 'HW Race Day',
    year: 2024,
    totalCars: 2,
    carIds: ['swift-rally', 'corvette-c8r'],
  }),
  makeSeries({
    id: 'hw-rescue-2025',
    slug: 'hw-rescue-2025',
    name: 'HW Rescue',
    year: 2025,
    totalCars: 1,
    carIds: ['fire-tender'],
  }),
];

export function catalogueMap() {
  return new Map(CATALOGUE.map((product) => [product.id, product]));
}

export function carView(
  overrides: Partial<GarageEntry> & { productId: string },
  retired = false,
): GarageCarView {
  const product = catalogueMap().get(overrides.productId) ?? null;
  return {
    entry: makeEntry(overrides),
    product: product && retired ? { ...product, isActive: false } : product,
    retired: retired || !product,
  };
}
