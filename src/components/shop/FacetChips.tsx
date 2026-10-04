import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';
import { formatNumber, pluralize } from '@/lib/format';
import type { FacetOption } from './filtering';

export interface FacetChipsProps {
  options: readonly FacetOption[];
  onToggle: (value: string) => void;
  emptyMessage?: string;
  className?: string;
}

/** Compact facet for short value sets (YEAR, SCALE): toggle chips (`aria-pressed`) with counts. */
export function FacetChips({
  options,
  onToggle,
  emptyMessage = 'Nothing to filter here yet.',
  className,
}: FacetChipsProps) {
  if (options.length === 0) return <p className="text-xs text-muted">{emptyMessage}</p>;

  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <li key={option.value}>
          <Chip
            size="lg"
            variant="outline"
            selected={option.selected}
            disabled={option.disabled}
            onClick={() => onToggle(option.value)}
            title={pluralize(option.count, 'car')}
            className="tabular-nums"
          >
            {option.label}
            <span
              aria-hidden="true"
              className={cn(
                'ml-2 font-medium',
                option.selected ? 'text-accent-ink/80' : 'text-muted',
              )}
            >
              {formatNumber(option.count)}
            </span>
            <span className="sr-only">, {pluralize(option.count, 'car')}</span>
          </Chip>
        </li>
      ))}
    </ul>
  );
}
