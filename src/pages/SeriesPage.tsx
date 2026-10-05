import { ArrowRight, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SeriesFactsPanel } from '@/components/collections/SeriesFactsPanel';
import { SeriesNotFound } from '@/components/collections/SeriesNotFound';
import { SeriesPageSkeleton } from '@/components/collections/SeriesPageSkeleton';
import { SeriesProgressPanel } from '@/components/collections/SeriesProgressPanel';
import { seriesCars, seriesTotalCars } from '@/components/collections/seriesProgress';
import { useOwnedProductIds } from '@/components/collections/useOwnedProductIds';
import { PageHeader } from '@/components/content/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES, productPath, seriesPath, shopPath } from '@/config/routes';
import { useProducts } from '@/hooks/useProducts';
import { useSeriesBySlug } from '@/hooks/useSeries';
import { absoluteUrl } from '@/config/site';
import { pluralize } from '@/lib/format';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd, type JsonLd } from '@/lib/seo';

/** /collections/:slug — one series: header, completion progress + missing cars, and its cars. */
export default function SeriesPage() {
  const { slug } = useParams<{ slug: string }>();
  const seriesQuery = useSeriesBySlug(slug);
  const productsQuery = useProducts();
  const owned = useOwnedProductIds();
  const series = seriesQuery.data;
  const notFound = series === null;

  const cars = useMemo(
    () => (series && productsQuery.data ? seriesCars(series, productsQuery.data) : []),
    [series, productsQuery.data],
  );

  useDocumentMeta(
    series
      ? {
          title: `${series.name} ${series.year}`,
          description:
            series.description ||
            `${series.name} (${series.year}) — ${pluralize(seriesTotalCars(series), 'car')} to collect.`,
        }
      : notFound
        ? {
            title: 'Series not found',
            description: 'This collection is not on the grid. Browse every series instead.',
            noindex: true,
          }
        : { title: 'Collections', description: 'Every die-cast series as a collectible set.' },
  );

  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', to: ROUTES.home },
      { label: 'Collections', to: ROUTES.collections },
      ...(series
        ? [{ label: series.name, to: seriesPath(series.slug) }]
        : notFound
          ? [{ label: 'Not found', to: seriesPath(slug ?? '') }]
          : []),
    ],
    [series, notFound, slug],
  );

  useJsonLd(
    'breadcrumbs',
    series
      ? buildBreadcrumbJsonLd(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.to })))
      : null,
  );
  const itemList = useMemo<JsonLd | null>(
    () =>
      series && cars.length > 0
        ? {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${series.name} ${series.year}`,
            numberOfItems: cars.length,
            itemListElement: cars.map((car, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: absoluteUrl(productPath(car.slug)),
              name: car.name,
            })),
          }
        : null,
    [series, cars],
  );
  useJsonLd('series-items', itemList);

  if (seriesQuery.isPending) return <SeriesPageSkeleton />;

  if (seriesQuery.isError && series === undefined) {
    return (
      <Container className="py-16 lg:py-24">
        <h1 className="sr-only">Collection</h1>
        <ErrorState
          title="PIT LANE CLOSED"
          error={seriesQuery.error}
          onRetry={() => void seriesQuery.refetch()}
          retrying={seriesQuery.isFetching}
        />
      </Container>
    );
  }

  if (!series) {
    return (
      <>
        <PageHeader
          breadcrumbs={breadcrumbs}
          eyebrow="Error 404 · off track"
          eyebrowIcon={<Layers />}
          title="Series not found"
        />
        <SeriesNotFound slug={slug} />
      </>
    );
  }

  const total = seriesTotalCars(series);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        eyebrow={`${series.year} series · ${pluralize(total, 'car')}`}
        eyebrowIcon={<Layers />}
        title={series.name}
        lead={series.description || undefined}
        aside={<SeriesFactsPanel series={series} cars={cars} />}
      />

      <Container className="flex flex-col gap-12 py-10 lg:gap-16 lg:py-14">
        <ErrorBoundary label="Series progress" resetKeys={[series.id]}>
          <SeriesProgressPanel series={series} products={productsQuery.data ?? []} owned={owned} />
        </ErrorBoundary>

        <section aria-labelledby="series-cars-title">
          <SectionHeading
            id="series-cars-title"
            eyebrow="The line-up"
            title={`Cars in ${series.name}`}
            description="In series order — the number on each card is its position in the set."
            action={
              <Button
                to={shopPath({ series: series.slug })}
                variant="outline"
                rightIcon={<ArrowRight />}
              >
                Filter in the shop
              </Button>
            }
            className="mb-8"
          />
          <ErrorBoundary label="Series cars" resetKeys={[series.id]}>
            <DataState
              isLoading={false}
              isError={productsQuery.isError && !productsQuery.data}
              error={productsQuery.error}
              onRetry={() => void productsQuery.refetch()}
              errorTitle="ENGINE TROUBLE"
            >
              <ProductGrid
                products={cars}
                isLoading={productsQuery.isPending}
                skeletonCount={Math.min(Math.max(total, 4), 8)}
                columns={4}
                priorityCount={4}
                label={`Cars in ${series.name}`}
                emptyState={
                  <EmptyState
                    icon={<Layers />}
                    title="No cars from this series in the shop"
                    description="This set is between restocks. Explore the rest of the garage meanwhile."
                    titleAs="h3"
                    action={
                      <Button to={shopPath()} rightIcon={<ArrowRight />}>
                        Explore the shop
                      </Button>
                    }
                  />
                }
              />
            </DataState>
          </ErrorBoundary>
        </section>
      </Container>
    </>
  );
}
