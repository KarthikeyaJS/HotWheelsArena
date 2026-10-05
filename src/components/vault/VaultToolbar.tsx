import { ArrowDownUp } from 'lucide-react';
import { useId } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import {
  VAULT_FILTERS,
  VAULT_SORTS,
  parseVaultSort,
  type VaultCounts,
  type VaultFilter,
  type VaultSort,
} from './vaultFilters';

export interface VaultToolbarProps {
  filter: VaultFilter;
  sort: VaultSort;
  counts: VaultCounts | null;
  /** Editions currently shown (announced politely). */
  resultCount: number | null;
  onFilterChange: (filter: VaultFilter) => void;
  onSortChange: (sort: VaultSort) => void;
  className?: string;
}

const SORT_OPTIONS = VAULT_SORTS.map((sort) => ({ value: sort.id, label: sort.label }));

/** Filter chips (All / Available / Sold out) with counts, sort-by-remaining select, live count. */
export function VaultToolbar({
  filter,
  sort,
  counts,
  resultCount,
  onFilterChange,
  onSortChange,
  className,
}: VaultToolbarProps) {
  const sortId = `vault-sort-${useId().replace(/:/g, '')}`;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-line bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-4',
        className,
      )}
    >
      <div role="group" aria-label="Filter editions" className="flex flex-wrap gap-2">
        {VAULT_FILTERS.map((option) => {
          const count = counts ? counts[option.id] : null;
          return (
            <Chip
              key={option.id}
              size="lg"
              variant="outline"
              selected={filter === option.id}
              onClick={() => onFilterChange(option.id)}
            >
              {option.label}
              {count !== null ? (
                <span className="ml-1 tabular-nums text-muted">
                  <span className="sr-only">, </span>
                  {formatNumber(count)}
                </span>
              ) : null}
            </Chip>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor={sortId} className="hud shrink-0 text-muted">
          Sort by
        </label>
        <Select
          id={sortId}
          size="sm"
          value={sort}
          options={SORT_OPTIONS}
          leftIcon={<ArrowDownUp />}
          onChange={(event) => onSortChange(parseVaultSort(event.target.value))}
          containerClassName="min-w-0 flex-1 sm:w-52 sm:flex-none"
        />
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {resultCount === null ? '' : `Showing ${pluralize(resultCount, 'edition')}`}
      </p>
    </div>
  );
}
