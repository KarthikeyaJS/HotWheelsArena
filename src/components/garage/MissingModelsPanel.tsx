import { Check, ChevronDown, Crown, Layers } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HudPanel } from '@/components/effects/HudPanel';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { CarImage } from '@/components/product/CarImage';
import { WishlistButton } from '@/components/product/WishlistButton';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { productPath, seriesPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatCollectionNumber, formatINR, formatNumber, pluralize } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import type { Product } from '@/types';
import type { SeriesProgress } from './garageModel';

export interface MissingModelsPanelProps {
  rows: readonly SeriesProgress[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** "I have it" — park the missing car. */
  onHaveIt: (product: Product) => void;
  className?: string;
}

/** Missing cars shown before the "show all" disclosure. */
const PREVIEW_COUNT = 3;

function MissingCarRow({
  product,
  onHaveIt,
}: {
  product: Product;
  onHaveIt: (p: Product) => void;
}) {
  const image = primaryImageOf(product);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <CarImage image={image} alt="" width={96} height={60} className="w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">
          <Link
            to={productPath(product.slug)}
            className="rounded-sm transition-colors hover:text-accent-ink"
          >
            {product.name}
          </Link>
        </p>
        <p className="hud mt-0.5 text-[10px] text-muted">
          {formatCollectionNumber(product.collectionNumber)}
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, </span>
          <span className="text-fg">{formatINR(product.price)}</span>
        </p>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <WishlistButton product={product} size="sm" />
        <AddToCartButton product={product} size="sm" variant="outline" />
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Check />}
          aria-label={`I have it — park ${product.name} in your garage`}
          onClick={() => onHaveIt(product)}
        >
          I have it
        </Button>
      </div>
    </li>
  );
}

function SeriesCard({ row, onHaveIt }: { row: SeriesProgress; onHaveIt: (p: Product) => void }) {
  const [expanded, setExpanded] = useState(false);
  const listId = `missing-${row.series.id}`;
  const visible = expanded ? row.missing : row.missing.slice(0, PREVIEW_COUNT);
  const hiddenCount = row.missing.length - visible.length;

  return (
    <li className="rounded-lg border border-line bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold uppercase tracking-display text-fg">
            <Link
              to={seriesPath(row.series.slug)}
              className="rounded-sm transition-colors hover:text-accent-ink"
            >
              {row.series.name}
            </Link>
          </h3>
          <p className="hud mt-1 text-[10px] text-muted">{row.series.year} series</p>
        </div>
        <p className="font-mono text-lg font-bold tabular-nums leading-none text-fg">
          {formatNumber(row.owned)}
          <span className="text-muted">/{formatNumber(row.total)}</span>
        </p>
      </div>
      <ProgressBar
        value={row.owned}
        max={Math.max(1, row.total)}
        label={`${row.series.name} completion`}
        valueText={`${row.owned} of ${row.total} cars`}
        tone={row.complete ? 'success' : 'accent'}
        size="sm"
        segments={row.total > 1 && row.total <= 12 ? row.total : undefined}
        className="mt-3"
      />

      {row.complete ? (
        <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-hud text-highlight-ink">
          <Crown aria-hidden="true" className="h-4 w-4" />
          Series complete — Master Collector territory
        </p>
      ) : row.missing.length > 0 ? (
        <>
          <p className="hud mt-3 text-[10px] text-muted">
            Missing {pluralize(row.missing.length, 'car')}
          </p>
          <ul
            id={listId}
            aria-label={`Missing from ${row.series.name}`}
            className="divide-y divide-line"
          >
            {visible.map((product) => (
              <MissingCarRow key={product.id} product={product} onHaveIt={onHaveIt} />
            ))}
          </ul>
          {row.missing.length > PREVIEW_COUNT ? (
            <Button
              variant="link"
              size="sm"
              aria-expanded={expanded}
              aria-controls={listId}
              rightIcon={
                <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
              }
              onClick={() => setExpanded((value) => !value)}
              className="mt-2"
            >
              {expanded
                ? 'Show fewer'
                : `Show all ${row.missing.length} missing (${hiddenCount} more)`}
            </Button>
          ) : null}
        </>
      ) : null}

      {row.unavailable > 0 ? (
        <p className="mt-2 text-xs text-muted">
          {pluralize(row.unavailable, 'car')} from this series{' '}
          {row.unavailable === 1 ? 'is' : 'are'} no longer in the catalogue.
        </p>
      ) : null}
    </li>
  );
}

/**
 * MISSING MODELS PER SERIES: for every series with at least one parked car, progress (`3/5`)
 * plus the cars still missing with add-to-wishlist, add-to-cart and "I have it" actions.
 */
export function MissingModelsPanel({
  rows,
  isLoading,
  error,
  onRetry,
  onHaveIt,
  className,
}: MissingModelsPanelProps) {
  const inProgress = rows.filter((row) => !row.complete).length;

  return (
    <HudPanel
      as="section"
      aria-labelledby="garage-missing-title"
      className={cn('flex flex-col', className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="hud text-muted">Series hunt</p>
          <h2
            id="garage-missing-title"
            className="mt-1 font-display text-lg font-bold uppercase tracking-display text-fg"
          >
            Missing models per series
          </h2>
        </div>
        {rows.length > 0 ? (
          <p className="hud shrink-0 text-right text-[10px] text-muted">
            <span className="block font-mono text-2xl font-bold leading-none tracking-normal text-fg">
              {formatNumber(inProgress)}
            </span>
            In progress
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Loading series…</span>
          {[0, 1].map((index) => (
            <div
              key={index}
              aria-hidden="true"
              className="rounded-lg border border-line bg-card p-4"
            >
              <Skeleton className="h-4 w-1/3 rounded-sm" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-4 h-12 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState compact error={error} onRetry={onRetry} title="Series data stalled" />
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <Layers aria-hidden="true" className="h-6 w-6 text-muted" />
          <p className="font-display text-sm font-bold uppercase tracking-display text-fg">
            No series started
          </p>
          <p className="max-w-sm text-sm text-muted">
            Park any car and its series shows up here with every model you still need.
          </p>
        </div>
      ) : (
        <ul aria-label="Series in your garage" className="flex flex-col gap-3">
          {rows.map((row) => (
            <SeriesCard key={row.series.id} row={row} onHaveIt={onHaveIt} />
          ))}
        </ul>
      )}
    </HudPanel>
  );
}
