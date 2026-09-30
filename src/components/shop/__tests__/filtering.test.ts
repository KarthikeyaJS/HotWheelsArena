import { describe, expect, it } from 'vitest';
import {
  SEARCH_SORT_OPTIONS,
  SHOP_VIEWS,
  SORT_OPTIONS,
  getCategoryHeader,
  getShopView,
  isPremiumProduct,
  viewForCategory,
} from '@/config/shop';
import {
  applyFilters,
  clearFilters,
  computeFacets,
  countActiveFilters,
  createEmptyFilters,
  priceBounds,
  priceToRange,
  rangeToPrice,
  sortProducts,
  type FacetOption,
  type ProductFilters,
} from '../filtering';
import { CATALOGUE, ids, makeShopProduct } from './fixtures';

const filters = (patch: Partial<ProductFilters> = {}): ProductFilters => ({
  ...createEmptyFilters(),
  ...patch,
});

const option = (options: readonly FacetOption[], value: string): FacetOption | undefined =>
  options.find((entry) => entry.value === value);

describe('shop views', () => {
  it('has the eight spec views in tab order', () => {
    expect(SHOP_VIEWS.map((view) => view.id)).toEqual([
      'all',
      'new',
      'premium',
      'limited',
      'racing',
      'sports',
      'off-road',
      'special',
    ]);
  });

  it('matches the expected cars for every view', () => {
    const run = (view: ProductFilters['view']) => ids(applyFilters(CATALOGUE, filters({ view })));
    expect(run('all')).toHaveLength(CATALOGUE.length);
    expect(run('new')).toEqual(['lamborghini-revuelto', 'porsche-911-gt3-rs', 'midnight-blower']);
    expect(run('premium')).toEqual([
      'lamborghini-revuelto', // tag 'premium'
      'mercedes-amg-one', // 1:43
      'porsche-911-turbo-3-3', // 1:18
      'toyota-supra-a80', // ₹1,199 ≥ ₹999
    ]);
    expect(run('limited')).toEqual(['mercedes-amg-one', 'porsche-911-turbo-3-3']);
    expect(run('racing')).toEqual(['toyota-gr010-hybrid', 'maruti-suzuki-swift-inrc-rally']);
    expect(run('sports')).toEqual([
      'lamborghini-revuelto',
      'porsche-911-gt3-rs',
      'toyota-supra-a80',
      'porsche-911-turbo-s',
    ]);
    expect(run('off-road')).toEqual(['porsche-911-safari-rally']);
    expect(run('special')).toEqual(['midnight-blower']);
  });

  it('premium: tag OR non-1:64 scale OR price ≥ ₹999', () => {
    const base = makeShopProduct({ id: 'x', price: 998, scale: '1:64', tags: [] });
    expect(isPremiumProduct(base)).toBe(false);
    expect(isPremiumProduct({ ...base, price: 999 })).toBe(true);
    expect(isPremiumProduct({ ...base, scale: '1:43' })).toBe(true);
    expect(isPremiumProduct({ ...base, tags: ['Premium'] })).toBe(true);
  });

  it('limited: rarity limited OR vault', () => {
    const view = getShopView('limited');
    expect(view.predicate(makeShopProduct({ id: 'a', rarity: 'limited' }))).toBe(true);
    expect(view.predicate(makeShopProduct({ id: 'b', isVault: true }))).toBe(true);
    expect(view.predicate(makeShopProduct({ id: 'c', rarity: 'super-rare' }))).toBe(false);
  });

  it('resolves category views and header copy', () => {
    expect(viewForCategory('off-road')?.id).toBe('off-road');
    expect(viewForCategory('rescue')).toBeUndefined();
    expect(getShopView('nope').id).toBe('all');
    expect(getCategoryHeader('rescue').title).toMatch(/first responders/i);
    expect(getCategoryHeader('racing').title).toBe(getShopView('racing').title);
    for (const view of SHOP_VIEWS) {
      expect(view.title.length).toBeGreaterThan(3);
      expect(view.description.length).toBeGreaterThan(20);
    }
  });
});

describe('applyFilters', () => {
  it('applies list facets case-insensitively (OR within a group, AND across groups)', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ make: ['porsche'] })))).toEqual([
      'porsche-911-gt3-rs',
      'porsche-911-turbo-3-3',
      'porsche-911-turbo-s',
      'porsche-911-safari-rally',
    ]);
    expect(
      ids(applyFilters(CATALOGUE, filters({ make: ['Porsche', 'Toyota'], color: ['red'] }))),
    ).toEqual(['porsche-911-turbo-s', 'toyota-gr010-hybrid']);
  });

  it('filters by series, year, scale, rarity and availability', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ series: ['hw-race-day-2024'] })))).toEqual([
      'toyota-gr010-hybrid',
      'maruti-suzuki-swift-inrc-rally',
    ]);
    expect(applyFilters(CATALOGUE, filters({ year: ['2024'] }))).toHaveLength(3);
    expect(ids(applyFilters(CATALOGUE, filters({ scale: ['1:43', '1:18'] })))).toEqual([
      'mercedes-amg-one',
      'porsche-911-turbo-3-3',
    ]);
    expect(applyFilters(CATALOGUE, filters({ rarity: ['super-rare'] }))).toHaveLength(2);
    expect(ids(applyFilters(CATALOGUE, filters({ availability: ['sold-out'] })))).toEqual([
      'toyota-supra-a80',
      'toyota-gr010-hybrid',
    ]);
    expect(ids(applyFilters(CATALOGUE, filters({ availability: ['low'] })))).toEqual([
      'lamborghini-revuelto',
      'mercedes-amg-one',
      'porsche-911-turbo-3-3',
    ]);
  });

  it('applies an inclusive price range with open ends', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ priceMin: 1199 })))).toEqual([
      'lamborghini-revuelto',
      'mercedes-amg-one',
      'porsche-911-turbo-3-3',
      'toyota-supra-a80',
    ]);
    expect(ids(applyFilters(CATALOGUE, filters({ priceMax: 349 })))).toEqual([
      'porsche-911-turbo-s',
      'maruti-suzuki-swift-inrc-rally',
    ]);
    expect(applyFilters(CATALOGUE, filters({ priceMin: 449, priceMax: 649 }))).toHaveLength(4);
  });

  it('combines the view, an extra category and rail filters', () => {
    expect(ids(applyFilters(CATALOGUE, filters({ view: 'new', category: 'special' })))).toEqual([
      'midnight-blower',
    ]);
    expect(applyFilters(CATALOGUE, filters({ view: 'racing', make: ['Porsche'] }))).toEqual([]);
  });

  it('counts and clears active filters', () => {
    const active = filters({
      view: 'premium',
      category: 'rescue',
      make: ['Porsche', 'Toyota'],
      priceMin: 500,
    });
    expect(countActiveFilters(active)).toBe(4);
    expect(clearFilters(active)).toEqual(createEmptyFilters('premium'));
    expect(countActiveFilters(filters())).toBe(0);
  });
});

describe('computeFacets', () => {
  it('counts each group with every OTHER group applied', () => {
    const facets = computeFacets(CATALOGUE, filters({ make: ['Porsche'], color: ['Red'] }));
    // make counts ignore the make filter but keep the colour filter
    expect(option(facets.make, 'Porsche')).toMatchObject({ count: 1, selected: true });
    expect(option(facets.make, 'Toyota')).toMatchObject({ count: 1, selected: false });
    expect(option(facets.make, 'Lamborghini')).toMatchObject({ count: 0, disabled: true });
    // colour counts ignore the colour filter but keep the make filter
    expect(option(facets.color, 'Red')).toMatchObject({ count: 1, selected: true });
    expect(option(facets.color, 'Black')).toMatchObject({ count: 1, disabled: false });
    expect(option(facets.color, 'Blue')?.count).toBe(1);
    expect(option(facets.color, 'Green')).toMatchObject({ count: 0, disabled: true });
    expect(facets.resultCount).toBe(1);
    expect(facets.baseCount).toBe(CATALOGUE.length);
  });

  it('narrows MODEL options to the selected makes', () => {
    const all = computeFacets(CATALOGUE, filters());
    expect(all.model).toHaveLength(CATALOGUE.length);
    const porsche = computeFacets(CATALOGUE, filters({ make: ['Porsche'] }));
    expect(porsche.model.map((entry) => entry.value)).toEqual([
      '911 GT3 RS',
      '911 Safari Rally',
      '911 Turbo 3.3 (930)',
      '911 Turbo S',
    ]);
  });

  it('keeps selected values the view does not contain so they can be removed', () => {
    const facets = computeFacets(CATALOGUE, filters({ view: 'racing', make: ['Ferrari'] }));
    expect(option(facets.make, 'Ferrari')).toMatchObject({
      count: 0,
      selected: true,
      disabled: false,
    });
  });

  it('builds options from the view, ordered per group, with labels', () => {
    const facets = computeFacets(CATALOGUE, filters());
    expect(facets.year.map((entry) => entry.value)).toEqual(['2026', '2025', '2024']);
    expect(facets.scale.map((entry) => entry.value)).toEqual(['1:64', '1:43', '1:18']);
    expect(facets.rarity.map((entry) => entry.label)).toEqual([
      'COMMON',
      'RARE',
      'SUPER RARE',
      'LIMITED',
    ]);
    expect(facets.availability.map((entry) => [entry.value, entry.count])).toEqual([
      ['in-stock', 5],
      ['low', 3],
      ['sold-out', 2],
    ]);
    expect(facets.series.map((entry) => [entry.value, entry.label, entry.year])).toEqual([
      ['hw-exotics-2026', 'HW Exotics', 2026],
      ['hw-legends-2026', 'HW Legends', 2026],
      ['hw-turbo-2025', 'HW Turbo', 2025],
      ['hw-off-road-2024', 'HW Off-Road', 2024],
      ['hw-race-day-2024', 'HW Race Day', 2024],
    ]);
    expect(facets.make[0]?.value).toBe('Garage Originals');
  });

  it('lists every rarity even when the view lacks one, and derives price bounds from the view', () => {
    const facets = computeFacets(CATALOGUE, filters({ view: 'racing' }));
    expect(facets.rarity.map((entry) => [entry.value, entry.count])).toEqual([
      ['common', 1],
      ['rare', 1],
      ['super-rare', 0],
      ['limited', 0],
    ]);
    expect(facets.price).toEqual({ min: 199, max: 649 });
    expect(facets.make.map((entry) => entry.value)).toEqual(['Maruti Suzuki', 'Toyota']);
  });

  it('keeps price bounds stable while the price filter is applied', () => {
    const facets = computeFacets(CATALOGUE, filters({ priceMin: 1000 }));
    expect(facets.price).toEqual({ min: 199, max: 2499 });
    expect(facets.resultCount).toBe(4);
    expect(option(facets.make, 'Maruti Suzuki')?.count).toBe(0);
  });

  it('handles an empty catalogue', () => {
    const facets = computeFacets([], filters());
    expect(facets.price).toBeNull();
    expect(facets.make).toEqual([]);
    expect(facets.rarity.every((entry) => entry.count === 0 && entry.disabled)).toBe(true);
  });
});

describe('sortProducts', () => {
  it('sorts newest first by createdAt', () => {
    expect(sortProducts(CATALOGUE, 'newest')[0]?.id).toBe('lamborghini-revuelto');
    expect(sortProducts([...CATALOGUE].reverse(), 'newest').map((p) => p.id)).toEqual(
      ids(CATALOGUE),
    );
  });

  it('sorts by price both ways', () => {
    const asc = sortProducts(CATALOGUE, 'price-asc').map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(sortProducts(CATALOGUE, 'price-desc')[0]?.id).toBe('porsche-911-turbo-3-3');
    // equal prices (₹649) fall back to newest first
    const tied = sortProducts(CATALOGUE, 'price-asc').filter((p) => p.price === 649);
    expect(ids(tied)).toEqual(['porsche-911-safari-rally', 'toyota-gr010-hybrid']);
  });

  it('sorts by rarity tier, then rarity score', () => {
    const sorted = sortProducts(CATALOGUE, 'rarity');
    expect(sorted.slice(0, 2).map((p) => p.rarity)).toEqual(['limited', 'limited']);
    expect(sorted.at(-1)?.rarity).toBe('common');
    const rare = sorted.filter((p) => p.rarity === 'rare').map((p) => p.rarityScore);
    expect(rare).toEqual([...rare].sort((a, b) => b - a));
  });

  it('sorts by collector score, then rating', () => {
    const sorted = sortProducts(CATALOGUE, 'rating');
    expect(sorted.slice(0, 2).map((p) => p.collectorScore)).toEqual([10, 10]);
    const nines = sorted.filter((p) => p.collectorScore === 9).map((p) => p.id);
    expect(nines).toEqual(['toyota-supra-a80', 'lamborghini-revuelto']); // 4.8 before 4.2
  });

  it('keeps the incoming order for relevance and never mutates the input', () => {
    const input = [...CATALOGUE].reverse();
    const snapshot = ids(input);
    expect(ids(sortProducts(input, 'relevance'))).toEqual(snapshot);
    sortProducts(input, 'price-desc');
    expect(ids(input)).toEqual(snapshot);
  });

  it('exposes the shop and search sort menus', () => {
    expect(SORT_OPTIONS.map((entry) => entry.id)).toEqual([
      'newest',
      'price-asc',
      'price-desc',
      'rarity',
      'rating',
    ]);
    expect(SEARCH_SORT_OPTIONS[0]?.id).toBe('relevance');
  });
});

describe('price helpers', () => {
  it('derives bounds from data', () => {
    expect(priceBounds(CATALOGUE)).toEqual({ min: 199, max: 2499 });
    expect(priceBounds([])).toBeNull();
  });

  it('maps between slider ranges and open-ended filters', () => {
    const bounds = { min: 199, max: 2499 };
    expect(priceToRange({ priceMin: null, priceMax: null }, bounds)).toEqual([199, 2499]);
    expect(priceToRange({ priceMin: 50, priceMax: 9999 }, bounds)).toEqual([199, 2499]);
    expect(priceToRange({ priceMin: 499, priceMax: 999 }, bounds)).toEqual([499, 999]);
    expect(rangeToPrice([199, 2499], bounds)).toEqual({ priceMin: null, priceMax: null });
    expect(rangeToPrice([449, 2499], bounds)).toEqual({ priceMin: 449, priceMax: null });
    expect(rangeToPrice([999, 299], bounds)).toEqual({ priceMin: 299, priceMax: 999 });
  });
});
