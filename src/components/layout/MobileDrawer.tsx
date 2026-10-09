import {
  ChevronRight,
  Heart,
  Lock,
  LogOut,
  Package,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { Button } from '@/components/ui/Button';
import { CountBadge } from '@/components/ui/CountBadge';
import { Drawer } from '@/components/ui/Drawer';
import { NAV_LINKS, isNavLinkActive } from '@/config/nav';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { useCartCount } from '@/store/cartStore';
import { useWishlistCount } from '@/store/garageStore';
import { useUiStore } from '@/store/uiStore';
import { Logo } from './Logo';
import { ScanlinesToggle } from './ScanlinesToggle';
import { SearchButton } from './SearchButton';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatar } from './UserAvatar';

interface PitLink {
  label: string;
  to: string;
  icon: LucideIcon;
  count?: number;
  countLabel?: string;
}

function SectionLabel({ children }: { children: string }) {
  return <p className="hud mb-2 mt-6 px-3 text-[10px] text-muted">{children}</p>;
}

/**
 * Slide-in navigation for < lg screens (`uiStore.mobileNavOpen`). Built on the ui-kit `Drawer`
 * (focus trap, Esc, scroll lock, focus return). Contains search, primary links, pit links with
 * counts, theme / sound / scanlines settings and account actions. Closes on navigation and
 * when the viewport grows to desktop.
 */
export function MobileDrawer() {
  const open = useUiStore((state) => state.mobileNavOpen);
  const close = useUiStore((state) => state.closeMobileNav);
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const { user, profile, status, signOut } = useAuth();
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();

  // Closes on navigation (back/forward too). Links also close on click, because a link to the
  // current page doesn't change the location and the drawer would otherwise stay open.
  useEffect(() => {
    close();
  }, [location.pathname, location.search, close]);

  useEffect(() => {
    if (isDesktop) close();
  }, [isDesktop, close]);

  const pitLinks: PitLink[] = [
    {
      label: 'Pit stop',
      to: ROUTES.cart,
      icon: ShoppingCart,
      count: cartCount,
      countLabel: cartCount === 1 ? 'item' : 'items',
    },
    {
      label: 'Wishlist',
      to: ROUTES.wishlist,
      icon: Heart,
      count: wishlistCount,
      countLabel: wishlistCount === 1 ? 'car' : 'cars',
    },
    { label: 'Orders', to: ROUTES.orders, icon: Package },
  ];

  const displayName = profile?.displayName || user?.displayName || 'Collector';

  const footer =
    status === 'loading' ? null : user ? (
      <div className="flex items-center gap-3 pb-1">
        <UserAvatar name={displayName} photoURL={profile?.photoURL ?? user.photoURL} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
          {profile ? (
            <LevelBadge level={profile.level} size="sm" showTitle className="mt-1" />
          ) : (
            <p className="truncate text-xs text-muted">{user.email}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<LogOut />}
          onClick={() => {
            close();
            void signOut();
          }}
        >
          Sign out
        </Button>
      </div>
    ) : (
      <div className="space-y-2 pb-1">
        <GoogleSignInButton variant="primary" fullWidth onSignedIn={close} />
        <p className="text-center text-xs text-muted">Unlock your garage, wishlist and XP.</p>
      </div>
    );

  return (
    <Drawer
      open={open}
      onClose={close}
      side="left"
      size="sm"
      eyebrow="Pit lane navigation"
      title={<Logo asLink={false} size="sm" />}
      closeLabel="Close menu"
      footer={footer}
      bodyClassName="px-3 py-4"
    >
      <div className="px-1">
        <SearchButton variant="row" />
      </div>

      <SectionLabel>Garage</SectionLabel>
      <nav aria-label="Mobile primary">
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const active = isNavLinkActive(link, location);
            const locked = link.requiresAuth === true && status === 'signed-out';
            const Icon = link.icon;
            return (
              <li key={link.id}>
                <Link
                  to={link.to}
                  aria-current={active ? 'page' : undefined}
                  onClick={close}
                  className={cn(
                    'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 transition-colors duration-150',
                    active ? 'bg-card-hover' : 'hover:bg-fg/[0.05] active:bg-fg/[0.08]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('racing-stripe racing-stripe-left', active && 'is-active')}
                  />
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-surface',
                      active ? 'border-accent/50 text-accent-ink' : 'border-line text-muted',
                    )}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xs font-bold uppercase tracking-display text-fg">
                      {link.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {link.description}
                    </span>
                  </span>
                  {locked ? (
                    <>
                      <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="sr-only">(sign-in required)</span>
                    </>
                  ) : (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SectionLabel>Your pit</SectionLabel>
      <ul className="space-y-1">
        {pitLinks.map(({ label, to, icon: Icon, count, countLabel }) => (
          <li key={label}>
            <Link
              to={to}
              aria-current={location.pathname === to ? 'page' : undefined}
              onClick={close}
              className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-fg transition-colors hover:bg-fg/[0.05] active:bg-fg/[0.08]"
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
              <span className="flex-1">{label}</span>
              {count !== undefined && count > 0 ? (
                <CountBadge count={count} label={countLabel} size="md" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>

      <SectionLabel>Garage settings</SectionLabel>
      <div className="space-y-0.5">
        <ThemeToggle variant="row" />
        <SoundToggle variant="row" />
        <ScanlinesToggle variant="row" />
      </div>
    </Drawer>
  );
}
