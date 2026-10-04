import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchPath } from '@/config/routes';
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
          <li key={row.make} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <Link
              to={searchPath(row.make)}
              onClick={() => onPick(row.make)}
              className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-sm font-display text-sm font-bold uppercase tracking-display text-fg transition-colors hover:text-accent-ink active:opacity-80"
            >
              {row.make}
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            </Link>
            <ul aria-label={`${row.make} models`} className="flex min-w-0 flex-wrap gap-2">
              {row.models.map((entry) => {
                const next = `${row.make} ${entry.model}`;
                return (
                  <li key={entry.model} className="max-w-full">
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
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
