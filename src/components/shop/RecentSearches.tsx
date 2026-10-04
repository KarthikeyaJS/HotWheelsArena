import { Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { searchPath } from '@/config/routes';
import { useRecentSearchStore, useRecentSearches } from '@/store/recentSearchStore';
import { cn } from '@/lib/cn';

export interface RecentSearchesProps {
  /** Called with the chosen query before navigating. */
  onPick?: (query: string) => void;
  className?: string;
}

/** This session's recent searches (sessionStorage) as links with per-item remove + clear. */
export function RecentSearches({ onPick, className }: RecentSearchesProps) {
  const recent = useRecentSearches();
  const { removeRecent, clearRecent } = useRecentSearchStore.getState();

  if (recent.length === 0) {
    return (
      <p className={cn('text-sm text-muted', className)}>
        Your recent searches land here for this session.
      </p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ul aria-label="Recent searches" className="flex flex-wrap gap-2">
        {recent.map((query) => (
          <li
            key={query}
            className="group inline-flex h-9 max-w-full items-center rounded border border-line bg-card/60 transition-colors duration-150 hover:border-fg/40"
          >
            <Link
              to={searchPath(query)}
              onClick={() => onPick?.(query)}
              className="inline-flex h-full min-w-0 items-center gap-2 rounded-l pl-3 pr-1.5 text-sm text-fg transition-colors hover:text-accent-ink active:opacity-80"
            >
              <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="truncate">{query}</span>
            </Link>
            <button
              type="button"
              onClick={() => removeRecent(query)}
              aria-label={`Remove “${query}” from recent searches`}
              title="Remove"
              className="mr-1 inline-grid h-7 w-7 shrink-0 place-items-center rounded-sm text-muted transition-[color,background-color] hover:bg-fg/10 hover:text-fg active:scale-90"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={clearRecent}
        className="inline-flex min-h-8 items-center self-start rounded-sm font-mono text-[11px] font-bold uppercase tracking-hud text-accent-ink transition-opacity hover:opacity-80 active:opacity-70"
      >
        Clear history
      </button>
    </div>
  );
}
