import type { ReactNode } from 'react';
import { Chip } from '@/components/ui/Chip';
import type { ActiveFilter } from '@/hooks/useProductFilters';
import { cn } from '@/lib/cn';

export interface ActiveFilterChipsProps {
  filters: readonly ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
  /** Maps a chip to a nicer label (e.g. series id → series name). */
  getLabel?: (filter: ActiveFilter) => string;
  /** Extra chips before the filters (e.g. the shop's text query). */
  leading?: ReactNode;
  className?: string;
}

/** Removable chips for every active filter + "Clear all". Renders nothing when idle. */
export function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
  getLabel,
  leading,
  className,
}: ActiveFilterChipsProps) {
  if (filters.length === 0 && !leading) return null;

  return (
    <ul aria-label="Active filters" className={cn('flex flex-wrap items-center gap-2', className)}>
      {leading}
      {filters.map((filter) => {
        const label = getLabel?.(filter) ?? filter.label;
        return (
          <li key={filter.id} className="max-w-full">
            <Chip
              size="md"
              variant="outline"
              onRemove={() => onRemove(filter)}
              removeLabel={`Remove ${filter.groupLabel.toLowerCase()} filter: ${label}`}
              className="max-w-full bg-card/60"
            >
              <span className="text-muted">{filter.groupLabel}</span>
              <span aria-hidden="true" className="px-1 text-muted">
                ·
              </span>
              {label}
            </Chip>
          </li>
        );
      })}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex min-h-8 items-center rounded-sm px-1 font-mono text-[11px] font-bold uppercase tracking-hud text-accent-ink underline-offset-4 transition-opacity hover:underline hover:opacity-90 active:opacity-70"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
