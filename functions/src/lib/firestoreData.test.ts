import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_SETTINGS, MAX_GARAGE_QUANTITY } from '../../../shared/index.js';
import {
  FALLBACK_PRODUCT_IMAGE,
  clampGarageQuantity,
  readBadges,
  readGarageRecord,
  readProductRecord,
  readProfileState,
  readRatingAggregate,
  readReviewRating,
  readSeriesRecord,
  readSiteSettings,
} from './firestoreData.js';

describe('readProductRecord', () => {
  it('returns null for a missing document', () => {
    expect(readProductRecord('p1', undefined)).toBeNull();
  });

  it('reads the fields pricing and stats depend on', () => {
    const record = readProductRecord('p1', {
      slug: 'twin-mill',
      name: 'Twin Mill',
      price: 349,
      stock: 12.7,
      isActive: true,
      rarity: 'super-rare',
      category: 'racing',
      primaryImage: '/placeholders/twin-mill.svg',
    });
    expect(record).toEqual({
      id: 'p1',
      slug: 'twin-mill',
      name: 'Twin Mill',
      price: 349,
      stock: 12,
      isActive: true,
      rarity: 'super-rare',
      category: 'racing',
      image: '/placeholders/twin-mill.svg',
    });
  });

  it('flags a missing / negative / non-numeric price as null (never priced at 0)', () => {
    expect(readProductRecord('p', { name: 'A' })?.price).toBeNull();
    expect(readProductRecord('p', { name: 'A', price: -5 })?.price).toBeNull();
    expect(readProductRecord('p', { name: 'A', price: '299' })?.price).toBeNull();
  });

  it('defaults like the web converter: active unless flagged, common rarity, fallback image', () => {
    const record = readProductRecord('p9', {
      price: 199,
      images: [{ url: '/placeholders/x.svg' }],
    });
    expect(record?.isActive).toBe(true);
    expect(record?.rarity).toBe('common');
    expect(record?.slug).toBe('p9');
    expect(record?.name).toBe('This car');
    expect(record?.image).toBe('/placeholders/x.svg');
    expect(readProductRecord('p0', { price: 1 })?.image).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(readProductRecord('p0', { price: 1, isActive: false })?.isActive).toBe(false);
    expect(readProductRecord('p0', { price: 1, stock: -3 })?.stock).toBe(0);
  });
});

describe('readSiteSettings', () => {
  it('falls back to DEFAULT_SITE_SETTINGS when the document is missing', () => {
    expect(readSiteSettings(undefined)).toEqual({
      shippingThreshold: DEFAULT_SITE_SETTINGS.shippingThreshold,
      shippingFee: DEFAULT_SITE_SETTINGS.shippingFee,
      taxRate: DEFAULT_SITE_SETTINGS.taxRate,
      taxInclusive: DEFAULT_SITE_SETTINGS.taxInclusive,
      codEnabled: DEFAULT_SITE_SETTINGS.codEnabled,
      maxQtyPerItem: DEFAULT_SITE_SETTINGS.maxQtyPerItem,
    });
  });

  it('uses stored values and sanitises bad ones exactly like the client', () => {
    expect(
      readSiteSettings({
        shippingThreshold: 1499,
        shippingFee: -10,
        taxRate: 'x',
        taxInclusive: false,
        codEnabled: false,
        maxQtyPerItem: 0.5,
      }),
    ).toEqual({
      shippingThreshold: 1499,
      shippingFee: 0,
      taxRate: DEFAULT_SITE_SETTINGS.taxRate,
      taxInclusive: false,
      codEnabled: false,
      maxQtyPerItem: 1,
    });
  });
});

describe('readProfileState', () => {
  it('describes a missing profile with defaults', () => {
    expect(readProfileState(undefined)).toEqual({
      exists: false,
      xp: 0,
      level: 1,
      badges: [],
      stats: {
        carsOwned: 0,
        uniqueCars: 0,
        seriesCompleted: 0,
        ordersPlaced: 0,
        racingCars: 0,
        rareCars: 0,
        totalSpent: 0,
      },
    });
  });

  it('cleans badges, xp and stats', () => {
    const state = readProfileState({
      xp: 250.9,
      badges: ['first-ride', 'bogus', 'first-ride', 7],
      stats: { carsOwned: 4, totalSpent: 1200.5 },
    });
    expect(state.exists).toBe(true);
    expect(state.xp).toBe(250);
    expect(state.level).toBe(3); // derived from XP when the stored level is missing
    expect(state.badges).toEqual(['first-ride']);
    expect(state.stats.carsOwned).toBe(4);
    expect(state.stats.totalSpent).toBe(1200.5);
    expect(state.stats.racingCars).toBe(0);
  });
});

describe('garage + series + reviews readers', () => {
  it('clamps garage quantities to 1..MAX_GARAGE_QUANTITY', () => {
    expect(clampGarageQuantity(0)).toBe(1);
    expect(clampGarageQuantity(2.9)).toBe(2);
    expect(clampGarageQuantity(1000)).toBe(MAX_GARAGE_QUANTITY);
    expect(clampGarageQuantity(Number.NaN)).toBe(1);
  });

  it('reads garage records with safe defaults', () => {
    expect(readGarageRecord('p1', undefined)).toEqual({
      productId: 'p1',
      quantity: 1,
      isFavorite: false,
      source: 'manual',
    });
    expect(readGarageRecord('p2', { quantity: 3, isFavorite: true, source: 'purchase' })).toEqual({
      productId: 'p2',
      quantity: 3,
      isFavorite: true,
      source: 'purchase',
    });
  });

  it('reads series car ids', () => {
    expect(readSeriesRecord('s1', { carIds: ['a', 2, 'b'] })).toEqual({
      id: 's1',
      carIds: ['a', 'b'],
    });
    expect(readSeriesRecord('s2', undefined)).toEqual({ id: 's2', carIds: [] });
  });

  it('reads rating aggregates and review ratings defensively', () => {
    expect(readRatingAggregate({ ratingAvg: 7, ratingCount: -2 })).toEqual({
      ratingAvg: 5,
      ratingCount: 0,
    });
    expect(readRatingAggregate(undefined)).toEqual({ ratingAvg: 0, ratingCount: 0 });
    expect(readReviewRating({ rating: 4 })).toBe(4);
    expect(readReviewRating({ rating: 9 })).toBe(5);
    expect(readReviewRating({})).toBeNull();
  });

  it('de-duplicates and filters badge ids', () => {
    expect(readBadges(['master-collector', 'x', 'master-collector'])).toEqual(['master-collector']);
    expect(readBadges('first-ride')).toEqual([]);
  });
});
