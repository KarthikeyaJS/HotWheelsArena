import { Clock, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchPath } from '@/config/routes';
import { useRecentSearchStore, useRecentSearches } from '@/store/recentSearchStore';

export interface RecentSearchesProps {
  /** Called with the chosen query before navigating. */
  onPick?: (query: string) => void;
  className?: string;
}

/**
 * This session's recent searches (sessionStorage) as links with per-item remove + clear.
 * Removing an entry moves focus to the next entry's remove button (or the previous one); once the
 * list is empty — or after "Clear history" — focus lands on the empty-state line, never `<body>`.
 */
export function RecentSearches({ onPick, className }: RecentSearchesProps) {
  const recent = useRecentSearches();
  const { removeRecent, clearRecent } = useRecentSearchStore.getState();
  const rootRef = useRef<HTMLDivElement>(null);
  /** Index of the entry just removed (0 after "Clear history"); null = nothing pending. */
  const pendingFocusRef = useRef<number | null>(null);

  useEffect(() => {
    const index = pendingFocusRef.current;
    if (index === null) return;
    pendingFocusRef.current = null;
    const root = rootRef.current;
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('button[data-recent-remove]'));
    const target =
      buttons[index] ??
      buttons[index - 1] ??
      root.querySelector<HTMLElement>('[data-recent-empty]');
    target?.focus();
  }, [recent]);

  return (
    <div ref={rootRef} className={className}>
      {recent.length === 0 ? (
        <p data-recent-empty="" tabIndex={-1} className="rounded-sm text-sm text-muted">
          Your recent searches land here for this session.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul aria-label="Recent searches" className="flex flex-wrap gap-2">
            {recent.map((query, index) => (
              <li
                key={query}
                className="group inline-flex h-9 max-w-full items-center rounded border border-line bg-card/60 transition-colors duration-150 hover:border-fg/40 touch:h-11"
              >
                <Link
                  to={searchPath(query)}
                  onClick={() => onPick?.(query)}
                  title={query}
                  className="inline-flex h-full min-w-0 items-center gap-2 rounded-l pl-3 pr-1.5 text-sm text-fg transition-colors hover:text-accent-ink active:opacity-80"
                >
                  <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">{query}</span>
                </Link>
                <button
                  type="button"
                  data-recent-remove=""
                  onClick={() => {
                    pendingFocusRef.current = index;
                    removeRecent(query);
                  }}
                  aria-label={`Remove “${query}” from recent searches`}
                  title="Remove"
                  className="mr-1 inline-grid h-7 w-7 shrink-0 place-items-center rounded-sm text-muted transition-[color,background-color] hover:bg-fg/10 hover:text-fg active:scale-90 touch:mr-0 touch:h-11 touch:w-11"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              pendingFocusRef.current = 0;
              clearRecent();
            }}
            className="inline-flex min-h-8 items-center self-start rounded-sm font-mono text-xs font-bold uppercase tracking-hud text-accent-ink transition-opacity hover:opacity-80 active:opacity-70 touch:min-h-11"
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
