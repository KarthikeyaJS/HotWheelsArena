import { TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SEARCH_SUGGESTIONS } from '@/components/search/paletteModel';
import { SearchInput } from '@/components/search/SearchInput';
import { ProductBrowser } from '@/components/shop/ProductBrowser';
import { QueryChipLink } from '@/components/shop/QueryChipLink';
import { SearchLanding } from '@/components/shop/SearchLanding';
import { SearchSuggestions } from '@/components/shop/SearchSuggestions';
import { ShopEmptyState } from '@/components/shop/ShopEmptyState';
import { ShopHeader } from '@/components/shop/ShopHeader';
import { Container } from '@/components/ui/Container';
import { ROUTES, searchPath } from '@/config/routes';
import {
  PAGE_SIZE,
  RECENT_SEARCH_IDLE_MS,
  SEARCH_DEBOUNCE_MS,
  SEARCH_SORT_OPTIONS,
} from '@/config/shop';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_FILTER_CONFIG, useProductFilters } from '@/hooks/useProductFilters';
import { useProducts } from '@/hooks/useProducts';
import { pluralize } from '@/lib/format';
import { buildSearchIndex, groupSuggestions, searchProducts } from '@/lib/search';
import { useDocumentMeta } from '@/lib/seo';
import { useRecentSearchStore } from '@/store/recentSearchStore';

const normalizeQuery = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** /search?q= — ranked results with the shop's rail + grid, Make → Model refinements. */
export default function SearchPage() {
  const controller = useProductFilters({ config: SEARCH_FILTER_CONFIG });
  const { q, setQuery } = controller;
  const productsQuery = useProducts();
  const products = productsQuery.data;
  const addRecent = useRecentSearchStore((state) => state.addRecent);

  const searchIndex = useMemo(() => (products ? buildSearchIndex(products) : null), [products]);
  const results = useMemo(
    () => (products && searchIndex ? (q ? searchProducts(searchIndex, q) : []) : undefined),
    [products, q, searchIndex],
  );
  const suggestions = useMemo(
    () => (products && q ? groupSuggestions(products, q, { maxMakes: 3, maxModels: 6 }) : []),
    [products, q],
  );

  useDocumentMeta({
    title: q ? `Search: ${q}` : 'Search the garage',
    description: q
      ? `Die-cast cars matching “${q}”: filter by make, series, rarity and price.`
      : 'Search every die-cast machine in the garage by make, model, series, colour or rarity.',
    canonical: ROUTES.search,
    noindex: true,
  });

  /* Inline field ↔ ?q= (debounced). `lastWritten` tells our own URL writes apart from outside
     changes (back button, palette, suggestion links), which reset the draft. */
  const [draft, setDraft] = useState(q);
  const lastWrittenRef = useRef(q);
  useEffect(() => {
    if (q !== lastWrittenRef.current) {
      lastWrittenRef.current = q;
      setDraft(q);
    }
  }, [q]);

  const debouncedDraft = useDebounce(draft, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    const next = normalizeQuery(debouncedDraft);
    if (next === lastWrittenRef.current) return;
    lastWrittenRef.current = next;
    setQuery(next);
  }, [debouncedDraft, setQuery]);

  const submit = useCallback(
    (value: string): void => {
      const next = normalizeQuery(value);
      addRecent(next);
      if (next === lastWrittenRef.current) return;
      lastWrittenRef.current = next;
      setQuery(next);
    },
    [addRecent, setQuery],
  );

  // A query that settles (and finds cars) joins the session's recent searches.
  const settledQuery = useDebounce(q, RECENT_SEARCH_IDLE_MS);
  const settledHasResults = settledQuery === q && (results?.length ?? 0) > 0;
  useEffect(() => {
    if (settledHasResults && settledQuery.length >= 2) addRecent(settledQuery);
  }, [addRecent, settledHasResults, settledQuery]);

  const loading = productsQuery.isPending;
  const isError = productsQuery.isError && !products;
  const noMatches = Boolean(q) && results !== undefined && results.length === 0;

  const description = !q
    ? 'Find any car by make, model, series, colour or rarity. Try “Porsche 911” or “rally”.'
    : loading
      ? 'Scanning the garage…'
      : results
        ? `${pluralize(results.length, 'machine')} ${results.length === 1 ? 'matches' : 'match'} your search. Refine with the filters or jump to a model.`
        : 'Search results for your query.';

  const tryChips = (
    <ul aria-label="Try another search" className="flex flex-wrap justify-center gap-2">
      {SEARCH_SUGGESTIONS.map((query) => (
        <li key={query}>
          <QueryChipLink
            to={searchPath(query)}
            onSelect={() => addRecent(query)}
            icon={<TrendingUp />}
          >
            {query}
          </QueryChipLink>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <ShopHeader
        breadcrumbs={[
          { label: 'Home', to: ROUTES.home },
          { label: 'Search', to: ROUTES.search },
        ]}
        eyebrow="Search the garage"
        title={q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search the garage'}
        description={description}
      >
        <div className="flex max-w-3xl flex-col gap-6">
          <SearchInput
            size="lg"
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            onClear={() => submit('')}
            loading={loading && Boolean(draft)}
            label="Search the garage"
            clearLabel="Clear search field"
            placeholder="Search the garage… make, model, series"
          />
          {suggestions.length > 0 ? (
            <SearchSuggestions suggestions={suggestions} query={q} onPick={addRecent} />
          ) : null}
        </div>
      </ShopHeader>

      <Container className="py-8 lg:py-10">
        {!q ? (
          <SearchLanding
            products={products}
            isLoading={loading}
            isError={isError}
            error={productsQuery.error}
            onRetry={() => void productsQuery.refetch()}
            onPick={addRecent}
          />
        ) : noMatches ? (
          <ShopEmptyState
            title="No machines on this track"
            description={
              <>
                Nothing in the garage matches &ldquo;{q}&rdquo;. Check the spelling, or try a make,
                model, series or colour.
              </>
            }
            onClear={() => submit('')}
            clearLabel="Clear search"
            browseAll
          >
            <p className="hud mb-3 text-muted">Or try one of these</p>
            {tryChips}
          </ShopEmptyState>
        ) : (
          <ErrorBoundary label="Search results" resetKeys={[q, controller.filters]}>
            <ProductBrowser
              idPrefix="search"
              products={results}
              isLoading={loading}
              isError={isError}
              error={productsQuery.error}
              onRetry={() => void productsQuery.refetch()}
              controller={controller}
              sortOptions={SEARCH_SORT_OPTIONS}
              pageSize={PAGE_SIZE}
              gridLabel={`Search results for ${q}`}
              onClearAll={() => controller.clearAll()}
              renderEmpty={() => (
                <ShopEmptyState
                  title="No machines on this track"
                  description={
                    <>
                      Cars match &ldquo;{q}&rdquo;, but not with these filters. Ease off a filter or
                      two to bring them back.
                    </>
                  }
                  onClear={() => controller.clearAll()}
                />
              )}
            />
          </ErrorBoundary>
        )}
      </Container>
    </>
  );
}
