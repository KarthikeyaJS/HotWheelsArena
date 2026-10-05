/**
 * Series ⇄ catalogue ⇄ garage helpers (pure). Completion uses the shared `seriesCompletion`
 * rule (all of a series' `carIds` owned), the same one Cloud Functions use for badges.
 */
import { seriesCompletion } from '@/config/gamification';
import type { Product, Series, SeriesCompletion } from '@/types';

/** Newest year first, then name A–Z. */
export function sortSeriesByYearDesc(list: readonly Series[]): Series[] {
  return [...list].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
}

/**
 * Cars of a series in `carIds` order (series position), followed by any other active product
 * that points at the series but is not listed yet. Unknown/retired ids are skipped.
 */
export function seriesCars(
  series: Pick<Series, 'id' | 'carIds'>,
  products: readonly Product[],
): Product[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  const listed = new Set<string>();
  const ordered: Product[] = [];
  for (const id of series.carIds) {
    const product = byId.get(id);
    if (product && !listed.has(id)) {
      listed.add(id);
      ordered.push(product);
    }
  }
  const extras = products
    .filter((product) => product.series === series.id && !listed.has(product.id))
    .sort((a, b) => a.seriesNumber - b.seriesNumber || a.name.localeCompare(b.name));
  return [...ordered, ...extras];
}

/** Cover car: the first car of the series (by `carIds` order) that is in the catalogue. */
export function seriesCover(
  series: Pick<Series, 'id' | 'carIds'>,
  products: readonly Product[],
): Product | null {
  return seriesCars(series, products)[0] ?? null;
}

/** Number of cars to show for a series (`totalCars`, else the listed ids). */
export function seriesTotalCars(series: Pick<Series, 'totalCars' | 'carIds'>): number {
  return series.totalCars > 0 ? series.totalCars : new Set(series.carIds).size;
}

/** Completion for a collector, or null when signed out / garage unknown. */
export function seriesProgress(
  series: Pick<Series, 'id' | 'carIds'>,
  ownedIds: ReadonlySet<string> | null,
): SeriesCompletion | null {
  if (!ownedIds) return null;
  return seriesCompletion({ id: series.id, carIds: series.carIds }, ownedIds);
}

/** The series cars the collector does not own yet (series order). */
export function missingSeriesCars(
  series: Pick<Series, 'id' | 'carIds'>,
  products: readonly Product[],
  ownedIds: ReadonlySet<string>,
): Product[] {
  const missing = new Set(
    seriesCompletion({ id: series.id, carIds: series.carIds }, ownedIds).missing,
  );
  return seriesCars(series, products).filter((product) => missing.has(product.id));
}

export interface SeriesCardData {
  series: Series;
  cover: Product | null;
  totalCars: number;
  progress: SeriesCompletion | null;
}

/** Collections grid model: series sorted by year (desc) with cover car + optional progress. */
export function buildSeriesCards(
  seriesList: readonly Series[],
  products: readonly Product[],
  ownedIds: ReadonlySet<string> | null,
): SeriesCardData[] {
  return sortSeriesByYearDesc(seriesList).map((series) => ({
    series,
    cover: seriesCover(series, products),
    totalCars: seriesTotalCars(series),
    progress: seriesProgress(series, ownedIds),
  }));
}

/** How many of the given series the collector has completed. */
export function completedSeriesCount(cards: readonly SeriesCardData[]): number {
  return cards.filter((card) => card.progress?.complete).length;
}

/** `2024–2026` (or a single year), or null for an empty list. */
export function seriesYearSpan(seriesList: readonly Pick<Series, 'year'>[]): string | null {
  if (seriesList.length === 0) return null;
  const years = seriesList.map((series) => series.year);
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}–${max}`;
}
