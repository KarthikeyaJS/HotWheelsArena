import { ArrowRight, CarFront } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { HorizontalRail, ProductCard, ProductCardSkeleton } from '@/components/product';
import { Button, EmptyState, SectionHeading } from '@/components/ui';
import { shopPath } from '@/config/routes';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/cn';
import { getRelatedProducts } from '@/lib/product';
import type { Product } from '@/types';

export interface RelatedCarsProps {
  product: Product;
  /** Max cars in the rail (default 8). */
  limit?: number;
  className?: string;
}

const HEADING_ID = 'related-cars-title';

function RailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2, 3].map((index) => (
        <ProductCardSkeleton
          key={index}
          variant="compact"
          className={cn('w-[clamp(15rem,74vw,18.5rem)] shrink-0', index > 0 && 'hidden sm:flex')}
        />
      ))}
    </div>
  );
}

/**
 * "More machines like this" carousel: `getRelatedProducts` (same series, category, make,
 * rarity) over the cached catalogue, rendered as compact ProductCards in a HorizontalRail.
 */
export function RelatedCars({ product, limit = 8, className }: RelatedCarsProps) {
  const productsQuery = useProducts();
  const related = useMemo(
    () => getRelatedProducts(product, productsQuery.data ?? [], limit),
    [product, productsQuery.data, limit],
  );

  const heading = (
    <SectionHeading
      id={HEADING_ID}
      eyebrow="SAME GRID"
      title="More machines like this"
      description="Same series, class or maker — line them up in your garage."
    />
  );

  const viewAll = (
    <Button
      variant="link"
      to={shopPath({ category: product.category })}
      rightIcon={<ArrowRight />}
      aria-label="View all cars in this class"
    >
      View all
    </Button>
  );

  return (
    <section aria-labelledby={HEADING_ID} className={cn('flex flex-col gap-6', className)}>
      {productsQuery.isError && !productsQuery.isLoading ? heading : null}
      <DataState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error}
        onRetry={() => void productsQuery.refetch()}
        isEmpty={related.length === 0}
        errorCompact
        errorTitle="Related cars stalled"
        loadingLabel="Loading related cars…"
        skeleton={
          <div className="flex flex-col gap-6">
            {heading}
            <RailSkeleton />
          </div>
        }
        empty={
          <div className="flex flex-col gap-6">
            {heading}
            <EmptyState
              icon={<CarFront />}
              title="No close relatives on the grid"
              description="This machine is one of a kind for now — explore the full garage for more."
              action={
                <Button to={shopPath()} variant="outline" rightIcon={<ArrowRight />}>
                  Explore the garage
                </Button>
              }
              size="sm"
            />
          </div>
        }
      >
        {() => (
          <HorizontalRail
            label={`Cars related to ${product.name}`}
            title={heading}
            action={viewAll}
            items={related}
            getItemKey={(item) => item.id}
            renderItem={(item) => (
              <ProductCard product={item} variant="compact" headingAs="h3" />
            )}
          />
        )}
      </DataState>
    </section>
  );
}
