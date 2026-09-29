import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import {
  LOW_STOCK_THRESHOLD,
  RARITY_ORDER,
  compareByRarityDesc,
  discountPercent,
  getRelatedProducts,
  isLowStock,
  isRare,
  isSoldOut,
  limitedEditionInfo,
  primaryImageOf,
  productHudLine,
  productMetaLine,
  productSpecs,
  rarityLabel,
  stockStatus,
  toCartItem,
} from './product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
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
    rarity: 'common',
    rarityScore: 3,
    collectorScore: 6,
    themedStats: { topSpeedKmh: 320, powerHp: 900 },
    price: 299,
    compareAtPrice: null,
    currency: 'INR',
    stock: 25,
    limitedEdition: null,
    images: [
      {
        publicId: 'hwa/twin-mill',
        url: '/placeholders/concept-orange.svg',
        alt: 'Orange Twin Mill',
      },
      { publicId: 'hwa/twin-mill-side', url: '/placeholders/concept-orange-side.svg', alt: '' },
    ],
    primaryImage: '/placeholders/concept-orange.svg',
    ratingAvg: 4.5,
    ratingCount: 12,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('stock helpers', () => {
  it('classifies stock levels', () => {
    expect(stockStatus(25)).toEqual({ status: 'in-stock', label: 'IN STOCK' });
    expect(stockStatus(3)).toEqual({ status: 'low', label: 'ONLY 3 LEFT' });
    expect(stockStatus(LOW_STOCK_THRESHOLD)).toMatchObject({ status: 'low' });
    expect(stockStatus(0)).toEqual({ status: 'sold-out', label: 'SOLD OUT' });
  });

  it('treats invalid stock as sold out', () => {
    expect(isSoldOut(Number.NaN)).toBe(true);
    expect(isSoldOut(-1)).toBe(true);
    expect(isLowStock(0)).toBe(false);
    expect(isLowStock(1)).toBe(true);
  });
});

describe('rarity helpers', () => {
  it('labels and ranks rarities', () => {
    expect(rarityLabel('super-rare')).toBe('SUPER RARE');
    expect(RARITY_ORDER.limited).toBeGreaterThan(RARITY_ORDER.rare);
    const sorted = [
      makeProduct({ id: 'a', rarity: 'common' }),
      makeProduct({ id: 'b', rarity: 'limited' }),
      makeProduct({ id: 'c', rarity: 'rare' }),
    ].sort(compareByRarityDesc);
    expect(sorted.map((product) => product.id)).toEqual(['b', 'c', 'a']);
  });

  it('detects rare cars', () => {
    expect(isRare('common')).toBe(false);
    expect(isRare('rare')).toBe(true);
    expect(isRare(makeProduct({ rarity: 'limited' }))).toBe(true);
  });
});

describe('images', () => {
  it('finds the primary image and fills a missing alt', () => {
    const product = makeProduct({ primaryImage: '/placeholders/concept-orange-side.svg' });
    expect(primaryImageOf(product)).toEqual({
      publicId: 'hwa/twin-mill-side',
      url: '/placeholders/concept-orange-side.svg',
      alt: 'Twin Mill',
    });
  });

  it('falls back to the first image, then to a placeholder', () => {
    expect(primaryImageOf(makeProduct({ primaryImage: '/missing.svg' })).publicId).toBe(
      'hwa/twin-mill',
    );
    expect(primaryImageOf(makeProduct({ images: [], primaryImage: '' })).url).toBe(
      '/placeholders/car-generic.svg',
    );
  });
});

describe('toCartItem', () => {
  it('maps a product to a cart line', () => {
    expect(toCartItem(makeProduct())).toEqual({
      productId: 'p1',
      slug: 'twin-mill-orange',
      name: 'Twin Mill',
      price: 299,
      image: '/placeholders/concept-orange.svg',
      stock: 25,
      seriesName: 'HW Legends',
      collectionNumber: 142,
    });
  });
});

describe('getRelatedProducts', () => {
  it('ranks by series, category, make and rarity and excludes self / inactive', () => {
    const base = makeProduct();
    const sameSeries = makeProduct({ id: 's', category: 'racing', make: 'Other' });
    const sameCategory = makeProduct({ id: 'c', series: 'x', make: 'Other' });
    const inactive = makeProduct({ id: 'i', isActive: false });
    const unrelated = makeProduct({
      id: 'u',
      series: 'y',
      category: 'rescue',
      make: 'Nope',
      rarity: 'limited',
    });
    const related = getRelatedProducts(base, [base, sameCategory, sameSeries, inactive, unrelated]);
    expect(related.map((product) => product.id)).toEqual(['s', 'c']);
    expect(getRelatedProducts(base, [sameSeries, sameCategory], 1)).toHaveLength(1);
  });
});

describe('pricing and editions', () => {
  it('computes discount percentages', () => {
    expect(discountPercent({ price: 299, compareAtPrice: null })).toBeNull();
    expect(discountPercent({ price: 299, compareAtPrice: 299 })).toBeNull();
    expect(discountPercent({ price: 300, compareAtPrice: 400 })).toBe(25);
  });

  it('describes limited editions', () => {
    expect(limitedEditionInfo(makeProduct())).toBeNull();
    const info = limitedEditionInfo(
      makeProduct({ stock: 37, limitedEdition: { editionNumber: 1, editionSize: 500 } }),
    );
    expect(info).toEqual({
      label: '#001/500',
      editionNumber: 1,
      editionSize: 500,
      remaining: 37,
      claimedPct: ((500 - 37) / 500) * 100,
    });
  });
});

describe('display lines', () => {
  it('builds meta and HUD lines', () => {
    const product = makeProduct();
    expect(productMetaLine(product)).toBe('HW LEGENDS · 2025 SERIES');
    expect(productHudLine(product)).toEqual({ series: 'SERIES 03', collection: '#142' });
  });

  it('lists specs without empty values', () => {
    const specs = productSpecs(makeProduct({ vehicleType: '' }));
    expect(specs.map((spec) => spec.label)).toEqual([
      'SCALE',
      'YEAR',
      'SERIES',
      'COLOR',
      'MATERIAL',
    ]);
  });
});
