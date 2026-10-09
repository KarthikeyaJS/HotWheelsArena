import { cn } from '@/lib/cn';
import { stockStatus } from '@/lib/product';
import type { StockStatus as StockStatusValue } from '@/types';

export type StockStatusSize = 'sm' | 'md';

export interface StockStatusProps {
  /** Static stock counter from the product document. */
  stock: number;
  size?: StockStatusSize;
  className?: string;
}

const TEXT_TONES: Readonly<Record<StockStatusValue, string>> = {
  'in-stock': 'text-fg',
  low: 'text-danger-ink',
  'sold-out': 'text-muted',
};

const DOT_TONES: Readonly<Record<StockStatusValue, string>> = {
  'in-stock': 'bg-success shadow-[0_0_8px_rgb(var(--success)/0.6)]',
  low: 'bg-danger shadow-[0_0_8px_rgb(var(--accent-2)/0.7)]',
  // Hollow ring: sold out reads differently from the filled dots even without colour.
  'sold-out': 'border-2 border-muted bg-transparent',
};

const SIZES: Readonly<Record<StockStatusSize, { text: string; dot: string; gap: string }>> = {
  // 12px on phones (own row); from sm it shares a row with + CART, so 11px with tighter tracking.
  sm: { text: 'text-xs sm:text-2xs sm:tracking-[0.1em]', dot: 'h-2 w-2', gap: 'gap-1.5' },
  md: { text: 'text-xs', dot: 'h-2.5 w-2.5', gap: 'gap-2' },
};

/**
 * Availability readout: `IN STOCK` (green dot) · `ONLY 3 LEFT` (red, pulsing "hot" dot) ·
 * `SOLD OUT` (hollow grey ring). The label text always carries the meaning — colour is only
 * reinforcement.
 */
export function StockStatus({ stock, size = 'md', className }: StockStatusProps) {
  const info = stockStatus(stock);
  const sizing = SIZES[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold uppercase tabular-nums leading-none tracking-[0.14em]',
        sizing.gap,
        sizing.text,
        TEXT_TONES[info.status],
        className,
      )}
      data-status={info.status}
    >
      <span aria-hidden="true" className={cn('relative inline-flex shrink-0', sizing.dot)}>
        {info.status === 'low' ? (
          <span className="absolute inset-0 animate-ping rounded-full bg-danger/70 motion-reduce:hidden" />
        ) : null}
        <span
          className={cn('relative inline-block h-full w-full rounded-full', DOT_TONES[info.status])}
        />
      </span>
      <span>
        <span className="sr-only">Availability: </span>
        {info.label}
      </span>
    </span>
  );
}
