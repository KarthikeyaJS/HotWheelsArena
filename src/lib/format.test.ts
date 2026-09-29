import { describe, expect, it } from 'vitest';
import {
  firstName,
  formatCollectionNumber,
  formatCompact,
  formatDate,
  formatEdition,
  formatINR,
  formatINRPrecise,
  formatLevel,
  formatNumber,
  formatPercent,
  formatRelative,
  formatSeriesLabel,
  formatXp,
  padNumber,
  pluralize,
} from './format';

describe('formatINR', () => {
  it('formats whole rupees with Indian grouping', () => {
    expect(formatINR(1299)).toBe('₹1,299');
    expect(formatINR(125000)).toBe('₹1,25,000');
    expect(formatINR(0)).toBe('₹0');
  });

  it('rounds to whole rupees and guards NaN', () => {
    expect(formatINR(199.6)).toBe('₹200');
    expect(formatINR(Number.NaN)).toBe('₹0');
  });

  it('keeps paise when precise', () => {
    expect(formatINRPrecise(212.5)).toBe('₹212.50');
  });
});

describe('number formatting', () => {
  it('groups numbers the Indian way', () => {
    expect(formatNumber(1240)).toBe('1,240');
    expect(formatNumber(1234567)).toBe('12,34,567');
  });

  it('compacts large numbers', () => {
    expect(formatCompact(1200)).toBe('1.2K');
    expect(formatCompact(150000)).toBe('1.5L');
  });

  it('formats percentages', () => {
    expect(formatPercent(42.4)).toBe('42%');
    expect(formatPercent(42.44, 1)).toBe('42.4%');
  });
});

describe('collector labels', () => {
  it('pads numbers', () => {
    expect(padNumber(7, 3)).toBe('007');
    expect(padNumber(142, 3)).toBe('142');
    expect(padNumber(-4)).toBe('00');
  });

  it('formats collection, edition and series labels', () => {
    expect(formatCollectionNumber(142)).toBe('#142');
    expect(formatCollectionNumber(7)).toBe('#007');
    expect(formatEdition(1, 500)).toBe('#001/500');
    expect(formatEdition(37, 1000)).toBe('#037/1000');
    expect(formatSeriesLabel(3)).toBe('SERIES 03');
    expect(formatLevel(7)).toBe('LEVEL 07');
    expect(formatXp(1240)).toBe('1,240 XP');
  });
});

describe('dates', () => {
  it('returns an em dash for missing values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatRelative(undefined)).toBe('—');
  });

  it('formats an absolute date', () => {
    const millis = Date.UTC(2026, 8, 28, 12, 0, 0);
    expect(formatDate(millis)).toMatch(/2026/);
    expect(formatDate(millis)).toMatch(/28/);
  });

  it('formats relative times', () => {
    const now = Date.UTC(2026, 8, 28, 12, 0, 0);
    expect(formatRelative(now - 10_000, now)).toBe('just now');
    expect(formatRelative(now - 3 * 24 * 60 * 60 * 1000, now)).toBe('3 days ago');
    expect(formatRelative(now - 5 * 60 * 1000, now)).toBe('5 minutes ago');
    expect(formatRelative(now - 24 * 60 * 60 * 1000, now)).toBe('yesterday');
  });
});

describe('text helpers', () => {
  it('extracts a first name', () => {
    expect(firstName('Arjun Mehta')).toBe('Arjun');
    expect(firstName('  Priya ')).toBe('Priya');
    expect(firstName(null)).toBe('Collector');
    expect(firstName('', 'Racer')).toBe('Racer');
  });

  it('pluralises', () => {
    expect(pluralize(1, 'car')).toBe('1 car');
    expect(pluralize(3, 'car')).toBe('3 cars');
    expect(pluralize(2, 'series', 'series')).toBe('2 series');
  });
});
