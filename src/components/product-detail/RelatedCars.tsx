import { ArrowRight, CarFront } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { HorizontalRail, ProductCard, ProductCardSkeleton } from '@/components/product';
import { Button, EmptyState, SectionHeading } from '@/components/ui';
import { shopPath } from '@/config/routes';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
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
 * The section heading sits above the rail (full width on phones); the rail header carries a
 * small count line next to its prev/next controls.
 */
export function RelatedCars({ product, limit = 8, className }: RelatedCarsProps) {
  const productsQuery = useProducts();
  const related = useMemo(
    () => getRelatedProducts(product, productsQuery.data ?? [], limit),
    [product, productsQuery.data, limit],
  );

  return (
    <section aria-labelledby={HEADING_ID} className={cn('flex flex-col gap-6', className)}>
      <SectionHeading
        id={HEADING_ID}
        eyebrow="SAME GRID"
        title="More machines like this"
        description="Same series, class or maker — line them up in your garage."
        action={
          <Button
            variant="link"
            to={shopPath({ category: product.category })}
            rightIcon={<ArrowRight />}
            aria-label="View all cars in this class"
          >
            View all
          </Button>
        }
      />
      <DataState
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        error={productsQuery.error}
        onRetry={() => void productsQuery.refetch()}
        isEmpty={related.length === 0}
        errorCompact
        errorTitle="Related cars stalled"
        loadingLabel="Loading related cars…"
        skeleton={<RailSkeleton />}
        empty={
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
        }
      >
        {() => (
          <HorizontalRail
            label={`Cars related to ${product.name}`}
            title={
              <p className="hud text-xs text-muted">
                <span className="text-fg">{padNumber(related.length)}</span>{' '}
                {related.length === 1 ? 'machine' : 'machines'} · swipe or drag
              </p>
            }
            items={related}
            getItemKey={(item) => item.id}
            renderItem={(item) => <ProductCard product={item} variant="compact" headingAs="h3" />}
          />
        )}
      </DataState>
    </section>
  );
}
