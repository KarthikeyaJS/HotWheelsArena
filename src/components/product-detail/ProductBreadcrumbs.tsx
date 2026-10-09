import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { ProductCrumb } from './productSeo';

export interface ProductBreadcrumbsProps {
  /** Trail from `productBreadcrumbs()`; the last item is the current page. */
  items: readonly ProductCrumb[];
  className?: string;
}

/** Shop › Category › Name — `<nav aria-label="Breadcrumb">` with `aria-current="page"`. */
export function ProductBreadcrumbs({ items, className }: ProductBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="hud flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={item.path} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-fg/30" />
              ) : null}
              {current ? (
                <span aria-current="page" className="truncate text-fg">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="relative rounded-sm transition-colors duration-150 hover:text-accent-ink active:opacity-80 touch:after:absolute touch:after:-inset-x-1 touch:after:-inset-y-3"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
