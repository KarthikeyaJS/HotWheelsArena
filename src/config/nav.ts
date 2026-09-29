/**
 * Navigation config. Labels are Title Case — render them with the `uppercase` class so
 * screen readers announce words, not letters.
 */
import { Car, Gem, Layers, Sparkles, Warehouse, type LucideIcon } from 'lucide-react';
import { ROUTES, garagePath, shopPath } from './routes';

export interface NavLinkItem {
  id: 'garage' | 'collections' | 'new-drops' | 'vault' | 'my-garage';
  label: string;
  to: string;
  icon: LucideIcon;
  /** Short helper text (mobile drawer / command palette). */
  description: string;
  /** Destination is behind RequireAuth (link still navigates; the page shows PIT PASS REQUIRED). */
  requiresAuth?: boolean;
}

export const NAV_LINKS: readonly NavLinkItem[] = [
  {
    id: 'garage',
    label: 'Garage',
    to: ROUTES.shop,
    icon: Car,
    description: 'Browse every car in the shop',
  },
  {
    id: 'collections',
    label: 'Collections',
    to: ROUTES.collections,
    icon: Layers,
    description: 'Series and sets',
  },
  {
    id: 'new-drops',
    label: 'New Drops',
    to: shopPath({ view: 'new' }),
    icon: Sparkles,
    description: 'Just off the track',
  },
  {
    id: 'vault',
    label: 'Vault',
    to: ROUTES.vault,
    icon: Gem,
    description: 'Rare and limited editions',
  },
  {
    id: 'my-garage',
    label: 'My Garage',
    to: garagePath(),
    icon: Warehouse,
    description: 'Your collection, badges and XP',
    requiresAuth: true,
  },
];

/** Whether a nav link represents the current location (for `aria-current="page"`). */
export function isNavLinkActive(
  link: NavLinkItem,
  location: { pathname: string; search: string },
): boolean {
  const { pathname } = location;
  const view = new URLSearchParams(location.search).get('view');
  switch (link.id) {
    case 'garage':
      return (pathname === ROUTES.shop && view !== 'new') || pathname === ROUTES.search;
    case 'new-drops':
      return pathname === ROUTES.shop && view === 'new';
    case 'collections':
      return pathname === ROUTES.collections || pathname.startsWith(`${ROUTES.collections}/`);
    case 'vault':
      return pathname === ROUTES.vault;
    case 'my-garage':
      return pathname === ROUTES.garage || pathname === ROUTES.wishlist;
    default:
      return false;
  }
}

export interface FooterLink {
  label: string;
  to: string;
}

export interface FooterLinkGroup {
  title: string;
  links: readonly FooterLink[];
}

export const FOOTER_LINK_GROUPS: readonly FooterLinkGroup[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All cars', to: ROUTES.shop },
      { label: 'New drops', to: shopPath({ view: 'new' }) },
      { label: 'Collections', to: ROUTES.collections },
      { label: 'The Vault', to: ROUTES.vault },
      { label: 'Search the garage', to: ROUTES.search },
    ],
  },
  {
    title: 'Collector',
    links: [
      { label: 'My Garage', to: garagePath() },
      { label: 'Achievements', to: garagePath('achievements') },
      { label: 'Wishlist', to: ROUTES.wishlist },
      { label: 'Orders', to: ROUTES.orders },
      { label: 'Pit Stop (cart)', to: ROUTES.cart },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', to: ROUTES.contact },
      { label: 'FAQ', to: ROUTES.faq },
      { label: 'Shipping & Returns', to: ROUTES.shippingReturns },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: ROUTES.about },
      { label: 'Privacy', to: ROUTES.privacy },
      { label: 'Terms', to: ROUTES.terms },
    ],
  },
];
