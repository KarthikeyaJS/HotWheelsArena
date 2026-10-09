import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  /** Route path. The last item is always rendered as the current page (`aria-current="page"`). */
  to: string;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

/**
 * HUD breadcrumb trail (`HOME › COLLECTIONS › HW EXOTICS`) inside a labelled `<nav>`.
 * Pair it with `useJsonLd('breadcrumbs', buildBreadcrumbJsonLd(…))` on the page.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs font-semibold uppercase tracking-hud">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.to}-${item.label}`} className="flex min-w-0 items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="truncate text-fg">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link
                    to={item.to}
                    className="relative rounded-sm text-muted transition-colors duration-150 hover:text-accent-ink active:opacity-80 touch:after:absolute touch:after:-inset-x-1 touch:after:-inset-y-3"
                  >
                    {item.label}
                  </Link>
                  <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-muted/70" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
