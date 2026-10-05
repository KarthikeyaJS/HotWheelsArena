import { describe, expect, it } from 'vitest';
import { LEVEL_THRESHOLDS, MAX_LEVEL } from '@/config/gamification';
import {
  buildXpRules,
  carValue,
  categoryBreakdown,
  collectionValue,
  computeDashboardStats,
  countCarsOwned,
  duplicateLabel,
  filterCars,
  findDuplicates,
  joinGarage,
  mostValuable,
  parseGarageTab,
  rarityBreakdown,
  recentlyAdded,
  seriesProgressList,
  sortCars,
  upcomingLevels,
} from '../garageModel';
import {
  CATALOGUE,
  DAY,
  NOW,
  SERIES_LIST,
  carView,
  catalogueMap,
  makeEntry,
  makeProduct,
} from './fixtures';

const garage = [
  carView({ productId: 'revuelto', quantity: 2, addedAt: NOW - 3 * DAY, isFavorite: true }),
  carView({ productId: 'mclaren-750s', quantity: 1, addedAt: NOW - DAY }),
  carView({ productId: 'swift-rally', quantity: 3, addedAt: NOW - 10 * DAY, source: 'purchase' }),
];

describe('joinGarage', () => {
  it('joins entries with products and flags retired / deleted cars', () => {
    const products = catalogueMap();
    products.set('old-casting', makeProduct({ id: 'old-casting', isActive: false }));
    const cars = joinGarage(
      [
        makeEntry({ productId: 'revuelto' }),
        makeEntry({ productId: 'old-casting' }),
        makeEntry({ productId: 'vanished' }),
      ],
      products,
    );
    expect(cars.map((car) => [car.entry.productId, car.retired, car.product?.id ?? null])).toEqual([
      ['revuelto', false, 'revuelto'],
      ['old-casting', true, 'old-casting'],
      ['vanished', true, null],
    ]);
  });
});

describe('value and counts', () => {
  it('sums current price × quantity', () => {
    expect(carValue(garage[0]!)).toBe(2598);
    expect(collectionValue(garage)).toBe(1299 * 2 + 549 + 199 * 3);
  });

  it('counts deleted products as owned but worth nothing', () => {
    const cars = [...garage, carView({ productId: 'vanished', quantity: 2 })];
    expect(collectionValue(cars)).toBe(collectionValue(garage));
    expect(countCarsOwned(cars)).toBe(8);
  });

  it('treats invalid quantities as a single copy', () => {
    expect(countCarsOwned([carView({ productId: 'revuelto', quantity: 0 })])).toBe(1);
    expect(countCarsOwned([carView({ productId: 'revuelto', quantity: Number.NaN })])).toBe(1);
  });
});

describe('duplicates tracker', () => {
  it('lists cars with spares, most spares first', () => {
    const rows = findDuplicates(garage);
    expect(
      rows.map((row) => [row.car.entry.productId, row.copies, row.spares, row.spareValue]),
    ).toEqual([
      ['swift-rally', 3, 2, 398],
      ['revuelto', 2, 1, 1299],
    ]);
  });

  it('formats the spare label', () => {
    expect(duplicateLabel(2)).toBe('×2 — 1 spare');
    expect(duplicateLabel(4)).toBe('×4 — 3 spares');
  });
});

describe('missing models per series', () => {
  const owned = new Set(garage.map((car) => car.entry.productId));

  it('reports progress and the missing catalogue cars for started series', () => {
    const rows = seriesProgressList(SERIES_LIST, owned, catalogueMap(), { startedOnly: true });
    expect(rows.map((row) => row.series.id)).toEqual(['hw-exotics-2026', 'hw-race-day-2024']);
    const exotics = rows[0]!;
    expect([exotics.owned, exotics.total, exotics.complete]).toEqual([2, 3, false]);
    expect(exotics.pct).toBeCloseTo(66.67, 1);
    expect(exotics.missing.map((product) => product.id)).toEqual(['gt3-rs']);
    expect(rows[1]!.missing.map((product) => product.id)).toEqual(['corvette-c8r']);
  });

  it('includes untouched series last when not filtered and counts unavailable cars', () => {
    const rows = seriesProgressList(SERIES_LIST, owned, catalogueMap());
    const rescue = rows[rows.length - 1]!;
    expect(rescue.series.id).toBe('hw-rescue-2025');
    expect(rescue.missing).toEqual([]);
    expect(rescue.unavailable).toBe(1);
  });

  it('sorts complete series after the ones in progress and skips retired cars', () => {
    const products = catalogueMap();
    products.set('gt3-rs', { ...CATALOGUE[2], isActive: false });
    const full = new Set([...owned, 'corvette-c8r']);
    const rows = seriesProgressList(SERIES_LIST, full, products, { startedOnly: true });
    expect(rows.map((row) => [row.series.id, row.complete])).toEqual([
      ['hw-exotics-2026', false],
      ['hw-race-day-2024', true],
    ]);
    expect(rows[0]!.missing).toEqual([]);
    expect(rows[0]!.unavailable).toBe(1);
  });
});

describe('recently added', () => {
  it('returns the newest five, undated entries last', () => {
    const cars = [
      ...garage,
      carView({ productId: 'gt3-rs', addedAt: null }),
      carView({ productId: 'corvette-c8r', addedAt: NOW }),
    ];
    expect(recentlyAdded(cars).map((car) => car.entry.productId)).toEqual([
      'corvette-c8r',
      'mclaren-750s',
      'revuelto',
      'swift-rally',
      'gt3-rs',
    ]);
    expect(recentlyAdded(cars, 2)).toHaveLength(2);
  });

  it('finds the most valuable entry', () => {
    expect(mostValuable(garage)?.entry.productId).toBe('revuelto');
    expect(mostValuable([])).toBeNull();
  });
});

describe('filter and sort', () => {
  it('filters favorites and duplicates', () => {
    expect(filterCars(garage, 'favorites').map((car) => car.entry.productId)).toEqual(['revuelto']);
    expect(filterCars(garage, 'duplicates').map((car) => car.entry.productId)).toEqual([
      'revuelto',
      'swift-rally',
    ]);
    expect(filterCars(garage, 'all')).toHaveLength(3);
  });

  it('sorts by recent, name, value and rarity', () => {
    const ids = (sort: Parameters<typeof sortCars>[1]) =>
      sortCars(garage, sort).map((car) => car.entry.productId);
    expect(ids('recent')).toEqual(['mclaren-750s', 'revuelto', 'swift-rally']);
    expect(ids('name')).toEqual(['revuelto', 'swift-rally', 'mclaren-750s']);
    expect(ids('value')).toEqual(['revuelto', 'swift-rally', 'mclaren-750s']);
    expect(ids('rarity')).toEqual(['revuelto', 'mclaren-750s', 'swift-rally']);
  });
});

describe('breakdowns', () => {
  it('counts copies per category in storefront order', () => {
    const rows = categoryBreakdown(garage);
    expect(rows.map((row) => row.key)).toEqual([
      'sports',
      'off-road',
      'racing',
      'special',
      'rescue',
      'limited',
    ]);
    const sports = rows.find((row) => row.key === 'sports')!;
    const racing = rows.find((row) => row.key === 'racing')!;
    expect([sports.count, racing.count]).toEqual([3, 3]);
    expect(sports.share).toBe(50);
    expect(sports.ratio).toBe(100);
    expect(rows.find((row) => row.key === 'rescue')!.ratio).toBe(0);
  });

  it('counts copies per rarity, common → limited', () => {
    const rows = rarityBreakdown(garage);
    expect(rows.map((row) => [row.label, row.count])).toEqual([
      ['COMMON', 3],
      ['RARE', 1],
      ['SUPER RARE', 2],
      ['LIMITED', 0],
    ]);
  });

  it('handles an empty garage', () => {
    expect(rarityBreakdown([]).every((row) => row.share === 0 && row.ratio === 0)).toBe(true);
  });
});

describe('dashboard stats', () => {
  it('derives every header / strip number', () => {
    const stats = computeDashboardStats(
      [...garage, carView({ productId: 'gt3-rs' }, true)],
      SERIES_LIST,
      4,
    );
    expect(stats).toEqual({
      carsOwned: 7,
      uniqueCars: 4,
      seriesCompleted: 1,
      seriesTotal: 3,
      favorites: 1,
      wishlist: 4,
      value: 1299 * 2 + 549 + 199 * 3 + 499,
      spares: 3,
      retired: 1,
    });
  });
});

describe('tabs', () => {
  it('parses ?tab= with a collection fallback', () => {
    expect(parseGarageTab('achievements')).toBe('achievements');
    expect(parseGarageTab('wishlist')).toBe('wishlist');
    expect(parseGarageTab('nope')).toBe('collection');
    expect(parseGarageTab(null)).toBe('collection');
  });
});

describe('level ladder and XP rules', () => {
  it('lists the next three levels with thresholds and XP remaining', () => {
    expect(upcomingLevels(1240)).toEqual([
      { level: 8, title: 'STREET RACER', threshold: 1400, remaining: 160 },
      { level: 9, title: 'STREET RACER', threshold: 1760, remaining: 520 },
      { level: 10, title: 'PRO DRIVER', threshold: 2160, remaining: 920 },
    ]);
  });

  it('stops at the max level', () => {
    const top = LEVEL_THRESHOLDS[MAX_LEVEL - 1]!;
    expect(upcomingLevels(top)).toEqual([]);
    expect(upcomingLevels(LEVEL_THRESHOLDS[MAX_LEVEL - 2]!)).toHaveLength(1);
  });

  it('builds the XP rules from the shared constants', () => {
    const rules = buildXpRules();
    expect(rules[0]).toMatchObject({ id: 'order', xp: 100, per: 'order' });
    expect(rules[1]).toMatchObject({ id: 'car', xp: 25, per: 'car' });
    expect(rules.filter((rule) => rule.id.startsWith('rarity-')).map((rule) => rule.xp)).toEqual([
      25, 50, 100,
    ]);
    expect(rules.filter((rule) => rule.per === 'badge')).toHaveLength(5);
  });
});
