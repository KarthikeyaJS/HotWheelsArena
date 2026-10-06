import { cn } from '@/lib/cn';
import { formatINR, formatINRPrecise, pluralize } from '@/lib/format';

export interface TotalsBreakdownValues {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** Units in the order (shown next to the subtotal). */
  itemCount?: number;
}

export interface TotalsBreakdownProps {
  totals: TotalsBreakdownValues;
  /** GST display: inclusive (informational "Includes GST") or added on top. */
  taxInclusive?: boolean;
  /** Show the GST line (settings.showGstLine). */
  showGstLine?: boolean;
  /** Rate for the GST label, e.g. 0.18 → "(18%)". Omit when unknown (historic orders). */
  taxRate?: number;
  /** Label of the final row (default "Total"). */
  totalLabel?: string;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Subtotal / shipping / GST / total rows (a `<dl>`, mono figures). Used by the pit stop summary,
 * checkout sidebar, success page and order detail so every surface reads the same way.
 */
export function TotalsBreakdown({
  totals,
  taxInclusive = true,
  showGstLine = true,
  taxRate,
  totalLabel = 'Total',
  size = 'md',
  className,
}: TotalsBreakdownProps) {
  const rateLabel =
    taxRate !== undefined && Number.isFinite(taxRate) && taxRate > 0
      ? ` (${Math.round(taxRate * 100)}%)`
      : '';
  const gstVisible = showGstLine && totals.tax > 0;

  return (
    <dl className={cn('flex flex-col gap-3 text-sm', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">
          Subtotal
          {totals.itemCount !== undefined ? (
            <span className="text-muted"> · {pluralize(totals.itemCount, 'car')}</span>
          ) : null}
        </dt>
        <dd className="font-mono tabular-nums text-fg">{formatINR(totals.subtotal)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">Shipping</dt>
        <dd className="font-mono tabular-nums">
          {totals.shipping === 0 ? (
            <span className="font-bold tracking-hud text-success">FREE</span>
          ) : (
            <span className="text-fg">{formatINR(totals.shipping)}</span>
          )}
        </dd>
      </div>
      {gstVisible && !taxInclusive ? (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">GST{rateLabel}</dt>
          <dd className="font-mono tabular-nums text-fg">{formatINRPrecise(totals.tax)}</dd>
        </div>
      ) : null}
      <div
        className={cn(
          'mt-1 flex items-baseline justify-between gap-4 border-t border-dashed border-line pt-4',
        )}
      >
        <dt className="font-display text-xs font-bold uppercase tracking-display text-fg">
          {totalLabel}
        </dt>
        <dd
          className={cn(
            'font-mono font-bold tabular-nums text-fg',
            size === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl',
          )}
        >
          {formatINR(totals.total)}
        </dd>
      </div>
      {gstVisible && taxInclusive ? (
        <div className="-mt-1 flex items-baseline justify-between gap-4 text-xs">
          <dt className="text-muted">Includes GST{rateLabel}</dt>
          <dd className="font-mono tabular-nums text-muted">{formatINRPrecise(totals.tax)}</dd>
        </div>
      ) : null}
    </dl>
  );
}
