import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import {
  buildSearchIndex,
  editDistance,
  groupSuggestions,
  matchText,
  normalizeSearchText,
  searchProducts,
  searchProductsScored,
  tokenize,
} from './search';

let sequence = 0;

function makeProduct(
  overrides: Partial<Product> & Pick<Product, 'name' | 'make' | 'model'>,
): Product {
  sequence += 1;
  const slug = overrides.slug ?? normalizeSearchText(overrides.name).replace(/ /g, '-');
  return {
    id: `p${sequence}`,
    slug,
    description: '',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    seriesNumber: 1,
    collectionNumber: sequence,
    year: 2026,
    scale: '1:64',
    color: 'Silver',
    material: 'Die-cast metal',
    vehicleType: 'Supercar',
    category: 'sports',
    rarity: 'common',
    rarityScore: 3,
    collectorScore: 5,
    themedStats: { topSpeedKmh: 300, powerHp: 500 },
    price: 299,
    compareAtPrice: null,
    currency: 'INR',
    stock: 20,
    limitedEdition: null,
    images: [],
    primaryImage: '/placeholders/car-generic.svg',
    ratingAvg: 4,
    ratingCount: 3,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const CATALOGUE: Product[] = [
  makeProduct({ name: 'Porsche 911 GT3 RS', make: 'Porsche', model: '911 GT3 RS', color: 'White' }),
  makeProduct({
    name: 'Porsche 911 Carrera RS 2.7',
    make: 'Porsche',
    model: '911 Carrera RS 2.7',
    color: 'Yellow',
    seriesName: 'HW Legends',
  }),
  makeProduct({ name: 'Porsche 911 Turbo S', make: 'Porsche', model: '911 Turbo S', color: 'Red' }),
  makeProduct({
    name: 'Porsche 911 Safari Rally',
    make: 'Porsche',
    model: '911 Safari Rally',
    category: 'off-road',
    vehicleType: 'Rally car',
    tags: ['rally', 'dirt'],
  }),
  makeProduct({
    name: 'Porsche 963 LMDh',
    make: 'Porsche',
    model: '963 LMDh',
    category: 'racing',
    vehicleType: 'Prototype',
  }),
  makeProduct({
    name: 'Nissan Skyline GT-R R34 V-Spec II',
    make: 'Nissan',
    model: 'Skyline GT-R R34 V-Spec II',
    color: 'Blue',
    rarity: 'rare',
    isFeatured: true,
  }),
  makeProduct({ name: 'Nissan GT-R Nismo', make: 'Nissan', model: 'GT-R Nismo', color: 'Black' }),
  makeProduct({
    name: 'Lamborghini Revuelto',
    make: 'Lamborghini',
    model: 'Revuelto',
    color: 'Green',
    rarity: 'super-rare',
  }),
  makeProduct({
    name: 'Mahindra Thar 4x4',
    make: 'Mahindra',
    model: 'Thar 4x4',
    category: 'off-road',
    vehicleType: 'SUV',
    color: 'Red',
  }),
  makeProduct({
    name: 'Tata Signa Fire Tender',
    make: 'Tata',
    model: 'Signa Fire Tender',
    category: 'rescue',
    vehicleType: 'Fire truck',
    color: 'Red',
  }),
  makeProduct({
    name: 'Citroën DS Goddess',
    make: 'Citroën',
    model: 'DS',
    color: 'Black',
    rarity: 'limited',
    limitedEdition: { editionNumber: 1, editionSize: 500 },
  }),
];

const index = buildSearchIndex(CATALOGUE);
const names = (products: readonly Product[]): string[] => products.map((p) => p.name);

describe('text helpers', () => {
  it('normalises case, accents and punctuation', () => {
    expect(normalizeSearchText('  Citroën  GT-R/34!  ')).toBe('citroen gt r 34');
    expect(tokenize('Porsche 911 (930)')).toEqual(['porsche', '911', '930']);
    expect(tokenize('   ')).toEqual([]);
  });

  it('computes edit distance with transpositions and an early exit', () => {
    expect(editDistance('porsche', 'porsche')).toBe(0);
    expect(editDistance('porshe', 'porsche')).toBe(1);
    expect(editDistance('lamobrghini', 'lamborghini')).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
    expect(editDistance('a', 'abcdef', 2)).toBe(3);
  });

  it('matchText requires every token to match', () => {
    expect(matchText('Off Road', 'off')).toBeGreaterThan(0);
    expect(matchText('Off Road', 'offroad')).toBeGreaterThan(0);
    expect(matchText('Off Road', 'road trip')).toBe(0);
    expect(matchText('Anything', '')).toBe(0);
  });
});

describe('searchProducts', () => {
  it('returns nothing for a blank query', () => {
    expect(searchProducts(index, '')).toEqual([]);
    expect(searchProducts(index, '   ')).toEqual([]);
  });

  it('matches by make prefix and ranks every Porsche', () => {
    const results = searchProducts(index, 'pors');
    expect(results).toHaveLength(5);
    expect(results.every((p) => p.make === 'Porsche')).toBe(true);
  });

  it('uses AND semantics across tokens', () => {
    expect(names(searchProducts(index, 'porsche turbo'))).toEqual(['Porsche 911 Turbo S']);
    expect(searchProducts(index, 'porsche nismo')).toEqual([]);
  });

  it('ranks an exact name above partial matches', () => {
    const [first] = searchProducts(index, 'porsche 911 turbo s');
    expect(first?.name).toBe('Porsche 911 Turbo S');
  });

  it('matches tokens typed without separators', () => {
    expect(names(searchProducts(index, 'gtr'))).toEqual(
      expect.arrayContaining(['Nissan GT-R Nismo', 'Nissan Skyline GT-R R34 V-Spec II']),
    );
    expect(names(searchProducts(index, '911gt3'))).toEqual(['Porsche 911 GT3 RS']);
    expect(names(searchProducts(index, 'offroad'))).toEqual(
      expect.arrayContaining(['Mahindra Thar 4x4', 'Porsche 911 Safari Rally']),
    );
  });

  it('tolerates small typos on longer tokens', () => {
    expect(searchProducts(index, 'porshe')).toHaveLength(5);
    expect(names(searchProducts(index, 'lamborgini'))).toEqual(['Lamborghini Revuelto']);
    expect(names(searchProducts(index, 'revuleto'))).toEqual(['Lamborghini Revuelto']);
  });

  it('only falls back to typo matching when nothing matches strictly', () => {
    const catalogue = [
      ...CATALOGUE,
      makeProduct({ name: 'Ford Mustang Dark Horse', make: 'Ford', model: 'Mustang Dark Horse' }),
      makeProduct({ name: 'Dodge Charger Pursuit', make: 'Dodge', model: 'Charger Pursuit' }),
    ];
    const wide = buildSearchIndex(catalogue);
    expect(searchProducts(wide, 'pors').every((p) => p.make === 'Porsche')).toBe(true);
    expect(groupSuggestions(catalogue, 'pors').map((g) => g.make)).toEqual(['Porsche']);
    expect(searchProducts(wide, 'porshe').every((p) => p.make === 'Porsche')).toBe(true);
    expect(searchProducts(wide, 'porshe')).toHaveLength(5);
  });

  it('does not fuzzy-match very short tokens', () => {
    expect(searchProducts(index, 'zzq')).toEqual([]);
  });

  it('searches colour, category, vehicle type, rarity and accents', () => {
    expect(names(searchProducts(index, 'red fire'))).toEqual(['Tata Signa Fire Tender']);
    expect(names(searchProducts(index, 'rescue'))).toEqual(['Tata Signa Fire Tender']);
    expect(names(searchProducts(index, 'suv'))).toEqual(['Mahindra Thar 4x4']);
    expect(names(searchProducts(index, 'limited edition'))).toEqual(['Citroën DS Goddess']);
    expect(names(searchProducts(index, 'citroen'))).toEqual(['Citroën DS Goddess']);
  });

  it('prefers stronger matches (name/make over tags)', () => {
    const scored = searchProductsScored(index, 'rally');
    expect(scored[0]?.product.name).toBe('Porsche 911 Safari Rally');
    expect(scored.every((entry, i) => i === 0 || entry.score <= (scored[i - 1]?.score ?? 0))).toBe(
      true,
    );
  });

  it('respects the limit', () => {
    expect(searchProducts(index, 'porsche', 2)).toHaveLength(2);
    expect(searchProducts(index, 'porsche', 0)).toHaveLength(0);
  });

  it('breaks ties with featured cars first', () => {
    const [first] = searchProducts(index, 'nissan');
    expect(first?.isFeatured).toBe(true);
  });
});

describe('groupSuggestions', () => {
  it('lists every model when the query matches the make', () => {
    const [porsche, ...rest] = groupSuggestions(CATALOGUE, 'porsche');
    expect(rest).toHaveLength(0);
    expect(porsche?.make).toBe('Porsche');
    expect(porsche?.models.map((m) => m.model)).toEqual([
      '911 Carrera RS 2.7',
      '911 GT3 RS',
      '911 Safari Rally',
      '911 Turbo S',
      '963 LMDh',
    ]);
  });

  it('lists only matching models when the query targets a model', () => {
    const groups = groupSuggestions(CATALOGUE, '911');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.models.map((m) => m.model)).toEqual([
      '911 Carrera RS 2.7',
      '911 GT3 RS',
      '911 Safari Rally',
      '911 Turbo S',
    ]);
    expect(groupSuggestions(CATALOGUE, 'porsche 911 tu')[0]?.models.map((m) => m.model)).toEqual([
      '911 Turbo S',
    ]);
  });

  it('groups models across makes and exposes counts + slugs', () => {
    const groups = groupSuggestions(CATALOGUE, 'gt');
    const makes = groups.map((g) => g.make);
    expect(makes).toEqual(expect.arrayContaining(['Nissan', 'Porsche']));
    const nismo = groups
      .find((g) => g.make === 'Nissan')
      ?.models.find((m) => m.model === 'GT-R Nismo');
    expect(nismo).toEqual({ model: 'GT-R Nismo', count: 1, slugs: ['nissan-gt-r-nismo'] });
  });

  it('counts duplicate make + model products', () => {
    const extra = makeProduct({
      name: 'Porsche 911 Turbo S (Chase)',
      make: 'Porsche',
      model: '911 Turbo S',
      slug: 'porsche-911-turbo-s-chase',
    });
    const turbo = groupSuggestions([...CATALOGUE, extra], 'turbo')[0]?.models[0];
    expect(turbo?.count).toBe(2);
    expect(turbo?.slugs).toHaveLength(2);
  });

  it('honours maxMakes / maxModels and blank queries', () => {
    expect(groupSuggestions(CATALOGUE, '')).toEqual([]);
    expect(groupSuggestions(CATALOGUE, 'porsche', { maxModels: 2 })[0]?.models).toHaveLength(2);
    expect(groupSuggestions(CATALOGUE, 'r', { maxMakes: 1 })).toHaveLength(1);
  });

  it('tolerates a typo in the make', () => {
    expect(groupSuggestions(CATALOGUE, 'mahindar')[0]?.make).toBe('Mahindra');
  });
});
