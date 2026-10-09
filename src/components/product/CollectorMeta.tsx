import { cn } from '@/lib/cn';
import type { Product } from '@/types';

export type CollectorMetaLayout = 'inline' | 'stacked';

export interface CollectorMetaProps {
  product: Pick<Product, 'scale' | 'year' | 'vehicleType' | 'seriesName'>;
  /** `inline` = `1:64 · 2025 · CONCEPT` HUD line; `stacked` = labelled spec rows. */
  layout?: CollectorMetaLayout;
  /** Include the series name (default: false inline, true stacked). */
  showSeries?: boolean;
  className?: string;
}

interface MetaItem {
  label: string;
  value: string;
}

/**
 * Collector mini-meta: scale · year · vehicle type (· series). Semantically a description list,
 * so screen readers hear "Scale 1:64, Year 2025, Type Concept" while sighted users see a compact
 * mono HUD line.
 */
export function CollectorMeta({
  product,
  layout = 'inline',
  showSeries,
  className,
}: CollectorMetaProps) {
  const includeSeries = showSeries ?? layout === 'stacked';
  const items: MetaItem[] = [
    { label: 'Scale', value: product.scale },
    { label: 'Year', value: product.year > 0 ? String(product.year) : '' },
    { label: 'Type', value: product.vehicleType },
    ...(includeSeries ? [{ label: 'Series', value: product.seriesName }] : []),
  ].filter((item) => item.value.trim() !== '');

  if (items.length === 0) return null;

  if (layout === 'stacked') {
    return (
      <dl
        className={cn(
          'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line',
          className,
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-card px-3 py-2.5">
            <dt className="hud text-2xs text-muted">{item.label}</dt>
            <dd className="truncate font-mono text-sm font-bold uppercase text-fg">{item.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs font-medium uppercase leading-none tracking-[0.12em] text-muted',
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'inline-flex min-w-0 items-center',
            index > 0 &&
              "before:mr-2 before:inline-block before:h-2.5 before:w-px before:rotate-12 before:bg-fg/25 before:content-['']",
          )}
        >
          <dt className="sr-only">{item.label}</dt>
          <dd className="truncate">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
