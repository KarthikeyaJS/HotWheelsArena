import { describe, expect, it } from 'vitest';
import {
  RESCUE_CARS,
  RESCUE_SERIES,
  makeProduct,
  makeSeries,
} from '@/components/content/__tests__/fixtures';
import {
  buildSeriesCards,
  completedSeriesCount,
  missingSeriesCars,
  seriesCars,
  seriesCover,
  seriesProgress,
  seriesTotalCars,
  seriesYearSpan,
  sortSeriesByYearDesc,
} from '../seriesProgress';

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

describe('sortSeriesByYearDesc', () => {
  it('puts the newest year first, then names A–Z', () => {
    const sorted = sortSeriesByYearDesc([
      makeSeries({ id: 'b-2024', name: 'B', year: 2024 }),
      makeSeries({ id: 'z-2026', name: 'Z', year: 2026 }),
      makeSeries({ id: 'a-2026', name: 'A', year: 2026 }),
      makeSeries({ id: 'c-2025', name: 'C', year: 2025 }),
    ]);
    expect(ids(sorted)).toEqual(['a-2026', 'z-2026', 'c-2025', 'b-2024']);
  });
});

describe('seriesCars / seriesCover', () => {
  it('follows carIds order, skips unknown ids and appends unlisted series cars', () => {
    const extra = makeProduct({ id: 'late-addition', name: 'Late', seriesNumber: 9 });
    const other = makeProduct({ id: 'other', series: 'hw-turbo-2025' });
    const series = makeSeries({
      id: 'hw-rescue-2025',
      carIds: ['tata-signa-fire-tender', 'retired-car', 'force-traveller-ambulance'],
    });
    const cars = seriesCars(series, [...RESCUE_CARS, extra, other]);
    expect(ids(cars).slice(0, 2)).toEqual(['tata-signa-fire-tender', 'force-traveller-ambulance']);
    expect(ids(cars)).toContain('late-addition');
    expect(ids(cars)).not.toContain('other');
    expect(ids(cars)).not.toContain('retired-car');
  });

  it('uses the first catalogue car as the cover (null when none)', () => {
    expect(seriesCover(RESCUE_SERIES, RESCUE_CARS)?.id).toBe('force-traveller-ambulance');
    expect(seriesCover(makeSeries({ id: 'empty', carIds: ['ghost'] }), RESCUE_CARS)).toBeNull();
  });

  it('prefers totalCars and falls back to the unique carIds', () => {
    expect(seriesTotalCars(makeSeries({ id: 's', totalCars: 7, carIds: ['a'] }))).toBe(7);
    expect(seriesTotalCars(makeSeries({ id: 's', totalCars: 0, carIds: ['a', 'b', 'a'] }))).toBe(2);
  });
});

describe('seriesProgress / missingSeriesCars', () => {
  it('is null while signed out', () => {
    expect(seriesProgress(RESCUE_SERIES, null)).toBeNull();
  });

  it('counts owned cars and lists the missing ones in series order', () => {
    const owned = new Set(['tata-signa-fire-tender', 'dodge-charger-pursuit', 'not-in-series']);
    const progress = seriesProgress(RESCUE_SERIES, owned);
    expect(progress).toMatchObject({ owned: 2, total: 5, complete: false });
    expect(progress?.pct).toBeCloseTo(40);
    expect(ids(missingSeriesCars(RESCUE_SERIES, RESCUE_CARS, owned))).toEqual([
      'force-traveller-ambulance',
      'mahindra-scorpio-n-highway-patrol',
      'ashok-leyland-crash-tender',
    ]);
  });

  it('marks a fully parked series complete with nothing missing', () => {
    const owned = new Set(RESCUE_SERIES.carIds);
    expect(seriesProgress(RESCUE_SERIES, owned)).toMatchObject({ owned: 5, complete: true });
    expect(missingSeriesCars(RESCUE_SERIES, RESCUE_CARS, owned)).toEqual([]);
  });
});

describe('buildSeriesCards', () => {
  const exotics = makeSeries({
    id: 'hw-exotics-2026',
    year: 2026,
    carIds: ['revuelto'],
    totalCars: 1,
  });
  const revuelto = makeProduct({ id: 'revuelto', series: 'hw-exotics-2026' });

  it('sorts by year, picks covers and attaches progress for signed-in collectors', () => {
    const owned = new Set(['revuelto']);
    const cards = buildSeriesCards([RESCUE_SERIES, exotics], [...RESCUE_CARS, revuelto], owned);
    expect(cards.map((card) => card.series.id)).toEqual(['hw-exotics-2026', 'hw-rescue-2025']);
    expect(cards[0]?.cover?.id).toBe('revuelto');
    expect(cards[0]?.progress?.complete).toBe(true);
    expect(cards[1]?.progress).toMatchObject({ owned: 0, total: 5 });
    expect(completedSeriesCount(cards)).toBe(1);
  });

  it('omits progress when signed out', () => {
    const cards = buildSeriesCards([RESCUE_SERIES], RESCUE_CARS, null);
    expect(cards[0]?.progress).toBeNull();
    expect(cards[0]?.totalCars).toBe(5);
  });
});

describe('seriesYearSpan', () => {
  it('formats a span, a single year or nothing', () => {
    expect(seriesYearSpan([{ year: 2024 }, { year: 2026 }, { year: 2025 }])).toBe('2024–2026');
    expect(seriesYearSpan([{ year: 2025 }])).toBe('2025');
    expect(seriesYearSpan([])).toBeNull();
  });
});
