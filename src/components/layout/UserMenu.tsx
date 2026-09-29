import {
  ChevronDown,
  Heart,
  LogOut,
  Package,
  Trophy,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { xpProgress } from '@/config/gamification';
import { ROUTES, garagePath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { formatLevel, formatNumber, formatXp, padNumber } from '@/lib/format';
import { ScanlinesToggle } from './ScanlinesToggle';
import { UserAvatar } from './UserAvatar';

export interface UserMenuProps {
  className?: string;
}

interface MenuLink {
  label: string;
  to: string;
  icon: LucideIcon;
}

const MENU_LINKS: readonly MenuLink[] = [
  { label: 'My Garage', to: garagePath(), icon: Warehouse },
  { label: 'Orders', to: ROUTES.orders, icon: Package },
  { label: 'Wishlist', to: ROUTES.wishlist, icon: Heart },
  { label: 'Achievements', to: garagePath('achievements'), icon: Trophy },
];

const ITEM_CLASSES =
  'flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-fg transition-colors duration-150 hover:bg-fg/[0.06] focus-visible:bg-fg/[0.06] active:bg-fg/[0.1]';

/**
 * Account control in the navbar. Signed in: avatar menu button (WAI-ARIA menu button — ↑/↓,
 * Home/End, Esc, Tab, click-outside) with profile, level/XP, My Garage / Orders / Wishlist /
 * Achievements, the CRT scanlines toggle and Sign out. Signed out: Google "Sign in" button.
 */
export function UserMenu({ className }: UserMenuProps) {
  const { user, profile, status, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<'first' | 'last'>('first');
  const location = useLocation();
  const baseId = useId().replace(/:/g, '');
  const buttonId = `user-menu-${baseId}-button`;
  const menuId = `user-menu-${baseId}-menu`;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  const menuItems = (): HTMLElement[] =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  const focusItem = (index: number): void => {
    const items = menuItems();
    if (items.length === 0) return;
    items[((index % items.length) + items.length) % items.length]?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    );
    (initialFocus.current === 'last' ? items[items.length - 1] : items[0])?.focus();

    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  if (status === 'loading') {
    return (
      <span className={cn('inline-flex', className)}>
        <Skeleton variant="circle" className="h-9 w-9" />
        <span className="sr-only">Checking your pit pass…</span>
      </span>
    );
  }

  if (!user) {
    return (
      <GoogleSignInButton
        size="sm"
        variant="outline"
        label="Sign in"
        loadingText={null}
        className={cn('whitespace-nowrap', className)}
      />
    );
  }

  const displayName = profile?.displayName || user.displayName || 'Collector';
  const email = profile?.email || user.email || '';
  const photoURL = profile?.photoURL ?? user.photoURL;
  const level = profile?.level;
  const progress = profile ? xpProgress(profile.xp) : null;
  const xpCaption = progress
    ? progress.isMax
      ? 'Max level reached'
      : `${formatNumber(progress.toNext)} XP to ${formatLevel(progress.level + 1)}`
    : '';

  const closeMenu = (restoreFocus: boolean): void => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
      if (open) focusItem(event.key === 'ArrowUp' ? -1 : 0);
      else setOpen(true);
    }
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const items = menuItems();
    const current = items.findIndex((item) => item === document.activeElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(-1);
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${displayName}${level ? `, level ${level}` : ''}`}
        onClick={() => {
          initialFocus.current = 'first';
          setOpen((value) => !value);
        }}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'group flex h-10 items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors duration-200 hover:bg-fg/[0.06]',
          open && 'bg-fg/[0.06]',
        )}
      >
        <span className="relative">
          <UserAvatar
            name={displayName}
            photoURL={photoURL}
            size="sm"
            className="transition-shadow group-hover:ring-accent/70"
          />
          {level ? (
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1.5 rounded-sm bg-accent px-1 font-mono text-[9px] font-bold leading-[14px] text-on-accent shadow-sm"
            >
              {padNumber(level)}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-3.5 w-3.5 text-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-overlay mt-2 w-72 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface shadow-card-hover">
          <span aria-hidden="true" className="racing-stripe is-active" />
          <div className="flex items-center gap-3 border-b border-line px-4 pb-4 pt-5">
            <UserAvatar name={displayName} photoURL={photoURL} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{displayName}</p>
              {email ? <p className="truncate text-xs text-muted">{email}</p> : null}
            </div>
          </div>
          {profile ? (
            <div className="space-y-2.5 border-b border-line px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <LevelBadge level={profile.level} size="sm" showTitle />
                <span className="font-mono text-xs font-bold tabular-nums text-accent-ink">
                  {formatXp(profile.xp)}
                </span>
              </div>
              <XpBar xp={profile.xp} size="sm" showLabels={false} />
              <p className="hud text-[10px] text-muted">{xpCaption}</p>
            </div>
          ) : null}
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            tabIndex={-1}
            onKeyDown={onMenuKeyDown}
            className="p-1.5"
          >
            {MENU_LINKS.map(({ label, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                role="menuitem"
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className={ITEM_CLASSES}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                {label}
              </Link>
            ))}
            <div role="separator" className="my-1.5 h-px bg-line" />
            <ScanlinesToggle variant="menuitem" />
            <div role="separator" className="my-1.5 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                closeMenu(true);
                void signOut();
              }}
              className={cn(ITEM_CLASSES, 'text-danger-ink hover:bg-danger/10')}
            >
              <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
