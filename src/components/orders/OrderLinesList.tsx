import { Link } from 'react-router-dom';
import { CarImage } from '@/components/product/CarImage';
import { productPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import type { OrderItem } from '@/types';

export type OrderLineSummary = Pick<
  OrderItem,
  'productId' | 'slug' | 'name' | 'image' | 'price' | 'qty'
>;

export interface OrderLinesListProps {
  lines: readonly OrderLineSummary[];
  /** `sm` = compact sidebar rows; `md` = full rows. */
  size?: 'sm' | 'md';
  /** Link names to the product page (default true). */
  linkToProduct?: boolean;
  /** Accessible name of the list. */
  label?: string;
  className?: string;
}

/** Read-only order lines: thumbnail, name, `2 × ₹499`, line total (mono). */
export function OrderLinesList({
  lines,
  size = 'md',
  linkToProduct = true,
  label = 'Cars in this order',
  className,
}: OrderLinesListProps) {
  const compact = size === 'sm';

  return (
    <ul aria-label={label} className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4', className)}>
      {lines.map((line) => (
        <li key={line.productId} className="flex items-center gap-3 sm:gap-4">
          <span
            className={cn(
              'relative shrink-0 overflow-hidden rounded-md border border-line bg-surface',
              compact ? 'w-16' : 'w-20 sm:w-24',
            )}
          >
            <span aria-hidden="true" className="bg-grid absolute inset-0 opacity-50" />
            <CarImage src={line.image} alt="" width={96} height={60} className="relative" />
            {compact && line.qty > 1 ? (
              <span className="absolute right-0.5 top-0.5 rounded-sm bg-fg px-1 font-mono text-[10px] font-bold leading-4 text-bg">
                ×{line.qty}
              </span>
            ) : null}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-medium leading-snug text-fg',
                compact ? 'line-clamp-2 text-xs' : 'text-sm sm:text-base',
              )}
            >
              {linkToProduct ? (
                <Link
                  to={productPath(line.slug)}
                  className="rounded-sm transition-colors duration-150 hover:text-accent-ink"
                >
                  {line.name}
                </Link>
              ) : (
                line.name
              )}
            </p>
            <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">
              {line.qty} × {formatINR(line.price)}
            </p>
          </div>
          <p
            className={cn(
              'shrink-0 font-mono font-semibold tabular-nums text-fg',
              compact ? 'text-xs' : 'text-sm sm:text-base',
            )}
          >
            <span className="sr-only">Line total </span>
            {formatINR(line.price * line.qty)}
          </p>
        </li>
      ))}
    </ul>
  );
}
