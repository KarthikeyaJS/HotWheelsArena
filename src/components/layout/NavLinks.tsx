import { Link, useLocation } from 'react-router-dom';
import { NAV_LINKS, isNavLinkActive } from '@/config/nav';
import { cn } from '@/lib/cn';

export interface NavLinksProps {
  className?: string;
}

/**
 * Desktop primary navigation (GARAGE · COLLECTIONS · NEW DROPS · VAULT · MY GARAGE).
 * Active state = orange underline stripe + `aria-current="page"`, resolved with
 * `isNavLinkActive` so `/shop?view=new` (New Drops) and `/shop` (Garage) are told apart —
 * plain `Link`s are used because `NavLink` ignores the query string.
 */
export function NavLinks({ className }: NavLinksProps) {
  const location = useLocation();

  return (
    <nav aria-label="Primary" className={className}>
      <ul className="flex items-center gap-0.5 xl:gap-1.5">
        {NAV_LINKS.map((link) => {
          const active = isNavLinkActive(link, location);
          return (
            <li key={link.id}>
              <Link
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-10 items-center whitespace-nowrap rounded-md px-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-200 xl:px-2.5 xl:text-xs xl:tracking-[0.14em]',
                  active ? 'text-fg' : 'text-muted hover:text-fg active:text-fg',
                )}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-2 bottom-0.5 h-0.5 origin-left rounded-full transition-transform duration-300 ease-race xl:inset-x-2.5',
                    active
                      ? 'scale-x-100 bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.6)]'
                      : 'scale-x-0 bg-accent/60 group-hover:scale-x-100',
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
