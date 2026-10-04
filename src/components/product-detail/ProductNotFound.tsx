import { ArrowRight, Search, TriangleAlert } from 'lucide-react';
import { TireMarks } from '@/components/effects/TireMarks';
import { Button } from '@/components/ui';
import { searchPath, shopPath } from '@/config/routes';
import { cn } from '@/lib/cn';

export interface ProductNotFoundProps {
  /** The slug from the URL — turned into a search query suggestion. */
  slug?: string;
  className?: string;
}

/** `porsche-911-gt3` → `porsche 911 gt3`. */
function slugToQuery(slug: string | undefined): string {
  return (slug ?? '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/**
 * In-page 404 for an unknown / retired product slug ("This machine isn't in our garage"), with
 * links back to the shop and a search seeded from the slug. The page also sets `noindex`.
 */
export function ProductNotFound({ slug, className }: ProductNotFoundProps) {
  const query = slugToQuery(slug);

  return (
    <section
      aria-labelledby="product-not-found-title"
      className={cn(
        'relative isolate mx-auto flex max-w-3xl flex-col items-center gap-6 overflow-hidden rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center shadow-card sm:px-12 sm:py-20',
        className,
      )}
    >
      <TireMarks variant="drift" className="-z-10 text-fg/[0.04]" />
      <span
        aria-hidden="true"
        className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 -z-10 opacity-60"
      />
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-accent-ink shadow-card"
      >
        <TriangleAlert className="h-6 w-6" />
      </span>
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Error 404 · Off track</p>
        <h1
          id="product-not-found-title"
          className="text-balance font-display text-2xl font-bold uppercase tracking-display text-fg sm:text-4xl"
        >
          This machine isn&apos;t in our garage
        </h1>
        <p className="mx-auto max-w-lg text-pretty text-muted">
          The car you&apos;re looking for may have been retired from the grid, or the link took a
          wrong turn. Try the full garage or search for it.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button to={shopPath()} rightIcon={<ArrowRight />}>
          Browse the garage
        </Button>
        <Button to={searchPath(query)} variant="outline" leftIcon={<Search />}>
          {query ? `Search “${query}”` : 'Search the garage'}
        </Button>
      </div>
    </section>
  );
}
