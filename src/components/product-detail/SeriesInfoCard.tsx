import { ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { seriesCompletion } from '@shared/gamification';
import { DataState } from '@/components/common/DataState';
import { Button, HudReadout, ProgressBar, Skeleton } from '@/components/ui';
import { seriesPath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useRequireAuthAction } from '@/hooks/useRequireAuthAction';
import { useSeries } from '@/hooks/useSeries';
import { cn } from '@/lib/cn';
import { formatNumber, padNumber, pluralize } from '@/lib/format';
import { useGarageStore } from '@/store/garageStore';
import type { Product, Series } from '@/types';

export interface SeriesInfoCardProps {
  product: Pick<Product, 'series' | 'seriesName' | 'seriesNumber' | 'year'>;
  className?: string;
}

function SeriesCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-6">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton variant="text" lines={2} />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/** The signed-in collector's progress on the series (from the garage mirror). */
function GarageProgress({ series }: { series: Pick<Series, 'id' | 'carIds' | 'name'> }) {
  const { status } = useAuth();
  const garage = useGarageStore((state) => state.garage);
  const hydrated = useGarageStore((state) => state.garageHydrated);
  const requireAuth = useRequireAuthAction();

  const completion = useMemo(
    () => seriesCompletion(series, new Set(Object.keys(garage))),
    [series, garage],
  );

  if (status === 'loading' || (status === 'signed-in' && !hydrated)) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2.5 w-full" />
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <div className="flex flex-col items-start gap-1 rounded-lg border border-dashed border-line p-3">
        <p className="text-sm text-muted">Track how much of this series is parked in your garage.</p>
        <Button
          variant="link"
          size="sm"
          onClick={() =>
            requireAuth(() => undefined, `Sign in to track your ${series.name} collection.`)
          }
        >
          Sign in to track progress
        </Button>
      </div>
    );
  }

  if (completion.total === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="hud text-[10px] text-muted">Your garage</p>
        <p className="font-mono text-xs font-bold tabular-nums text-fg">
          {formatNumber(completion.owned)}/{formatNumber(completion.total)} owned
        </p>
      </div>
      <ProgressBar
        value={completion.owned}
        max={completion.total}
        label={`${series.name} series progress`}
        valueText={`${completion.owned} of ${completion.total} cars owned`}
        tone={completion.complete ? 'success' : 'accent'}
        size="sm"
        segments={completion.total > 1 && completion.total <= 20 ? completion.total : undefined}
      />
      {completion.complete ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Series complete — master collector material.
        </p>
      ) : (
        <p className="text-xs text-muted">
          {pluralize(completion.total - completion.owned, 'car')} to go to complete the set.
        </p>
      )}
    </div>
  );
}

/**
 * Series / collection info card: series name + year, "CAR 03 OF 06", the series blurb, the
 * signed-in collector's garage progress for the series and a link to the series page.
 * Falls back to the product's own series fields when the series document is missing.
 */
export function SeriesInfoCard({ product, className }: SeriesInfoCardProps) {
  const seriesQuery = useSeries();
  const series = useMemo(
    () =>
      seriesQuery.data?.find(
        (entry) => entry.id === product.series || entry.slug === product.series,
      ) ?? null,
    [seriesQuery.data, product.series],
  );

  const name = series?.name ?? product.seriesName;
  const year = series?.year ?? product.year;
  const total = series?.totalCars ?? series?.carIds.length ?? 0;
  const slug = series?.slug ?? product.series;

  return (
    <DataState
      isLoading={seriesQuery.isLoading}
      isError={seriesQuery.isError}
      error={seriesQuery.error}
      onRetry={() => void seriesQuery.refetch()}
      errorCompact
      errorTitle="Collection file stalled"
      skeleton={<SeriesCardSkeleton />}
      loadingLabel="Loading series info…"
      className={className}
    >
      <article
        aria-labelledby="series-card-title"
        className={cn(
          'group relative flex h-full flex-col gap-5 overflow-hidden rounded-xl border border-line bg-card p-6 shadow-card transition-colors duration-300 ease-race hover:bg-card-hover',
          className,
        )}
      >
        <span aria-hidden="true" className="racing-stripe" />
        <div className="flex flex-col gap-2">
          <p className="hud flex items-center gap-2 text-[10px] text-muted">
            <Layers aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
            Collection file
          </p>
          <h3
            id="series-card-title"
            className="font-display text-xl font-bold uppercase tracking-display text-fg"
          >
            {name}
          </h3>
          {series?.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted">{series.description}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-line py-4">
          <HudReadout label="Series year" value={year} size="sm" />
          <HudReadout
            label="This car"
            value={
              total > 0
                ? `${padNumber(product.seriesNumber)} of ${pluralize(total, 'car')}`
                : padNumber(product.seriesNumber)
            }
            size="sm"
          />
        </div>

        {series ? <GarageProgress series={series} /> : null}

        <Button
          to={seriesPath(slug)}
          variant="outline"
          fullWidth
          rightIcon={<ArrowRight />}
          className="mt-auto"
          aria-label={`View the ${name} series`}
        >
          View series
        </Button>
      </article>
    </DataState>
  );
}
