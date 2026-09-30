import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page (rendered with `aria-current="page"`). */
  to?: string;
}

export interface ShopBreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

/** HUD-style breadcrumb trail: `HOME › SHOP › NEW ARRIVALS`. */
export function ShopBreadcrumbs({ items, className }: ShopBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] font-semibold uppercase tracking-hud">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="rounded-sm text-muted transition-colors duration-150 hover:text-accent-ink active:opacity-80"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="truncate text-fg">
                  {item.label}
                </span>
              )}
              {last ? null : (
                <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 text-muted/70" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
