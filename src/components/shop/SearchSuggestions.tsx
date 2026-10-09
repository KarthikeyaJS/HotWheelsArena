import { ArrowRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { searchPath } from '@/config/routes';
import { Skeleton } from '@/components/ui';
import { useScrollFadeEnd } from '@/hooks/useScrollFadeEnd';
import { cn } from '@/lib/cn';
import { normalizeSearchText, type MakeSuggestion } from '@/lib/search';
import { QueryChipLink } from './QueryChipLink';

export interface SearchSuggestionsProps {
  suggestions: readonly MakeSuggestion[];
  /** The current query (suggestions identical to it are hidden). */
  query: string;
  /** Called with the chosen query before navigating (recent searches). */
  onPick: (query: string) => void;
  className?: string;
}

const MAKE_LINK_CLASS =
  'inline-flex h-9 shrink-0 items-center gap-2 self-center rounded-sm font-display text-sm font-bold uppercase tracking-display text-fg transition-colors hover:text-accent-ink active:opacity-80 touch:h-11 sm:self-start';
/* Phones: one swipeable line per make (fixed height, so the block doesn't grow as chips wrap);
   from 640px the chips wrap beside the make. */
const ROW_CLASS = 'flex items-center gap-3 sm:items-start';
const CHIP_LIST_CLASS =
  'scrollbar-none -my-1 flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto overscroll-x-contain py-1 sm:my-0 sm:flex-wrap sm:overflow-visible sm:py-0';

/** One make's model chips: a swipe row on phones (edge fade while more chips are off-screen). */
function ModelChipList({ label, children }: { label: string; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const fadeEnd = useScrollFadeEnd(listRef);
  return (
    <ul
      ref={listRef}
      aria-label={label}
      className={cn(CHIP_LIST_CLASS, fadeEnd && 'scroll-fade-x')}
    >
      {children}
    </ul>
  );
}

/**
 * Reserves the refinements' height while the catalogue loads (one make row — the common case), so
 * the results below don't jump when the real suggestions mount (CA-02).
 */
export function SearchSuggestionsSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col gap-3', className)}>
      <p className="hud text-muted">Refine by model</p>
      <div className={ROW_CLASS}>
        <span className={cn(MAKE_LINK_CLASS, 'w-24')}>
          <Skeleton className="h-4 w-full" />
        </span>
        <div className="flex min-w-0 flex-1 gap-2 overflow-hidden">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-9 w-28 shrink-0 rounded touch:h-11" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Grouped "MAKE → MODEL" refinements under the search field, e.g.
 * `PORSCHE → 911 GT3 RS · 911 CARRERA RS 2.7 · 911 TURBO S · 911 SAFARI RALLY`.
 */
export function SearchSuggestions({
  suggestions,
  query,
  onPick,
  className,
}: SearchSuggestionsProps) {
  const current = normalizeSearchText(query);
  const rows = suggestions
    .map((suggestion) => ({
      make: suggestion.make,
      models: suggestion.models.filter(
        (entry) => normalizeSearchText(`${suggestion.make} ${entry.model}`) !== current,
      ),
    }))
    .filter((row) => row.models.length > 0);

  if (rows.length === 0) return null;

  return (
    <nav aria-label="Refine by make and model" className={cn('flex flex-col gap-3', className)}>
      <p className="hud text-muted">Refine by model</p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.make} className={ROW_CLASS}>
            <Link
              to={searchPath(row.make)}
              onClick={() => onPick(row.make)}
              className={MAKE_LINK_CLASS}
            >
              {row.make}
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            </Link>
            <ModelChipList label={`${row.make} models`}>
              {row.models.map((entry) => {
                const next = `${row.make} ${entry.model}`;
                return (
                  <li key={entry.model} className="shrink-0 snap-start sm:max-w-full sm:shrink">
                    <QueryChipLink
                      to={searchPath(next)}
                      onSelect={() => onPick(next)}
                      meta={
                        <>
                          <span aria-hidden="true">{entry.count}</span>
                          <span className="sr-only">
                            , {entry.count} {entry.count === 1 ? 'car' : 'cars'}
                          </span>
                        </>
                      }
                    >
                      {entry.model}
                    </QueryChipLink>
                  </li>
                );
              })}
            </ModelChipList>
          </li>
        ))}
      </ul>
    </nav>
  );
}
