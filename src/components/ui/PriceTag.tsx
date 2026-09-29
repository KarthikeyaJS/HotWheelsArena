import { cn } from '@/lib/cn';
import { formatINR } from '@/lib/format';
import { discountPercent } from '@/lib/product';

export type PriceTagSize = 'sm' | 'md' | 'lg' | 'xl';

export interface PriceTagProps {
  /** Whole rupees. */
  price: number;
  /** Original price; shown struck through (with sr-only "was") when higher than `price`. */
  compareAtPrice?: number | null;
  size?: PriceTagSize;
  /** Show a `-20%` "hot deal" tag when discounted (default true). */
  showDiscount?: boolean;
  className?: string;
}

const PRICE_SIZES: Readonly<Record<PriceTagSize, string>> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl sm:text-4xl',
};

const COMPARE_SIZES: Readonly<Record<PriceTagSize, string>> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

/** Mono ₹ price (Indian grouping via `formatINR`) with optional compare-at and discount tag. */
export function PriceTag({
  price,
  compareAtPrice,
  size = 'md',
  showDiscount = true,
  className,
}: PriceTagProps) {
  const discount = discountPercent({ price, compareAtPrice: compareAtPrice ?? null });
  const onSale = discount !== null && compareAtPrice != null;

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      <span
        className={cn('font-mono font-bold tabular-nums leading-none text-fg', PRICE_SIZES[size])}
      >
        {onSale ? <span className="sr-only">Now </span> : null}
        {formatINR(price)}
      </span>
      {onSale ? (
        <>
          <s className={cn('font-mono tabular-nums leading-none text-muted', COMPARE_SIZES[size])}>
            <span className="sr-only">, was </span>
            {formatINR(compareAtPrice)}
          </s>
          {showDiscount ? (
            <span className="rounded-sm bg-danger px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none tracking-wider text-white">
              <span aria-hidden="true">−{discount}%</span>
              <span className="sr-only">, {discount}% off</span>
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}
