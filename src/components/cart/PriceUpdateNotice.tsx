import { RefreshCw, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import type { CartChange } from './reconcile';

export interface PriceUpdateNoticeProps {
  changes: readonly CartChange[];
  onDismiss?: () => void;
  /** Heading level of the notice title (default h2). */
  headingAs?: 'h2' | 'h3';
  className?: string;
}

function describeChange(change: CartChange): string {
  if (change.kind === 'qty-reduced') {
    return `quantity lowered from ${change.from ?? '—'} to ${change.to ?? '—'} (limited stock)`;
  }
  const from = change.from !== null ? formatINR(change.from) : '—';
  const to = change.to !== null ? formatINR(change.to) : '—';
  return `${from} → ${to}`;
}

/** "Prices updated since you added these" — lists every price / quantity change. */
export function PriceUpdateNotice({
  changes,
  onDismiss,
  headingAs: Heading = 'h2',
  className,
}: PriceUpdateNoticeProps) {
  if (changes.length === 0) return null;
  const onlyQty = changes.every((change) => change.kind === 'qty-reduced');

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-xl border border-accent/40 bg-accent/[0.05] p-4 pr-12 sm:p-5 sm:pr-14',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-accent" />
      <div className="flex items-start gap-3">
        <RefreshCw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
        <div className="min-w-0">
          <Heading className="font-display text-xs font-bold uppercase tracking-display text-fg sm:text-sm">
            {onlyQty ? 'Quantities adjusted to fit stock' : 'Prices updated since you added these'}
          </Heading>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {changes.map((change) => (
              <li key={`${change.productId}-${change.kind}`}>
                <span className="text-fg">{change.name}</span>:{' '}
                <span className="font-mono tabular-nums">{describeChange(change)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Totals below use the latest prices — that's exactly what you'll pay.
          </p>
        </div>
      </div>
      {onDismiss ? (
        <IconButton
          label="Dismiss price update notice"
          icon={<X />}
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute right-2 top-2"
        />
      ) : null}
    </section>
  );
}
