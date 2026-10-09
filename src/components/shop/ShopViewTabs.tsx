import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { ShopView, ShopViewId } from '@/config/shop';
import { useScrollFadeEnd } from '@/hooks/useScrollFadeEnd';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

export interface ShopViewTabsProps {
  views: readonly ShopView[];
  active: ShopViewId | null;
  hrefFor: (view: ShopViewId) => string;
  /** Cars per view (omitted while the catalogue loads). */
  counts?: Readonly<Partial<Record<ShopViewId, number>>>;
  className?: string;
}

/**
 * Shop sub-views as chip links (`aria-current="page"` on the active one). One row that
 * scrolls horizontally on small screens (the active chip is scrolled into view); wraps on
 * desktop. Links keep the rail filters and sort, so "Premium + Porsche" is one click away.
 */
export function ShopViewTabs({ views, active, hrefFor, counts, className }: ShopViewTabsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const fadeEnd = useScrollFadeEnd(listRef);

  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    const left = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, left);
  }, [active]);

  return (
    <nav aria-label="Shop views" className={cn('relative -mx-4 sm:-mx-6 lg:mx-0', className)}>
      <ul
        ref={listRef}
        className={cn(
          'scrollbar-none flex snap-x scroll-px-4 gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-4 py-1 sm:scroll-px-6 sm:px-6 lg:flex-wrap lg:overflow-visible lg:px-0',
          // Edge fade while more views are off-screen to the right (CA-14).
          fadeEnd && 'scroll-fade-x',
        )}
      >
        {views.map((view) => {
          const isActive = view.id === active;
          const count = counts?.[view.id];
          const Icon = view.icon;
          return (
            <li key={view.id} className="shrink-0 snap-start">
              <Link
                to={hrefFor(view.id)}
                preventScrollReset
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group relative inline-flex h-10 items-center gap-1.5 overflow-hidden rounded-md border px-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-[color,background-color,border-color,transform] duration-150 ease-race active:scale-[0.97] touch:h-11',
                  isActive
                    ? 'border-accent bg-accent/10 text-accent-ink'
                    : 'border-line bg-card/70 text-fg hover:border-fg/40 hover:bg-card-hover',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-accent-ink' : 'text-muted group-hover:text-fg',
                  )}
                />
                <span>{view.label}</span>
                {/* The count slot keeps its width while counts load, so the tabs don't slide sideways. */}
                {counts === undefined || count !== undefined ? (
                  <span
                    className={cn(
                      'min-w-[2ch] tabular-nums',
                      isActive ? 'text-accent-ink/80' : 'text-muted',
                    )}
                  >
                    {count !== undefined ? (
                      <>
                        <span className="sr-only">, </span>
                        {formatNumber(count)}
                        <span className="sr-only"> {count === 1 ? 'car' : 'cars'}</span>
                      </>
                    ) : null}
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2 bottom-0 h-0.5 origin-left rounded-full bg-accent transition-transform duration-200 ease-race',
                    isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
