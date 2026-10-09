import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/pages/HomePage';
import { useCartStore } from '@/store/cartStore';
import { useGarageStore } from '@/store/garageStore';
import type { Product } from '@/types';
import { HOME_PRODUCTS, ROUTER_FUTURE, stubMatchMedia } from './homeFixtures';

const requireAuth = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useProducts', () => {
  const selectors = {
    newArrivals: (products: Product[]) => products.filter((product) => product.isNew),
    featured: (products: Product[]) => products.filter((product) => product.isFeatured),
    vault: (products: Product[]) => products.filter((product) => product.isVault),
  };
  return {
    productSelectors: selectors,
    useProducts: <T,>(select?: (products: Product[]) => T) => ({
      data: select ? select(HOME_PRODUCTS) : HOME_PRODUCTS,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});
vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    status: 'signed-out',
    isProfileLoading: false,
    isSigningIn: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  useUid: () => null,
}));
vi.mock('@/hooks/useGarage', () => ({
  useGarageCars: () => ({
    cars: [],
    entries: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useRequireAuthAction', () => ({ useRequireAuthAction: () => requireAuth }));
vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));
vi.mock('@/hooks/useSiteSettings', async () => {
  const { DEFAULT_SITE_SETTINGS } = await import('@shared/commerce');
  return { useSettings: () => DEFAULT_SITE_SETTINGS };
});
vi.mock('@/hooks/useNewsletter', () => ({
  useSubscribeNewsletter: () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    data: undefined,
    error: null,
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

const SECTION_IDS = [
  'hero',
  'collection',
  'new-arrivals',
  'featured',
  'vault',
  'garage',
  'achievements',
  'about',
];

let restoreMatchMedia: (() => void) | null = null;

function renderHome() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  requireAuth.mockReset();
  useCartStore.setState({ items: [] });
  useGarageStore.getState().reset();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  restoreMatchMedia?.();
  restoreMatchMedia = null;
});

describe('HomePage', () => {
  it('renders the eight sections in spec order, each labelled by its heading', () => {
    const { container } = renderHome();
    const sections = Array.from(container.querySelectorAll<HTMLElement>('section[id]')).filter(
      (section) => SECTION_IDS.includes(section.id),
    );
    expect(sections.map((section) => section.id)).toEqual(SECTION_IDS);
    sections.forEach((section) => {
      const labelId = section.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(document.getElementById(labelId ?? '')).toHaveTextContent(/\S/);
    });
  });

  it('has exactly one h1 — the brand headline — and sets the page metadata', () => {
    renderHome();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('HOT WHEELS');
    expect(h1).toHaveTextContent('PUSH THE LIMITS');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toMatch(
      /collector/i,
    );
    const jsonLd = document.getElementById('jsonld-home');
    expect(jsonLd?.textContent).toContain('"WebSite"');
    expect(jsonLd?.textContent).toContain('"Organization"');
  });

  it('shows real data in each section (classes, new arrivals, featured, vault, sample garage, locked badges)', () => {
    renderHome();
    expect(screen.getByRole('link', { name: /^limited\b/i })).toHaveAttribute(
      'href',
      '/shop?category=limited',
    );
    const rail = screen.getByRole('region', { name: 'New arrivals' });
    expect(within(rail).getByText('Neon Racer')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Featured collection' })).toHaveTextContent(
      'Ladder Unit',
    );
    expect(screen.getByRole('region', { name: /collector's vault/i })).toHaveTextContent(
      '#001/500',
    );
    expect(screen.getByRole('region', { name: /build your garage/i })).toHaveTextContent('₹18,400');
    expect(screen.getByRole('region', { name: /earn your stripes/i })).toHaveTextContent(
      '1,240 XP',
    );
    expect(screen.getByRole('region', { name: /join the pit crew/i })).toBeInTheDocument();
    // Free at or above the threshold, so the About point must not say "over ₹999".
    expect(screen.getByText('Free shipping from ₹999')).toBeInTheDocument();
  });

  it('scrolls to the collection from the hero CTA and moves focus there', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('link', { name: /explore collection/i }));
    const collection = document.getElementById('collection');
    expect(collection?.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(collection).toHaveFocus();
  });

  it('asks a signed-out visitor to sign in before opening the garage', async () => {
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('button', { name: /build your garage/i }));
    expect(requireAuth).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringMatching(/sign in/i),
    );
  });

  it('renders the simple static hero: headline, copy, both CTAs and the static car', () => {
    renderHome();
    const hero = screen.getByRole('region', { name: /hot wheels/i });
    expect(hero).toHaveAttribute('id', 'hero');
    expect(
      within(hero).getByText(/numbered vault drops for indian hot wheels collectors/i),
    ).toBeVisible();
    // Live catalogue count in the eyebrow (5 cars in the fixture catalogue).
    expect(hero).toHaveTextContent(/5 machines parked/i);

    const explore = within(hero).getByRole('link', { name: /explore collection/i });
    expect(explore).toHaveAttribute('href', '#collection');
    expect(within(hero).getByRole('link', { name: /enter the vault/i })).toHaveAttribute(
      'href',
      '/vault',
    );

    // One decorative, static car: no animation classes anywhere in the hero.
    const car = hero.querySelector('[data-hero="car"] svg');
    expect(car).toHaveAttribute('aria-hidden', 'true');
    expect(hero.querySelector('[class*="animate-"]')).toBeNull();
    // Not a pinned / scroll-driven stage: no sticky stage, no extra-tall section, no sequence data.
    expect(hero.querySelector('.sticky')).toBeNull();
    expect(hero.className).not.toMatch(/svh/);
    expect(hero).not.toHaveAttribute('data-sequence');
  });

  it('has no page scroll-track or "jump to section" navigation, even on wide desktops', () => {
    restoreMatchMedia = stubMatchMedia(['min-width: 1024px', 'min-width: 1360px']);
    renderHome();
    expect(screen.queryByTestId('scroll-track')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Page sections' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^jump to/i })).not.toBeInTheDocument();
  });

  it('reduced motion: Explore Collection jumps instantly', async () => {
    restoreMatchMedia = stubMatchMedia(['prefers-reduced-motion: reduce']);
    const user = userEvent.setup();
    renderHome();
    await user.click(screen.getByRole('link', { name: /explore collection/i }));
    const collection = document.getElementById('collection');
    expect(collection?.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(collection).toHaveFocus();
  });
});
