import { describe, expect, it } from 'vitest';
import { buildSearchIndex } from '@/lib/search';
import type { Product } from '@/types';
import { QUICK_LINKS, buildPaletteGroups, countPaletteResults } from '../paletteModel';

function product(id: string, name: string, make: string, model: string): Product {
  return {
    id,
    slug: id,
    name,
    description: '',
    make,
    model,
    series: 'hw-turbo-2025',
    seriesName: 'HW Turbo',
    seriesNumber: 2,
    collectionNumber: 7,
    year: 2025,
    scale: '1:64',
    color: 'Red',
    material: 'Die-cast metal',
    vehicleType: 'Coupe',
    category: 'racing',
    rarity: 'common',
    rarityScore: 2,
    collectorScore: 4,
    themedStats: { topSpeedKmh: 280, powerHp: 400 },
    price: 299,
    compareAtPrice: null,
    currency: 'INR',
    stock: 10,
    limitedEdition: null,
    images: [],
    primaryImage: '/placeholders/car-generic.svg',
    ratingAvg: 4,
    ratingCount: 1,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  };
}

const products = [
  product('toyota-supra', 'Toyota Supra (A80)', 'Toyota', 'Supra (A80)'),
  product('toyota-gr010', 'Toyota GR010 Hybrid', 'Toyota', 'GR010 Hybrid'),
];
const index = buildSearchIndex(products);

describe('buildPaletteGroups', () => {
  it('blank query → recent searches, default quick links and all categories', () => {
    const groups = buildPaletteGroups({ query: '  ', products, index, recent: ['Supra'] });
    expect(groups.map((g) => g.id)).toEqual(['recent', 'links', 'categories']);
    expect(groups[0]?.items[0]).toMatchObject({ kind: 'recent', to: '/search?q=Supra' });
    expect(groups[1]?.items).toHaveLength(QUICK_LINKS.filter((l) => !l.searchOnly).length);
    expect(groups[2]?.items).toHaveLength(6);
    expect(countPaletteResults(groups)).toBe(1 + (groups[1]?.items.length ?? 0) + 6);
  });

  it('omits the recent group when there is no history', () => {
    const groups = buildPaletteGroups({ query: '', products, index, recent: [] });
    expect(groups.map((g) => g.id)).toEqual(['links', 'categories']);
  });

  it('query → free-text search first, then make/models and cars', () => {
    const groups = buildPaletteGroups({ query: 'toyota', products, index, recent: [] });
    expect(groups[0]?.items).toEqual([
      expect.objectContaining({ kind: 'search', to: '/search?q=toyota', recentQuery: 'toyota' }),
    ]);
    const make = groups.find((g) => g.id === 'make:toyota');
    expect(make?.heading).toBe('Makes → Models');
    expect(make?.items.map((i) => [i.kind, i.label, i.count])).toEqual([
      ['make', 'Toyota', 2],
      ['model', 'GR010 Hybrid', 1],
      ['model', 'Supra (A80)', 1],
    ]);
    expect(make?.items[2]?.to).toBe(`/search?q=${encodeURIComponent('Toyota Supra (A80)')}`);
    const cars = groups.find((g) => g.id === 'cars');
    expect(cars?.items.map((i) => i.to)).toEqual(
      expect.arrayContaining(['/product/toyota-supra', '/product/toyota-gr010']),
    );
  });

  it('matches categories and quick links by keywords', () => {
    const offRoad = buildPaletteGroups({ query: 'off', products, index, recent: [] });
    expect(offRoad.find((g) => g.id === 'categories')?.items[0]).toMatchObject({
      label: 'Off Road',
      to: '/shop?category=off-road',
    });
    const cart = buildPaletteGroups({ query: 'basket', products, index, recent: [] });
    expect(cart.find((g) => g.id === 'links')?.items[0]).toMatchObject({ to: '/cart' });
    const faq = buildPaletteGroups({ query: 'help', products, index, recent: [] });
    expect(faq.find((g) => g.id === 'links')?.items.map((i) => i.to)).toEqual(
      expect.arrayContaining(['/faq', '/contact']),
    );
  });

  it('counts zero results when only the free-text option remains', () => {
    const groups = buildPaletteGroups({ query: 'zzqx', products, index, recent: [] });
    expect(groups.map((g) => g.id)).toEqual(['search']);
    expect(countPaletteResults(groups)).toBe(0);
  });
});
