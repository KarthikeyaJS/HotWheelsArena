import { RotateCcw } from 'lucide-react';
import { useRef } from 'react';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { PRICE_STEP } from '@/config/shop';
import { formatINR } from '@/lib/format';
import { priceToRange, type PriceBounds, type PriceRange, type ProductFilters } from './filtering';

export interface PriceFilterProps {
  bounds: PriceBounds | null;
  filters: Pick<ProductFilters, 'priceMin' | 'priceMax'>;
  /** Live slider position while dragging (from `useProductFilters().priceDraft`). */
  draft: PriceRange | null;
  onDraft: (range: readonly [number, number], bounds: PriceBounds) => void;
  onCommit: (range: readonly [number, number], bounds: PriceBounds) => void;
  onReset: () => void;
}

/** PRICE facet: dual-thumb ₹ slider bounded by the view's cheapest / priciest car. */
export function PriceFilter({
  bounds,
  filters,
  draft,
  onDraft,
  onCommit,
  onReset,
}: PriceFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  if (!bounds) return <p className="text-xs text-muted">No prices to compare yet.</p>;

  const active = filters.priceMin !== null || filters.priceMax !== null;
  const value = draft ?? priceToRange(filters, bounds);
  const single = bounds.min === bounds.max;

  return (
    <div ref={rootRef} className="flex flex-col gap-3">
      <RangeSlider
        label="Price"
        hideLabel
        min={bounds.min}
        max={bounds.max}
        step={PRICE_STEP}
        value={value}
        onChange={(next) => onDraft(next, bounds)}
        onCommit={(next) => onCommit(next, bounds)}
        formatValue={formatINR}
        thumbLabels={['Minimum price', 'Maximum price']}
        disabled={single}
        showScale
      />
      {active ? (
        <button
          type="button"
          onClick={() => {
            onReset();
            // "Reset price" disappears with the filter: hand focus to the minimum-price thumb.
            rootRef.current?.querySelector<HTMLElement>('[role="slider"]')?.focus();
          }}
          className="inline-flex min-h-8 items-center gap-1.5 self-start rounded-sm font-mono text-[11px] font-bold uppercase tracking-hud text-accent-ink transition-opacity hover:opacity-80 active:opacity-70"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Reset price
        </button>
      ) : null}
    </div>
  );
}
