import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER } from '@/config/site';
import type { GarageCar, UserProfile } from '@/types';
import {
  SAMPLE_GARAGE_STATS,
  collectionValueOf,
  garageDialMax,
  garageTeaserStats,
} from '../garageTeaser';
import { buildHomeJsonLd, buildWebSiteJsonLd } from '../homeJsonLd';
import { HOME_SECTION_ORDER } from '../homeSections';
import { buildRideCards, countByCategory, orderedCategorySlugs } from '../rideCards';
import { pickVaultLineup } from '../vaultLineup';
import { HOME_PRODUCTS, makeCategory, makeProduct } from './homeFixtures';

describe('home sections', () => {
  it('keeps the spec order', () => {
    expect(HOME_SECTION_ORDER).toEqual([
      'hero',
      'collection',
      'new-arrivals',
      'featured',
      'vault',
      'garage',
      'achievements',
      'about',
    ]);
  });
});

describe('ride cards', () => {
  it('orders active Firestore categories by `order` and drops unknown / inactive ones', () => {
    const categories = [
      makeCategory('rescue', 1),
      makeCategory('sports', 2),
      makeCategory('racing', 3, false),
      { ...makeCategory('sports', 9), slug: 'hovercraft' as 'sports' },
    ];
    expect(orderedCategorySlugs(categories)).toEqual(['rescue', 'sports']);
  });

  it('falls back to CATEGORY_DISPLAY order when the query is empty or failed', () => {
    expect(orderedCategorySlugs(undefined)).toEqual([...CATEGORY_ORDER]);
    expect(orderedCategorySlugs([])).toEqual([...CATEGORY_ORDER]);
  });

  it('adds bays, display metadata and live counts', () => {
    const cards = buildRideCards(undefined, HOME_PRODUCTS);
    expect(cards).toHaveLength(6);
    expect(cards[0]).toMatchObject({ slug: 'sports', label: 'SPORTS', bay: 1, count: 1 });
    expect(cards.find((card) => card.slug === 'limited')?.count).toBe(2);
    expect(cards.find((card) => card.slug === 'off-road')?.count).toBe(0);
    expect(cards[0]?.silhouette).toBe('/placeholders/category-sports.svg');
  });

  it('reports unknown counts while the catalogue is unavailable', () => {
    expect(countByCategory(undefined)).toBeNull();
    expect(buildRideCards(undefined, undefined).every((card) => card.count === null)).toBe(true);
  });
});

describe('pickVaultLineup', () => {
  it('leads with the lowest edition number, then the scarcest editions', () => {
    const products = [
      ...HOME_PRODUCTS,
      makeProduct({ id: 'vault-sold', name: 'Sold Out', isVault: true, stock: 0 }),
      makeProduct({ id: 'vault-12', name: 'AMG', isVault: true, stock: 12 }),
    ];
    const lineup = pickVaultLineup(products, 4);
    expect(lineup.lead?.id).toBe('vault-001');
    expect(lineup.rest.map((product) => product.id)).toEqual([
      'vault-003',
      'vault-12',
      'vault-sold',
    ]);
  });

  it('is empty without vault cars', () => {
    expect(pickVaultLineup([makeProduct()])).toEqual({ lead: null, rest: [] });
  });
});

describe('garage teaser', () => {
  const car = (price: number, quantity: number): GarageCar => ({
    product: makeProduct({ id: `p-${price}`, price }),
    entry: {
      productId: `p-${price}`,
      addedAt: null,
      source: 'manual',
      isFavorite: false,
      quantity,
    },
  });

  it('values the garage as price × quantity', () => {
    expect(collectionValueOf([car(499, 2), car(1299, 1)])).toBe(2297);
    expect(collectionValueOf([])).toBe(0);
  });

  it('uses the profile stats for signed-in collectors', () => {
    const profile = {
      level: 4,
      stats: { carsOwned: 12, seriesCompleted: 1 },
    } as unknown as UserProfile;
    expect(garageTeaserStats(profile, [car(500, 3)])).toEqual({
      carsOwned: 12,
      seriesCompleted: 1,
      collectionValue: 1500,
      level: 4,
    });
    expect(garageTeaserStats(profile, null).collectionValue).toBeNull();
  });

  it('ships the brief sample garage and a dial with headroom', () => {
    expect(SAMPLE_GARAGE_STATS).toEqual({
      carsOwned: 42,
      seriesCompleted: 3,
      collectionValue: 18400,
      level: 7,
    });
    expect(garageDialMax(42)).toBeGreaterThan(42);
    expect(garageDialMax(0)).toBe(80);
  });

  it('keeps every speedometer label (a major tick every max / 8) a whole multiple of 5', () => {
    for (const cars of [0, 1, 7, 42, 57, 58, 99, 250, 1000]) {
      const max = garageDialMax(cars);
      expect(max).toBeGreaterThanOrEqual(cars);
      for (let tick = 1; tick <= 8; tick += 1) {
        expect(((max / 8) * tick) % 5, `max ${max} for ${cars} cars`).toBe(0);
      }
    }
    // The sample garage (42 cars) reads 0 · 10 · 20 … 80 — before: 0 · 8 · 15 · 23 … 60.
    expect(garageDialMax(42)).toBe(80);
    expect(garageDialMax(Number.NaN)).toBe(80);
  });
});

describe('home JSON-LD', () => {
  it('describes the WebSite with an unencoded search template', () => {
    const site = buildWebSiteJsonLd();
    expect(site['@type']).toBe('WebSite');
    const action = site.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toMatch(/\/search\?q=\{search_term_string\}$/);
    expect(buildHomeJsonLd().map((entry) => entry['@type'])).toEqual(['WebSite', 'Organization']);
  });
});
