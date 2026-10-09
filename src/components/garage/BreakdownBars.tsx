import { cn } from '@/lib/cn';
import { formatNumber, formatPercent } from '@/lib/format';
import type { BreakdownRow } from './garageModel';

export interface BreakdownBarsProps {
  rows: readonly BreakdownRow[];
  /** Accessible name of the list, e.g. "Cars by category". */
  label: string;
  /** Per-row fill class (token colours only). Default orange. */
  toneOf?: (key: string) => string;
  className?: string;
}

/**
 * Pure-CSS horizontal breakdown bars (no chart library): label, count + share, and a bar whose
 * width is relative to the largest bucket. Values are real text, so screen readers read them.
 */
export function BreakdownBars({ rows, label, toneOf, className }: BreakdownBarsProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-col gap-3', className)}>
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="hud text-xs text-fg">{row.label}</span>
            <span className="font-mono text-xs tabular-nums text-muted">
              <span className="font-bold text-fg">{formatNumber(row.count)}</span>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
              {formatPercent(row.share)}
            </span>
          </div>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-out-expo motion-reduce:transition-none',
                toneOf ? toneOf(row.key) : 'bg-accent',
              )}
              style={{ width: `${row.count > 0 ? Math.max(4, row.ratio) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
