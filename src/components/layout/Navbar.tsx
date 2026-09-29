import { Menu } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { IconButton } from '@/components/ui/IconButton';
import { useIsScrolled } from '@/hooks/useScrollProgress';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/uiStore';
import { CartButton } from './CartButton';
import { Logo } from './Logo';
import { NavLinks } from './NavLinks';
import { ScrollProgress } from './ScrollProgress';
import { SearchButton } from './SearchButton';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { WishlistNavButton } from './WishlistNavButton';

/** Scroll distance (px) after which the header condenses. */
const CONDENSE_AFTER = 24;

/**
 * Sticky racing header: frosted glass, condenses from 76px to 60px on scroll, orange
 * scroll-progress line along its bottom edge. Desktop (≥ lg): centre links + search trigger
 * (with the Ctrl/⌘ K hint from xl) + wishlist / cart / theme / sound / account (the CRT
 * scanlines toggle lives in the account menu, drawer and footer). Below lg: hamburger →
 * MobileDrawer.
 */
export function Navbar() {
  const condensed = useIsScrolled(CONDENSE_AFTER);
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const openMobileNav = useUiStore((state) => state.openMobileNav);

  return (
    <header
      className={cn(
        'glass sticky top-0 z-header border-b transition-[border-color,box-shadow,background-color] duration-300',
        condensed
          ? 'border-line shadow-[0_10px_30px_-20px_rgb(0_0_0/0.55)]'
          : 'border-line/60 dark:border-transparent',
      )}
    >
      <Container>
        <div
          className={cn(
            'flex items-center gap-2 transition-[height] duration-300 ease-race sm:gap-3',
            condensed ? 'h-[60px]' : 'h-[76px]',
          )}
        >
          <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
            <IconButton
              label="Open menu"
              icon={<Menu />}
              onClick={openMobileNav}
              aria-haspopup="dialog"
              aria-expanded={mobileNavOpen}
              className="-ml-2 lg:hidden"
            />
            <Logo size={condensed ? 'sm' : 'md'} />
          </div>

          <NavLinks className="mx-auto hidden lg:block" />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0">
            <SearchButton variant="pill" className="mr-1 hidden 2xl:flex" />
            <SearchButton variant="compact" className="mr-1 hidden xl:flex 2xl:hidden" />
            <SearchButton variant="icon" className="xl:hidden" />
            <WishlistNavButton className="hidden sm:inline-flex lg:hidden xl:inline-flex" />
            <CartButton />
            <span
              aria-hidden="true"
              className="mx-1 hidden h-6 w-px bg-line md:block lg:hidden xl:block"
            />
            <ThemeToggle className="hidden md:inline-flex" />
            <SoundToggle className="hidden md:inline-flex" />
            <UserMenu className="ml-1 hidden sm:flex" />
          </div>
        </div>
      </Container>
      <ScrollProgress />
    </header>
  );
}
