import { Gem, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HorizontalRail } from '@/components/product/HorizontalRail';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES, shopPath } from '@/config/routes';
import { productSelectors, useProducts } from '@/hooks/useProducts';
import type { Product } from '@/types';

const RAIL_SIZE = 8;

/** Featured, in-stock cars first — a quick way to refuel an empty pit stop. */
function pickSuggestions(products: Product[]): Product[] {
  return productSelectors
    .featured(products)
    .filter((product) => product.stock > 0)
    .slice(0, RAIL_SIZE);
}

function RailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[0, 1, 2, 3].map((index) => (
        <ProductCardSkeleton
          key={index}
          variant="compact"
          className="w-[clamp(15rem,74vw,18.5rem)] shrink-0"
        />
      ))}
    </div>
  );
}

function SuggestionsRail() {
  const query = useProducts(pickSuggestions);
  const products = useMemo(() => query.data ?? [], [query.data]);
  if (query.isSuccess && products.length === 0) return null;

  const heading = (
    <SectionHeading id="refuel-title" eyebrow="REFUEL" title="Featured in the garage" size="sm" />
  );

  return (
    <section aria-labelledby="refuel-title" className="mt-14 flex flex-col gap-6">
      {query.isError ? heading : null}
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorCompact
        loadingLabel="Loading featured cars…"
        skeleton={
          <div className="flex flex-col gap-6">
            {heading}
            <RailSkeleton />
          </div>
        }
      >
        {() => (
          <HorizontalRail
            label="Featured cars"
            title={heading}
            items={products}
            renderItem={(product) => (
              <ProductCard product={product} variant="compact" headingAs="h3" />
            )}
          />
        )}
      </DataState>
    </section>
  );
}

/** "Your pit stop is empty" + shop / vault CTAs + a featured rail to refuel from. */
export function EmptyCart() {
  return (
    <div>
      <EmptyState
        size="lg"
        titleAs="h2"
        icon={<ShoppingCart />}
        title="Your pit stop is empty"
        description="No machines on the lift yet. Roll into the garage and pick your next ride — or hunt something rare in the Vault."
        action={
          <>
            <Button to={shopPath()} size="lg">
              Explore the garage
            </Button>
            <Button to={ROUTES.vault} variant="outline" size="lg" leftIcon={<Gem />}>
              Visit the Vault
            </Button>
          </>
        }
      />
      <ErrorBoundary label="Featured cars">
        <SuggestionsRail />
      </ErrorBoundary>
    </div>
  );
}
