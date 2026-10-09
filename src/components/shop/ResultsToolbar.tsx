import { ArrowDownUp, SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { isSortId, type SortId, type SortOption } from '@/config/shop';
import { formatNumber } from '@/lib/format';

export interface ResultsToolbarProps {
  /** Id for the results heading (the section's `aria-labelledby`). */
  headingId: string;
  /** Matching cars; `null` while loading (or while `unavailable`). */
  count: number | null;
  /**
   * The catalogue couldn't load (error state): the heading shows a neutral `— machines`
   * (announced as "machines unavailable") instead of the loading skeleton.
   */
  unavailable?: boolean;
  sort: SortId;
  sortOptions: readonly SortOption[];
  onSortChange: (sort: SortId) => void;
  /** Active filters (for the mobile "FILTERS (3)" button). */
  filterCount: number;
  onOpenFilters: () => void;
  filtersOpen: boolean;
}

/**
 * Results bar: `24 MACHINES` heading (with a polite live announcement when it changes), the
 * mobile FILTERS button (below `lg`) and the sort select. Phones: count + FILTERS share the
 * first row and the sort select gets a full-width row, so labels like "Price: low to high" fit.
 * The heading is focusable (`tabIndex=-1`): clearing filters hands keyboard focus to it.
 */
export function ResultsToolbar({
  headingId,
  count,
  unavailable = false,
  sort,
  sortOptions,
  onSortChange,
  filterCount,
  onOpenFilters,
  filtersOpen,
}: ResultsToolbarProps) {
  const sortId = `sort-${useId().replace(/:/g, '')}`;
  const noun = count === 1 ? 'machine' : 'machines';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line pb-4 sm:flex sm:gap-4">
      <div className="flex min-h-10 min-w-0 items-center">
        {unavailable ? (
          <h2
            id={headingId}
            tabIndex={-1}
            className="flex items-baseline gap-2 rounded-sm font-mono font-bold normal-case tracking-normal"
          >
            <span aria-hidden="true" className="text-2xl text-muted">
              —
            </span>
            <span className="text-xs uppercase tracking-hud text-muted">
              {noun}
              <span className="sr-only"> unavailable</span>
            </span>
          </h2>
        ) : count === null ? (
          <>
            <h2 id={headingId} tabIndex={-1} className="sr-only">
              Loading machines
            </h2>
            <Skeleton className="h-6 w-36 rounded" />
          </>
        ) : (
          <h2
            id={headingId}
            tabIndex={-1}
            className="flex items-baseline gap-2 rounded-sm font-mono font-bold normal-case tracking-normal"
          >
            <span className="text-2xl tabular-nums text-fg">{formatNumber(count)}</span>
            <span className="text-xs uppercase tracking-hud text-muted">{noun}</span>
          </h2>
        )}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {count === null || unavailable ? '' : `${formatNumber(count)} ${noun} on the grid`}
        </p>
      </div>

      <Button
        variant="outline"
        onClick={onOpenFilters}
        leftIcon={<SlidersHorizontal />}
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
        className="shrink-0 sm:ml-auto lg:hidden"
      >
        Filters
        {filterCount > 0 ? (
          <span className="ml-1 font-mono tabular-nums text-accent-ink">
            ({filterCount})<span className="sr-only"> active</span>
          </span>
        ) : null}
      </Button>
      <div className="col-span-2 flex min-w-0 items-center gap-2 lg:ml-auto">
        <label htmlFor={sortId} className="hud hidden shrink-0 text-muted sm:block">
          Sort by
        </label>
        <Select
          id={sortId}
          value={sort}
          onChange={(event) => {
            const next = event.target.value;
            if (isSortId(next)) onSortChange(next);
          }}
          options={sortOptions.map((option) => ({ value: option.id, label: option.label }))}
          leftIcon={<ArrowDownUp />}
          aria-label="Sort by"
          containerClassName="min-w-0 flex-1 sm:w-56 sm:flex-none"
        />
      </div>
    </div>
  );
}
