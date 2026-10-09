import { useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MeetTheMachine } from '@/components/product-detail/MeetTheMachine';
import { ProductBreadcrumbs } from '@/components/product-detail/ProductBreadcrumbs';
import { ProductDetailSkeleton } from '@/components/product-detail/ProductDetailSkeleton';
import { ProductMedia } from '@/components/product-detail/ProductMedia';
import { ProductNotFound } from '@/components/product-detail/ProductNotFound';
import { ProductSummary } from '@/components/product-detail/ProductSummary';
import { RelatedCars } from '@/components/product-detail/RelatedCars';
import { SeriesInfoCard } from '@/components/product-detail/SeriesInfoCard';
import {
  buildProductDetailJsonLd,
  productBreadcrumbs,
  productDescription,
  productOgImage,
  productPageTitle,
} from '@/components/product-detail/productSeo';
import { ProductReviews } from '@/components/reviews/ProductReviews';
import { Container, SectionHeading } from '@/components/ui';
import { useProduct } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { buildBreadcrumbJsonLd, useDocumentMeta, useJsonLd, type DocumentMeta } from '@/lib/seo';
import type { Product } from '@/types';

const LOADING_META: DocumentMeta = {
  title: 'Car details',
  description: 'Specs, themed stats, collector details and reviews for this machine.',
};

const NOT_FOUND_META: DocumentMeta = {
  title: 'Machine not found',
  description: "This machine isn't in our garage. Browse the shop or search for another car.",
  noindex: true,
};

function ProductDetail({ product }: { product: Product }) {
  const reviewsRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const crumbs = useMemo(() => productBreadcrumbs(product), [product]);

  const scrollToReviews = useCallback(() => {
    const section = reviewsRef.current;
    if (!section) return;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  }, [reduceMotion]);

  return (
    <div className="flex flex-col gap-16 lg:gap-24">
      <div className="flex flex-col gap-6">
        <ProductBreadcrumbs items={crumbs} />
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            <div className="lg:sticky lg:top-24">
              <ErrorBoundary label="Gallery" resetKeys={[product.id]}>
                <ProductMedia key={product.id} product={product} />
              </ErrorBoundary>
            </div>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <ErrorBoundary label="Car details" resetKeys={[product.id]}>
              <ProductSummary product={product} onReviewsClick={scrollToReviews} />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      <section aria-labelledby="machine-title" className="flex flex-col gap-8">
        <SectionHeading
          id="machine-title"
          eyebrow="TELEMETRY"
          title="Meet the machine"
          description="Top speed, power and collector ratings — dialled in for the garage."
        />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <ErrorBoundary label="Machine stats" resetKeys={[product.id]}>
              <MeetTheMachine product={product} className="h-full" />
            </ErrorBoundary>
          </div>
          <div className="min-w-0 lg:col-span-4">
            <ErrorBoundary label="Collection info" resetKeys={[product.id]}>
              <SeriesInfoCard product={product} className="h-full" />
            </ErrorBoundary>
          </div>
        </div>
      </section>

      <ErrorBoundary label="Related cars" resetKeys={[product.id]}>
        <RelatedCars product={product} />
      </ErrorBoundary>

      <ErrorBoundary label="Reviews" resetKeys={[product.id]}>
        <ProductReviews ref={reviewsRef} product={product} />
      </ErrorBoundary>
    </div>
  );
}

/**
 * Product detail — `/product/:slug` (spec §5.4). Gallery + summary, "Meet the Machine" stats,
 * series card, related cars and reviews. Unknown slugs render an in-page "not in our garage"
 * panel (noindex). SEO: dynamic title/description/OG image + Product and Breadcrumb JSON-LD.
 */
export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const productQuery = useProduct(slug);
  const product = productQuery.data ?? null;
  const notFound = !slug || (productQuery.isSuccess && product === null);
  const failed = productQuery.isError && !product;

  const meta = useMemo<DocumentMeta>(() => {
    if (product) {
      return {
        title: productPageTitle(product),
        description: productDescription(product),
        image: productOgImage(product),
        type: 'product',
      };
    }
    return notFound ? NOT_FOUND_META : LOADING_META;
  }, [product, notFound]);
  useDocumentMeta(meta);

  const productJsonLd = useMemo(
    () => (product ? buildProductDetailJsonLd(product) : null),
    [product],
  );
  const breadcrumbJsonLd = useMemo(
    () => (product ? buildBreadcrumbJsonLd(productBreadcrumbs(product)) : null),
    [product],
  );
  useJsonLd('product', productJsonLd);
  useJsonLd('breadcrumbs', breadcrumbJsonLd);

  return (
    <Container className="py-6 sm:py-8 lg:py-10">
      {failed ? <h1 className="sr-only">Car details</h1> : null}
      <DataState
        isLoading={Boolean(slug) && productQuery.isLoading}
        isError={failed}
        error={productQuery.error}
        onRetry={() => void productQuery.refetch()}
        errorTitle="Engine trouble"
        isEmpty={notFound}
        empty={<ProductNotFound slug={slug} />}
        skeleton={<ProductDetailSkeleton />}
        loadingLabel="Rolling the machine out…"
      >
        {() =>
          // Keyed by car: moving to another car (related rail, Back) starts every section fresh —
          // no review draft, "show more" or gallery state carried over from the previous car.
          product ? <ProductDetail key={product.id} product={product} /> : null
        }
      </DataState>
    </Container>
  );
}
