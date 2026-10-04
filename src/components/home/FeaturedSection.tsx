import { ArrowRight, Star } from 'lucide-react';
import { DataState } from '@/components/common/DataState';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { shopPath } from '@/config/routes';
import { productSelectors, useProducts } from '@/hooks/useProducts';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';

function FeaturedSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** FEATURED COLLECTION — the `isFeatured` cars in the collectible grid. */
export function FeaturedSection() {
  const featured = useProducts(productSelectors.featured);
  const headingId = sectionHeadingId(HOME_SECTION_IDS.featured);
  const cars = featured.data ?? [];

  return (
    <HomeSection id={HOME_SECTION_IDS.featured} className="border-y border-line/60 bg-surface/40">
      <SectionHeading
        id={headingId}
        index={4}
        eyebrow="Curated by the pit crew"
        title="Featured collection"
        description="The castings every collector wants on the shelf — picked for detail, livery and rarity."
        action={
          <Button variant="outline" to={shopPath()} rightIcon={<ArrowRight />}>
            Shop all cars
          </Button>
        }
      />
      <div className="mt-8 lg:mt-10">
        <DataState
          isLoading={featured.isLoading}
          isError={featured.isError}
          error={featured.error}
          onRetry={() => void featured.refetch()}
          errorTitle="Showroom lights are out"
          errorCompact
          isEmpty={cars.length === 0}
          skeleton={<FeaturedSkeleton />}
          loadingLabel="Polishing the featured cars…"
          empty={
            <EmptyState
              icon={<Star />}
              title="The showroom is being restocked"
              description="Featured picks return shortly. The full garage is open in the meantime."
              action={
                <Button variant="secondary" to={shopPath()}>
                  Browse all cars
                </Button>
              }
            />
          }
        >
          {() => <ProductGrid products={cars} columns={4} label="Featured collection" />}
        </DataState>
      </div>
    </HomeSection>
  );
}
