import { Crown, Flag } from 'lucide-react';
import { useEffect, useId, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getBadge } from '@/config/gamification';
import { garagePath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { Product, Series } from '@/types';
import { MissingCarList } from './MissingCarList';
import { SeriesProgressMeter } from './SeriesProgressMeter';
import { TrackProgressBanner } from './TrackProgressBanner';
import { missingSeriesCars, seriesProgress } from './seriesProgress';
import type { OwnedProductIds } from './useOwnedProductIds';

export interface SeriesProgressPanelProps {
  series: Series;
  /** All catalogue products (used to resolve the missing cars). */
  products: readonly Product[];
  owned: OwnedProductIds;
  className?: string;
}

/**
 * Series completion for the signed-in collector: "x/y in your garage", the missing cars with
 * quick actions, or a celebration when complete. Signed out → sign-in prompt.
 */
export function SeriesProgressPanel({
  series,
  products,
  owned,
  className,
}: SeriesProgressPanelProps) {
  const headingId = `series-progress-${useId().replace(/:/g, '')}`;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ownedIds = owned.ownedIds;
  const missing = useMemo(
    () => (ownedIds ? missingSeriesCars(series, products, ownedIds) : []),
    [series, products, ownedIds],
  );

  // A parked car leaves the "still missing" list together with the button that had focus —
  // hand keyboard focus to the panel heading instead of dropping it on <body>.
  const previousMissing = useRef(missing.length);
  useEffect(() => {
    const shrank = missing.length < previousMissing.current;
    previousMissing.current = missing.length;
    if (shrank && (document.activeElement === document.body || !document.activeElement)) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [missing.length]);

  if (owned.isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        className={cn('rounded-2xl border border-line bg-card p-5 sm:p-6', className)}
      >
        <span className="sr-only">Checking your garage…</span>
        <Skeleton variant="text" className="w-40" />
        <Skeleton className="mt-4 h-2.5 rounded-full" />
        <Skeleton className="mt-6 h-20 rounded-xl" />
      </div>
    );
  }

  if (!owned.isSignedIn) {
    return (
      <TrackProgressBanner
        className={className}
        title={`Track your ${series.name} set`}
        description="Sign in to see how many of these cars are parked in your garage and which ones you still need."
      />
    );
  }

  if (owned.isError || !owned.ownedIds) {
    return (
      <ErrorState
        compact
        title="GARAGE OFFLINE"
        message="We couldn't load your garage, so your series progress is hidden for now."
        onRetry={owned.refetch}
        className={className}
      />
    );
  }

  const progress = seriesProgress(series, owned.ownedIds);
  if (!progress || progress.total === 0) return null;
  const masterCollector = getBadge('master-collector');

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card sm:p-6',
        progress.complete ? 'border-success/50' : 'border-line',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          progress.complete ? 'bg-success' : 'bg-accent',
        )}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="hud flex items-center gap-2 text-muted">
            <Flag aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
            Series completion
          </p>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 text-xl text-fg sm:text-2xl"
          >
            {progress.complete
              ? 'Series complete'
              : `${pluralize(progress.total - progress.owned, 'car')} to go`}
          </h2>
          <SeriesProgressMeter
            progress={progress}
            seriesName={series.name}
            size="md"
            className="mt-4 max-w-xl"
          />
        </div>
        <Button to={garagePath()} variant="secondary" size="sm" className="self-start lg:self-end">
          Open My Garage
        </Button>
      </div>

      {progress.complete ? (
        <p className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-fg">
          <Crown aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-highlight-ink" />
          <span>
            Every car in {series.name} is accounted for. Completing a series earns the{' '}
            <strong className="font-semibold">{masterCollector.title}</strong> badge (+
            {masterCollector.xpReward} XP) the first time.
          </span>
        </p>
      ) : missing.length > 0 ? (
        <div className="mt-6">
          <h3 className="hud text-muted">Still missing</h3>
          <MissingCarList
            cars={missing}
            label={`Cars missing from your ${series.name} set`}
            className="mt-3"
          />
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted">
          The remaining cars of this series aren’t in the shop right now — watch for restocks.
        </p>
      )}
    </section>
  );
}
