import { ArrowRight, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SeriesCard } from '@/components/collections/SeriesCard';
import { SeriesGridSkeleton } from '@/components/collections/SeriesGridSkeleton';
import { TrackProgressBanner } from '@/components/collections/TrackProgressBanner';
import {
  buildSeriesCards,
  completedSeriesCount,
  seriesYearSpan,
} from '@/components/collections/seriesProgress';
import { useOwnedProductIds } from '@/components/collections/useOwnedProductIds';
import { PageHeader } from '@/components/content/PageHeader';
import { HudPanel } from '@/components/effects/HudPanel';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { HudReadout } from '@/components/ui/HudReadout';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES, shopPath } from '@/config/routes';
import { useProducts } from '@/hooks/useProducts';
import { useSeries } from '@/hooks/useSeries';
import { formatNumber } from '@/lib/format';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

const BREADCRUMBS = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Collections', to: ROUTES.collections },
] as const;

/** /collections — every series as a collectible set, newest first, with garage progress. */
export default function CollectionsPage() {
  useDocumentMeta({
    title: 'Collections — Series & Sets',
    description:
      'Every die-cast series as a collectible set — HW Exotics, Legends, Turbo, Off-Road, Rescue and more. Track how many cars of each series are in your garage.',
  });
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(BREADCRUMBS.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  const seriesQuery = useSeries();
  const productsQuery = useProducts();
  const owned = useOwnedProductIds();

  const cards = useMemo(
    () =>
      seriesQuery.data
        ? buildSeriesCards(seriesQuery.data, productsQuery.data ?? [], owned.ownedIds)
        : [],
    [seriesQuery.data, productsQuery.data, owned.ownedIds],
  );

  const isLoading = seriesQuery.isPending || (productsQuery.isPending && !productsQuery.isError);
  const totalCars = cards.reduce((sum, card) => sum + card.totalCars, 0);
  const yearSpan = seriesYearSpan(seriesQuery.data ?? []);
  const completed = completedSeriesCount(cards);

  const telemetry = (
    <HudPanel title="Collection telemetry" meta={yearSpan ?? '—'} className="bg-card">
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton variant="text" className="w-14" />
              <Skeleton className="h-8 w-12 rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <HudReadout label="Series" value={formatNumber(cards.length)} />
          <HudReadout label="Cars" value={formatNumber(totalCars)} />
          {owned.isSignedIn && owned.ownedIds ? (
            <HudReadout
              label="Completed"
              value={`${formatNumber(completed)}/${formatNumber(cards.length)}`}
              tone="accent"
            />
          ) : (
            <HudReadout label="Years" value={yearSpan ?? '—'} size="sm" />
          )}
        </div>
      )}
    </HudPanel>
  );

  return (
    <>
      <PageHeader
        breadcrumbs={BREADCRUMBS}
        eyebrow="Series & sets"
        eyebrowIcon={<Layers />}
        title="Collections"
        lead="Every series is a set waiting to be completed. Pick a line-up, see which cars are already parked in your garage and hunt down the rest."
        aside={telemetry}
      />

      <Container className="flex flex-col gap-8 py-10 lg:py-14">
        {!owned.isSignedIn && !owned.isLoading ? <TrackProgressBanner /> : null}

        <section aria-label="All series">
          <ErrorBoundary label="Collections">
            <DataState
              isLoading={isLoading}
              isError={seriesQuery.isError && !seriesQuery.data}
              error={seriesQuery.error}
              onRetry={() => void seriesQuery.refetch()}
              errorTitle="PIT LANE CLOSED"
              isEmpty={cards.length === 0}
              loadingLabel="Loading collections…"
              skeleton={<SeriesGridSkeleton />}
              empty={
                <EmptyState
                  icon={<Layers />}
                  title="No series on the grid yet"
                  description="New collections roll in with every drop. Meanwhile, every car is waiting in the shop."
                  titleAs="h3"
                  action={
                    <Button to={shopPath()} rightIcon={<ArrowRight />}>
                      Explore the shop
                    </Button>
                  }
                />
              }
            >
              {() => (
                <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {cards.map((card, index) => (
                    <li key={card.series.id} className="min-w-0">
                      <SeriesCard
                        data={card}
                        priority={index < 3}
                        progressLoading={owned.isSignedIn && owned.isLoading}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </ErrorBoundary>
          {owned.isError ? (
            <p role="alert" className="mt-4 text-sm text-danger-ink">
              We couldn’t load your garage, so progress is hidden.{' '}
              <button
                type="button"
                onClick={owned.refetch}
                className="font-semibold underline underline-offset-4 hover:text-fg active:opacity-80"
              >
                Try again
              </button>
            </p>
          ) : null}
        </section>
      </Container>
    </>
  );
}
