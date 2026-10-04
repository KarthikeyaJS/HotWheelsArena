import { useMemo } from 'react';
import { cn } from '@/lib/cn';
import { formatCollectionNumber } from '@/lib/format';
import { productSpecs } from '@/lib/product';
import type { Product } from '@/types';

export interface ProductSpecTableProps {
  product: Product;
  /** Id for the panel heading (`aria-labelledby`). */
  headingId?: string;
  className?: string;
}

const CORNER = 'pointer-events-none absolute h-2.5 w-2.5 border-fg/40';

/**
 * Spec sheet in a brushed-metal HUD panel: SCALE, YEAR, SERIES, COLOR, MATERIAL, TYPE and
 * COLLECTION # as a `<dl>` (screen readers hear "Scale 1:64" pairs). Text on the metal surface
 * is always `text-fg` (AA on both themes).
 */
export function ProductSpecTable({
  product,
  headingId = 'product-specs-title',
  className,
}: ProductSpecTableProps) {
  const specs = useMemo(
    () => [
      ...productSpecs(product),
      { label: 'COLLECTION #', value: formatCollectionNumber(product.collectionNumber) },
    ],
    [product],
  );

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'metal-surface relative overflow-hidden rounded-xl border border-line text-fg shadow-card',
        className,
      )}
    >
      <span aria-hidden="true" className={cn(CORNER, 'left-1.5 top-1.5 border-l-2 border-t-2')} />
      <span aria-hidden="true" className={cn(CORNER, 'right-1.5 top-1.5 border-r-2 border-t-2')} />
      <span
        aria-hidden="true"
        className={cn(CORNER, 'bottom-1.5 left-1.5 border-b-2 border-l-2')}
      />
      <span
        aria-hidden="true"
        className={cn(CORNER, 'bottom-1.5 right-1.5 border-b-2 border-r-2')}
      />

      <div className="flex items-center justify-between gap-3 border-b border-fg/10 px-5 py-3">
        <h2
          id={headingId}
          className="hud flex items-center gap-2 font-mono text-[11px] font-bold text-fg"
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-fg/70" />
          SPEC SHEET
        </h2>
        <span aria-hidden="true" className="hud text-[10px] text-fg/75">
          FILE {formatCollectionNumber(product.collectionNumber)}
        </span>
      </div>

      <dl className="divide-y divide-fg/10 px-5 pb-1">
        {specs.map((spec) => (
          <div key={spec.label} className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 py-2.5">
            <dt className="hud text-[10px] text-fg/75">{spec.label}</dt>
            <dd className="min-w-0 text-right font-mono text-[13px] font-semibold text-fg">
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
