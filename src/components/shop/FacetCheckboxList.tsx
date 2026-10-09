import { Check, ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import type { FacetOption } from './filtering';

export interface FacetCheckboxListProps {
  /** Facet options (from `computeFacets`). */
  options: readonly FacetOption[];
  onToggle: (value: string) => void;
  /** Options visible before "Show all" (selected ones are always visible). */
  limit?: number;
  /** Plural noun for the "Show all 20 makes" toggle. */
  noun?: string;
  /** Custom label content (swatch, rarity chip …); defaults to `option.label`. */
  renderLabel?: (option: FacetOption) => ReactNode;
  /** Accessible label text when `renderLabel` is visual (defaults to `option.label`). */
  getLabelText?: (option: FacetOption) => string;
  columns?: 1 | 2;
  /** Shown when there are no options. */
  emptyMessage?: string;
  /** Extra classes for the list grid (e.g. responsive column overrides). */
  listClassName?: string;
  className?: string;
}

/**
 * Multi-select facet list: native checkboxes (keyboard + screen-reader friendly) styled as
 * garage toggles, with right-aligned counts. Zero-count options are disabled; long lists
 * collapse behind a "Show all" disclosure.
 */
export function FacetCheckboxList({
  options,
  onToggle,
  limit,
  noun = 'options',
  renderLabel,
  getLabelText,
  columns = 1,
  emptyMessage = 'Nothing to filter here yet.',
  listClassName,
  className,
}: FacetCheckboxListProps) {
  const baseId = useId().replace(/:/g, '');
  const [expanded, setExpanded] = useState(false);
  const listId = `facet-${baseId}-list`;

  if (options.length === 0) {
    return <p className="text-xs text-muted">{emptyMessage}</p>;
  }

  // Collapse only when it hides at least two options.
  const collapsible = limit !== undefined && options.length > limit + 1;
  const visible =
    collapsible && !expanded
      ? options.filter((option, index) => index < limit || option.selected)
      : options;

  return (
    <div className={className}>
      <ul
        id={listId}
        className={cn('grid gap-x-3', columns === 2 ? 'grid-cols-2' : 'grid-cols-1', listClassName)}
      >
        {visible.map((option) => {
          const inputId = `facet-${baseId}-${option.value.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const labelText = getLabelText?.(option) ?? option.label;
          return (
            <li key={option.value} className="min-w-0">
              <label
                htmlFor={inputId}
                className={cn(
                  'group/opt -mx-2 flex min-h-10 items-center gap-3 rounded-md px-2 transition-colors duration-150',
                  option.disabled
                    ? 'cursor-not-allowed opacity-45'
                    : 'cursor-pointer hover:bg-fg/[0.05] active:bg-fg/[0.08]',
                )}
              >
                <span className="relative inline-grid h-[18px] w-[18px] shrink-0 place-items-center">
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={option.selected}
                    disabled={option.disabled}
                    onChange={() => onToggle(option.value)}
                    aria-label={`${labelText}, ${pluralize(option.count, 'car')}`}
                    className="peer h-[18px] w-[18px] cursor-[inherit] appearance-none rounded-[4px] border-2 border-fg/30 bg-surface transition-[background-color,border-color] duration-150 ease-race checked:!border-accent checked:!bg-accent group-hover/opt:border-fg/55 disabled:group-hover/opt:border-fg/30"
                  />
                  <Check
                    aria-hidden="true"
                    strokeWidth={3.5}
                    className="pointer-events-none absolute h-3 w-3 scale-50 text-on-accent opacity-0 transition-[opacity,transform] duration-150 ease-race peer-checked:scale-100 peer-checked:opacity-100"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 text-sm leading-tight',
                    option.selected ? 'font-semibold text-fg' : 'text-fg/90',
                  )}
                >
                  {renderLabel ? (
                    renderLabel(option)
                  ) : (
                    <span className="truncate" title={option.label}>
                      {option.label}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 font-mono text-xs tabular-nums',
                    option.selected ? 'text-accent-ink' : 'text-muted',
                  )}
                >
                  {formatNumber(option.count)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="group mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-sm font-mono text-xs font-bold uppercase tracking-hud text-accent-ink transition-opacity hover:opacity-80 active:opacity-70 touch:min-h-11"
        >
          {expanded ? 'Show fewer' : `Show all ${options.length} ${noun}`}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>
      ) : null}
    </div>
  );
}
