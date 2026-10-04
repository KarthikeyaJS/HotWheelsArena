import { ArrowRight, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ProductCardSkeleton, ProductGrid } from '@/components/product';
import { SEARCH_SUGGESTIONS } from '@/components/search/paletteModel';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { searchPath, shopPath } from '@/config/routes';
import type { Product } from '@/types';
import { CategoryShortcuts } from './CategoryShortcuts';
import { QueryChipLink } from './QueryChipLink';
import { RecentSearches } from './RecentSearches';

export interface SearchLandingProps {
  products: readonly Product[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry: () => void;
  /** Saves a chosen query to recent searches. */
  onPick: (query: string) => void;
}

const FEATURED_LIMIT = 8;

/** Blank-query search page: recent + popular searches, category shortcuts, featured cars. */
export function SearchLanding({
  products,
  isLoading,
  isError,
  error,
  onRetry,
  onPick,
}: SearchLandingProps) {
  const featured = useMemo(() => {
    const list = (products ?? []).filter((product) => product.isFeatured);
    return (list.length > 0 ? list : [...(products ?? [])]).slice(0, FEATURED_LIMIT);
  }, [products]);

  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-10 lg:col-span-5">
          <section aria-labelledby="search-recent-heading">
            <SectionHeading
              id="search-recent-heading"
              eyebrow="Pit log"
              title="Recent searches"
              size="sm"
            />
            <RecentSearches className="mt-5" onPick={onPick} />
          </section>
          <section aria-labelledby="search-popular-heading">
            <SectionHeading
              id="search-popular-heading"
              eyebrow="On the radar"
              title="Popular searches"
              size="sm"
            />
            <ul className="mt-5 flex flex-wrap gap-2">
              {SEARCH_SUGGESTIONS.map((query) => (
                <li key={query}>
                  <QueryChipLink
                    to={searchPath(query)}
                    onSelect={() => onPick(query)}
                    icon={<TrendingUp />}
                  >
                    {query}
                  </QueryChipLink>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section aria-labelledby="search-categories-heading" className="lg:col-span-7">
          <SectionHeading
            id="search-categories-heading"
            eyebrow="Shortcuts"
            title="Browse by class"
            size="sm"
          />
          <CategoryShortcuts className="mt-5" products={products} />
        </section>
      </div>

      <section aria-labelledby="search-featured-heading">
        <SectionHeading
          id="search-featured-heading"
          eyebrow="Featured collection"
          title="Featured machines"
          description="Hand-picked from the garage while you decide what to hunt."
          action={
            <Button variant="outline" to={shopPath()} rightIcon={<ArrowRight />}>
              View all cars
            </Button>
          }
        />
        <div className="mt-8">
          <ErrorBoundary label="Featured machines">
            <DataState
              isLoading={isLoading && !products}
              isError={isError}
              error={error}
              onRetry={onRetry}
              isEmpty={featured.length === 0}
              errorCompact
              loadingLabel="Loading featured machines…"
              skeleton={
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              }
            >
              {() => <ProductGrid products={featured} columns={4} label="Featured machines" />}
            </DataState>
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );
}
