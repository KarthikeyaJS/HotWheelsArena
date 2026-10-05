import { ChevronDown, ListTree } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import { useActiveSection } from './useActiveSection';

export interface TocItem {
  /** Section id (`ContentSection` id). */
  id: string;
  label: string;
}

export interface TableOfContentsProps {
  items: readonly TocItem[];
  /** Nav label + visible caption (default "On this page"). */
  label?: string;
  /** `sidebar` = sticky desktop list; `disclosure` = collapsible "On this page" panel (mobile). */
  variant?: 'sidebar' | 'disclosure';
  className?: string;
}

/** Moves keyboard focus to the section heading after the router has scrolled to it. */
function focusSectionHeading(id: string): void {
  window.requestAnimationFrame(() => {
    const heading = document.getElementById(`${id}-title`) ?? document.getElementById(id);
    heading?.focus({ preventScroll: true });
  });
}

/**
 * Table of contents for long static pages. Links are deep links (`#section`), the section being
 * read is marked with `aria-current="location"` (scroll-spy), and focus follows the jump.
 */
export function TableOfContents({
  items,
  label = 'On this page',
  variant = 'sidebar',
  className,
}: TableOfContentsProps) {
  const active = useActiveSection(items.map((item) => item.id));
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const list = (
    <ol className="flex flex-col">
      {items.map((item, index) => {
        const current = item.id === active;
        return (
          <li key={item.id}>
            <Link
              to={{ hash: item.id }}
              aria-current={current ? 'location' : undefined}
              onClick={() => {
                if (detailsRef.current) detailsRef.current.open = false;
                focusSectionHeading(item.id);
              }}
              className={cn(
                'group flex items-baseline gap-3 border-l-2 py-2 pl-4 pr-2 text-sm transition-colors duration-150 active:opacity-80',
                current
                  ? 'border-accent font-semibold text-fg'
                  : 'border-line text-muted hover:border-fg/40 hover:text-fg',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'font-mono text-[11px] tabular-nums',
                  current ? 'text-accent-ink' : 'text-muted',
                )}
              >
                {padNumber(index + 1)}
              </span>
              <span className="min-w-0">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );

  if (variant === 'disclosure') {
    return (
      <nav aria-label={label} className={className}>
        <details
          ref={detailsRef}
          className="group/toc rounded-xl border border-line bg-card shadow-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-card-hover active:opacity-90 [&::-webkit-details-marker]:hidden">
            <span className="hud flex items-center gap-2 text-fg">
              <ListTree aria-hidden="true" className="h-4 w-4 text-accent-ink" />
              {label}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 text-muted transition-transform duration-200 group-open/toc:rotate-180"
            />
          </summary>
          <div className="border-t border-line px-2 py-3">{list}</div>
        </details>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className={className}>
      <p className="hud mb-3 flex items-center gap-2 text-muted">
        <ListTree aria-hidden="true" className="h-4 w-4 text-accent-ink" />
        {label}
      </p>
      {list}
    </nav>
  );
}
