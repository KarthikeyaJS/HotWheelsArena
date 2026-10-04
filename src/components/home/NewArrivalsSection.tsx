import { ArrowRight, Sparkles } from 'lucide-react';
import { DataState } from '@/components/common/DataState';
import { HorizontalRail } from '@/components/product/HorizontalRail';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { shopPath } from '@/config/routes';
import { productSelectors, useProducts } from '@/hooks/useProducts';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';

const RAIL_ITEM_WIDTH = 'clamp(15rem, 74vw, 18.5rem)';

function RailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden sm:gap-5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="shrink-0" style={{ width: RAIL_ITEM_WIDTH }}>
          <ProductCardSkeleton variant="compact" />
        </div>
      ))}
    </div>
  );
}

/**
 * JUST OFF THE TRACK — the `isNew` cars in a drag / scroll-snap rail; cards accelerate in from
 * the side the first time the rail is seen (HorizontalRail's `accelerateIn`).
 */
export function NewArrivalsSection() {
  const newArrivals = useProducts(productSelectors.newArrivals);
  const headingId = sectionHeadingId(HOME_SECTION_IDS.newArrivals);
  const cars = newArrivals.data ?? [];

  return (
    <HomeSection id={HOME_SECTION_IDS.newArrivals}>
      <SectionHeading
        id={headingId}
        index={3}
        eyebrow="New arrivals"
        title="Just off the track"
        description="Fresh castings, still warm from the transporter. Drag, swipe or use the arrows to browse."
        action={
          <Button variant="link" to={shopPath({ view: 'new' })} rightIcon={<ArrowRight />}>
            All new drops
          </Button>
        }
      />
      <div className="mt-8 lg:mt-10">
        <DataState
          isLoading={newArrivals.isLoading}
          isError={newArrivals.isError}
          error={newArrivals.error}
          onRetry={() => void newArrivals.refetch()}
          errorTitle="Transporter stalled"
          errorCompact
          isEmpty={cars.length === 0}
          skeleton={<RailSkeleton />}
          loadingLabel="Unloading the latest arrivals…"
          empty={
            <EmptyState
              icon={<Sparkles />}
              title="No fresh drops this lap"
              description="The next transporter is on its way — browse the full garage meanwhile."
              action={
                <Button variant="secondary" to={shopPath()}>
                  Browse all cars
                </Button>
              }
            />
          }
        >
          {() => (
            <HorizontalRail
              label="Just off the track"
              items={cars}
              itemWidth={RAIL_ITEM_WIDTH}
              renderItem={(product) => <ProductCard product={product} variant="compact" />}
            />
          )}
        </DataState>
      </div>
    </HomeSection>
  );
}
