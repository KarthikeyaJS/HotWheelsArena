import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DataState } from '@/components/common/DataState';
import { ProductCardSkeleton, ProductGrid } from '@/components/product';
import type { SortOption } from '@/config/shop';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { ActiveFilter, ProductFiltersController } from '@/hooks/useProductFilters';
import { useSeries } from '@/hooks/useSeries';
import type { Product } from '@/types';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterDrawer } from './FilterDrawer';
import { FilterRail, type SeriesLabel } from './FilterRail';
import { FilterRailSkeleton } from './FilterRailSkeleton';
import { applyFilters, computeFacets, sortProducts } from './filtering';
import { LoadMore } from './LoadMore';
import { ResultsToolbar } from './ResultsToolbar';

/** Grid classes shared by the results and their skeleton (rail on the left from `lg`). */
const GRID_CLASSES = 'lg:grid-cols-2 xl:grid-cols-3';

export interface ProductBrowserProps {
  /** Unique prefix for ids (`shop`, `search`). */
  idPrefix: string;
  /** Base catalogue (already narrowed/ranked by a text query); `undefined` while loading. */
  products: readonly Product[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  controller: ProductFiltersController;
  sortOptions: readonly SortOption[];
  pageSize: number;
  /** Accessible name of the results list. */
  gridLabel: string;
  /**
   * Empty state; `filtered` = rail filters are narrowing the base. Use `clearAll` for its
   * clear action: it runs `onClearAll` and hands keyboard focus to the results heading.
   */
  renderEmpty: (context: EmptyContext) => ReactNode;
  /** Clears every chip (pages decide whether the text query goes too). */
  onClearAll: () => void;
  /** Chips rendered before the filter chips (e.g. the shop's `q`). */
  leadingChips?: ReactNode;
  /** Eager images for the first row. */
  priorityCount?: number;
}

export interface EmptyContext {
  filtered: boolean;
  /** `onClearAll` + focus on the results heading (the clicked button unmounts). */
  clearAll: () => void;
}

function GridSkeleton() {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 ${GRID_CLASSES}`}>
      {Array.from({ length: 6 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Shop/search results layout: sticky filter rail (drawer below `lg`), toolbar with count +
 * sort, active-filter chips, the collectible grid and LOAD MORE. Filtering, faceting and
 * sorting run client-side over the cached catalogue (memoised).
 */
export function ProductBrowser({
  idPrefix,
  products,
  isLoading,
  isError,
  error,
  onRetry,
  controller,
  sortOptions,
  pageSize,
  gridLabel,
  renderEmpty,
  onClearAll,
  leadingChips,
  priorityCount = 3,
}: ProductBrowserProps) {
  const { filters, sort, shown, activeFilters, activeCount } = controller;
  const { data: seriesList } = useSeries();

  const seriesLabels = useMemo(
    () =>
      new Map<string, SeriesLabel>(
        (seriesList ?? []).map((series) => [series.id, { name: series.name, year: series.year }]),
      ),
    [seriesList],
  );

  const facets = useMemo(
    () => (products ? computeFacets(products, filters) : null),
    [products, filters],
  );
  const results = useMemo(
    () => (products ? sortProducts(applyFilters(products, filters), sort) : []),
    [products, filters, sort],
  );
  const visible = useMemo(() => results.slice(0, shown), [results, shown]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useIsDesktop();
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  // After LOAD MORE, move focus to the first newly revealed car (keyboard users keep their place).
  const gridRef = useRef<HTMLDivElement>(null);
  const focusIndexRef = useRef<number | null>(null);
  const handleLoadMore = useCallback(() => {
    focusIndexRef.current = visible.length;
    controller.loadMore();
  }, [controller, visible.length]);

  useEffect(() => {
    const index = focusIndexRef.current;
    if (index === null || visible.length <= index) return;
    focusIndexRef.current = null;
    const items = gridRef.current?.querySelectorAll<HTMLElement>('ul > li');
    items?.[index]?.querySelector<HTMLElement>('a[href]')?.focus();
  }, [visible.length]);

  const chipLabel = useCallback(
    (filter: ActiveFilter): string =>
      filter.group === 'series'
        ? (seriesLabels.get(filter.value)?.name ?? filter.label)
        : filter.label,
    [seriesLabels],
  );

  const headingId = `${idPrefix}-results-heading`;
  const loading = isLoading && !products;

  // Clearing filters removes the control that had focus (chip, empty-state button): keyboard
  // focus moves to the results heading, whose count is announced, instead of <body>.
  const focusResults = useCallback((): void => {
    document.getElementById(headingId)?.focus();
  }, [headingId]);
  const clearAllAndFocus = useCallback((): void => {
    onClearAll();
    focusResults();
  }, [focusResults, onClearAll]);
  const count = loading || isError ? null : results.length;

  const rail = (instance: 'rail' | 'drawer') =>
    facets ? (
      <FilterRail
        idPrefix={`${idPrefix}-${instance}`}
        facets={facets}
        controller={controller}
        seriesLabels={seriesLabels}
        showHeading={instance === 'rail'}
        onClearAll={onClearAll}
      />
    ) : loading ? (
      <FilterRailSkeleton />
    ) : (
      <p className="text-sm text-muted">Filters appear once the grid is back online.</p>
    );

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-12 xl:gap-10">
        <aside aria-label="Filters" className="hidden lg:col-span-3 lg:block">
          {/* -mx-2/px-2 leaves room for the options' -mx-2 hover rows and focus rings; overflow-x-hidden keeps
              classic (non-overlay) scrollbars from adding a horizontal bar under the rail. */}
          <div className="sticky top-[calc(var(--header-height)+1.25rem)] -mx-2 max-h-[calc(100dvh-var(--header-height)-2.5rem)] overflow-y-auto overflow-x-hidden overscroll-contain px-2 pb-6 pt-1">
            {rail('rail')}
          </div>
        </aside>

        <section aria-labelledby={headingId} className="min-w-0 lg:col-span-9">
          <ResultsToolbar
            headingId={headingId}
            count={count}
            unavailable={isError && !loading}
            sort={sort}
            sortOptions={sortOptions}
            onSortChange={controller.setSort}
            filterCount={activeCount}
            onOpenFilters={() => setDrawerOpen(true)}
            filtersOpen={drawerOpen}
          />
          <ActiveFilterChips
            className="mt-4"
            filters={activeFilters}
            onRemove={controller.removeFilter}
            onClearAll={onClearAll}
            onFocusFallback={focusResults}
            getLabel={chipLabel}
            leading={leadingChips}
          />
          <div ref={gridRef} className="mt-6">
            <DataState
              isLoading={loading}
              isError={isError}
              error={error}
              onRetry={onRetry}
              isEmpty={results.length === 0}
              skeleton={<GridSkeleton />}
              empty={renderEmpty({ filtered: activeCount > 0, clearAll: clearAllAndFocus })}
              loadingLabel="Warming up the grid…"
            >
              {() => (
                <>
                  <ProductGrid
                    products={visible}
                    columns={3}
                    className={GRID_CLASSES}
                    priorityCount={priorityCount}
                    label={gridLabel}
                  />
                  <LoadMore
                    shown={visible.length}
                    total={results.length}
                    pageSize={pageSize}
                    onLoadMore={handleLoadMore}
                  />
                </>
              )}
            </DataState>
          </div>
        </section>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        resultCount={count}
        activeCount={activeCount}
        onClearAll={onClearAll}
      >
        {rail('drawer')}
      </FilterDrawer>
    </>
  );
}
