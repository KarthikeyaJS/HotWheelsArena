import { describe, expect, it } from 'vitest';
import { makeProduct, makeVaultProduct } from '@/components/content/__tests__/fixtures';
import {
  filterVaultProducts,
  isVaultSoldOut,
  parseVaultFilter,
  parseVaultSort,
  sortVaultProducts,
  vaultCounts,
  vaultRemaining,
  vaultSummary,
} from '../vaultFilters';

const countach = makeVaultProduct('countach', 'Countach', 37, 1, 500);
const gt40 = makeVaultProduct('gt40', 'GT40', 3, 3, 50);
const turbo = makeVaultProduct('turbo', 'Turbo 930', 5, 7, 100);
const goneRun = makeVaultProduct('gone', 'Sold Out Special', 0, 9, 250);
const sameLeftSmallRun = makeVaultProduct('small-run', 'Alpha Small Run', 5, 2, 60);
const exclusive = makeProduct({
  id: 'exclusive',
  name: 'Vault Exclusive',
  isVault: true,
  stock: 12,
});

const names = (list: readonly { name: string }[]) => list.map((product) => product.name);

describe('vault remaining counts', () => {
  it('uses the edition remaining (clamped to the run) or plain stock', () => {
    expect(vaultRemaining(countach)).toBe(37);
    expect(vaultRemaining(makeVaultProduct('over', 'Over', 900, 1, 500))).toBe(500);
    expect(vaultRemaining(exclusive)).toBe(12);
    expect(vaultRemaining(makeProduct({ id: 'neg', stock: -4 }))).toBe(0);
  });

  it('treats zero remaining as sold out', () => {
    expect(isVaultSoldOut(goneRun)).toBe(true);
    expect(isVaultSoldOut(gt40)).toBe(false);
  });
});

describe('filterVaultProducts', () => {
  const all = [countach, goneRun, gt40, exclusive];

  it('keeps everything for "all"', () => {
    expect(filterVaultProducts(all, 'all')).toHaveLength(4);
  });

  it('splits available and sold-out editions', () => {
    expect(names(filterVaultProducts(all, 'available'))).toEqual([
      'Countach',
      'GT40',
      'Vault Exclusive',
    ]);
    expect(names(filterVaultProducts(all, 'sold-out'))).toEqual(['Sold Out Special']);
  });

  it('counts each bucket', () => {
    expect(vaultCounts(all)).toEqual({ all: 4, available: 3, 'sold-out': 1 });
  });
});

describe('sortVaultProducts', () => {
  const all = [countach, goneRun, turbo, gt40, sameLeftSmallRun];

  it('orders by fewest remaining, sold-out editions last', () => {
    expect(names(sortVaultProducts(all, 'remaining-asc'))).toEqual([
      'GT40',
      'Alpha Small Run',
      'Turbo 930',
      'Countach',
      'Sold Out Special',
    ]);
  });

  it('orders by most remaining, sold-out editions still last', () => {
    expect(names(sortVaultProducts(all, 'remaining-desc'))).toEqual([
      'Countach',
      'Alpha Small Run',
      'Turbo 930',
      'GT40',
      'Sold Out Special',
    ]);
  });

  it('breaks ties with the smaller (rarer) run', () => {
    const [first, second] = sortVaultProducts([turbo, sameLeftSmallRun], 'remaining-asc');
    expect(first?.id).toBe('small-run');
    expect(second?.id).toBe('turbo');
  });

  it('does not mutate the input', () => {
    const input = [countach, gt40];
    sortVaultProducts(input, 'remaining-asc');
    expect(input.map((product) => product.id)).toEqual(['countach', 'gt40']);
  });
});

describe('URL parsing', () => {
  it('accepts known values and falls back to defaults', () => {
    expect(parseVaultFilter('sold-out')).toBe('sold-out');
    expect(parseVaultFilter('nope')).toBe('all');
    expect(parseVaultFilter(null)).toBe('all');
    expect(parseVaultSort('remaining-desc')).toBe('remaining-desc');
    expect(parseVaultSort('price')).toBe('remaining-asc');
  });
});

describe('vaultSummary', () => {
  it('sums remaining, runs and the claimed share of numbered runs', () => {
    const summary = vaultSummary([countach, gt40, exclusive]);
    expect(summary.editions).toBe(3);
    expect(summary.remaining).toBe(37 + 3 + 12);
    expect(summary.totalRun).toBe(550);
    expect(summary.rarestRun).toBe(50);
    expect(summary.claimedPct).toBeCloseTo(((550 - 40) / 550) * 100, 5);
  });

  it('handles an empty vault', () => {
    expect(vaultSummary([])).toEqual({
      editions: 0,
      remaining: 0,
      totalRun: 0,
      claimedPct: 0,
      rarestRun: null,
    });
  });
});
