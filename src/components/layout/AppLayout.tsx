import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BRAND_LOGO_TEXT, COPYRIGHT_OWNER, FOOTER_DISCLAIMER } from '@/config/brand';
import { NAV_LINKS, isNavLinkActive } from '@/config/nav';
import { cn } from '@/lib/cn';

/**
 * MINIMAL placeholder layout written by core. The layout agent replaces this file with the real
 * shell (Navbar, MobileDrawer, Footer, ScrollProgress, SkipLink, ScanlinesOverlay,
 * CommandPalette, SignInPrompt, Toaster, BadgeWatcher). Keep the export name `AppLayout`,
 * the `#main-content` target and the `<Outlet />`.
 */
export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="glass sticky top-0 z-header border-b border-line">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="font-display text-sm font-black tracking-display text-fg">
            {BRAND_LOGO_TEXT}
          </Link>
          <nav aria-label="Primary">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {NAV_LINKS.map((link) => {
                const active = isNavLinkActive(link, location);
                return (
                  <li key={link.id}>
                    <NavLink
                      to={link.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'font-mono text-xs font-bold uppercase tracking-hud transition-colors hover:text-fg',
                        active ? 'text-accent-ink' : 'text-muted',
                      )}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-8 text-sm text-muted sm:px-6 lg:px-8">
          <p>{FOOTER_DISCLAIMER}</p>
          <p className="hud">
            © {new Date().getFullYear()} {COPYRIGHT_OWNER}
          </p>
        </div>
      </footer>
    </div>
  );
}
