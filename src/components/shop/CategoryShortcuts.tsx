import { ArrowUpRight } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { shopPath } from '@/config/routes';
import { CATEGORY_DISPLAY, CATEGORY_ORDER } from '@/config/site';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { CategorySlug, Product } from '@/types';

export interface CategoryShortcutsProps {
  /** Catalogue for per-category counts (counts hidden while undefined). */
  products?: readonly Product[];
  className?: string;
}

/** Six category tiles linking to `/shop?category=…` (icon, name, tagline, car count). */
export function CategoryShortcuts({ products, className }: CategoryShortcutsProps) {
  const counts = useMemo(() => {
    if (!products) return null;
    const map = new Map<CategorySlug, number>();
    for (const product of products) map.set(product.category, (map.get(product.category) ?? 0) + 1);
    return map;
  }, [products]);

  return (
    <ul className={cn('grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3', className)}>
      {CATEGORY_ORDER.map((slug) => {
        const display = CATEGORY_DISPLAY[slug];
        const Icon = display.icon;
        const count = counts ? (counts.get(slug) ?? 0) : undefined;
        return (
          <li key={slug} className="min-w-0">
            <Link
              to={shopPath({ category: slug })}
              className="group relative flex h-full min-h-[5.5rem] items-start gap-3 overflow-hidden rounded-lg border border-line bg-card p-4 shadow-card transition-[background-color,border-color,transform] duration-200 ease-race hover:border-fg/25 hover:bg-card-hover active:scale-[0.99]"
            >
              <span aria-hidden="true" className="racing-stripe" />
              <span
                aria-hidden="true"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent-ink transition-colors group-hover:border-accent/50"
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-sm font-bold uppercase tracking-display text-fg">
                  {display.label}
                </span>
                <span className="text-xs leading-snug text-muted">{display.tagline}</span>
                {count !== undefined ? (
                  <span className="hud mt-1 text-muted">{pluralize(count, 'car')}</span>
                ) : null}
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent-ink"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
