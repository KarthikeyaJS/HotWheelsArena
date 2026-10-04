import { useMemo } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GridTelemetry } from '@/components/shop/GridTelemetry';
import { ProductBrowser } from '@/components/shop/ProductBrowser';
import { ShopEmptyState } from '@/components/shop/ShopEmptyState';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { ShopViewTabs } from '@/components/shop/ShopViewTabs';
import { matchesBase, priceBounds } from '@/components/shop/filtering';
import { Chip } from '@/components/ui/Chip';
import { Container } from '@/components/ui/Container';
import { ROUTES, shopPath } from '@/config/routes';
import {
  PAGE_SIZE,
  SHOP_VIEWS,
  SORT_OPTIONS,
  getCategoryHeader,
  getShopView,
  type ShopViewId,
} from '@/config/shop';
import { CATEGORY_DISPLAY } from '@/config/site';
import { useProductFilters } from '@/hooks/useProductFilters';
import { useProducts } from '@/hooks/useProducts';
import { formatINR, formatNumber } from '@/lib/format';
import { buildSearchIndex, searchProducts } from '@/lib/search';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd } from '@/lib/seo';

/** /shop — every car, eight sub-views, the filter rail and the collectible grid. */
export default function ShopPage() {
  const controller = useProductFilters();
  const { filters, q } = controller;
  const productsQuery = useProducts();
  const products = productsQuery.data;

  const view = getShopView(filters.view);
  const categoryOnly = filters.category !== null && filters.view === 'all';
  const header = categoryOnly && filters.category ? getCategoryHeader(filters.category) : view;
  const trailLabel =
    filters.view !== 'all'
      ? view.label
      : filters.category
        ? CATEGORY_DISPLAY[filters.category].name
        : null;
  const canonical =
    filters.view !== 'all'
      ? shopPath({ view: filters.view })
      : filters.category
        ? shopPath({ category: filters.category })
        : ROUTES.shop;

  useDocumentMeta({ title: header.metaTitle, description: header.description, canonical });

  const breadcrumbs = useMemo(
    () => [
      { label: 'Home', to: ROUTES.home },
      { label: 'Shop', to: ROUTES.shop },
      ...(trailLabel ? [{ label: trailLabel, to: canonical }] : []),
    ],
    [canonical, trailLabel],
  );
  useJsonLd(
    'breadcrumbs',
    buildBreadcrumbJsonLd(breadcrumbs.map((crumb) => ({ name: crumb.label, path: crumb.to }))),
  );

  const searchIndex = useMemo(() => (products ? buildSearchIndex(products) : null), [products]);
  const base = useMemo(() => {
    if (!products) return undefined;
    return q && searchIndex ? searchProducts(searchIndex, q) : products;
  }, [products, q, searchIndex]);

  const viewCounts = useMemo(() => {
    if (!products) return undefined;
    const counts: Partial<Record<ShopViewId, number>> = {};
    for (const entry of SHOP_VIEWS) counts[entry.id] = products.filter(entry.predicate).length;
    return counts;
  }, [products]);

  const telemetry = useMemo(() => {
    const inView = (base ?? []).filter((product) => matchesBase(product, filters));
    const makes = new Set(inView.map((product) => product.make.trim().toLowerCase()));
    const bounds = priceBounds(inView);
    return [
      { label: 'In view', value: formatNumber(inView.length), tone: 'accent' as const },
      { label: 'Makes', value: formatNumber(makes.size) },
      { label: 'From', value: bounds ? formatINR(bounds.min) : '—' },
    ];
  }, [base, filters]);

  const isError = productsQuery.isError && !products;
  const clearAll = (): void => controller.clearAll({ query: true });

  return (
    <>
      <ShopHeader
        breadcrumbs={trailLabel ? breadcrumbs : breadcrumbs.slice(0, 2)}
        eyebrow={header.eyebrow}
        title={header.title}
        description={header.description}
        aside={
          <GridTelemetry
            items={telemetry}
            loading={productsQuery.isPending}
            className="hidden sm:block"
          />
        }
      >
        <ShopViewTabs
          views={SHOP_VIEWS}
          active={categoryOnly ? null : filters.view}
          hrefFor={controller.hrefForView}
          counts={viewCounts}
        />
      </ShopHeader>

      <Container className="py-8 lg:py-10">
        <ErrorBoundary label="The shop grid" resetKeys={[filters, q]}>
          <ProductBrowser
            idPrefix="shop"
            products={base}
            isLoading={productsQuery.isPending}
            isError={isError}
            error={productsQuery.error}
            onRetry={() => void productsQuery.refetch()}
            controller={controller}
            sortOptions={SORT_OPTIONS}
            pageSize={PAGE_SIZE}
            gridLabel={trailLabel ?? 'All cars'}
            onClearAll={clearAll}
            leadingChips={
              q ? (
                <li className="max-w-full">
                  <Chip
                    variant="outline"
                    onRemove={() => controller.setQuery('')}
                    removeLabel={`Remove search: ${q}`}
                    className="max-w-full bg-card/60"
                  >
                    <span className="text-muted">Search</span>
                    <span aria-hidden="true" className="px-1 text-muted">
                      ·
                    </span>
                    &ldquo;{q}&rdquo;
                  </Chip>
                </li>
              ) : null
            }
            renderEmpty={({ filtered }) =>
              filtered || q ? (
                <ShopEmptyState
                  title="No machines on this track"
                  description="Nothing on the grid matches these filters. Ease off a filter or two, or clear them to see every car in this view."
                  onClear={clearAll}
                  browseAll={filters.view !== 'all'}
                />
              ) : (
                <ShopEmptyState
                  title="This bay is empty"
                  description="No cars are parked in this view right now. New machines roll in with every drop."
                  browseAll
                />
              )
            }
          />
        </ErrorBoundary>
      </Container>
    </>
  );
}
