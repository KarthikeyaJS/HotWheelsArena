import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/pages/HomePage';
import { useCartStore } from '@/store/cartStore';
import { useGarageStore } from '@/store/garageStore';
import type { Product } from '@/types';
import { HOME_PRODUCTS, ROUTER_FUTURE, stubMatchMedia } from './homeFixtures';

const loaders = vi.hoisted(() => ({
  loadScrollGsap: vi.fn(() => new Promise<never>(() => undefined)),
  loadMotionPathGsap: vi.fn(() => new Promise<never>(() => undefined)),
}));
const requireAuth = vi.hoisted(() => vi.fn());

vi.mock('@/components/hero/loadGsap', () => loaders);

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
  loaders.loadScrollGsap.mockClear();
  loaders.loadMotionPathGsap.mockClear();
  requireAuth.mockReset();
  useCartStore.setState({ items: [] });
  useGarageStore.getState().reset();
  Element.prototype.scrollIntoView = vi.fn();
  // jsdom has no canvas: ParticleField copes with a null context.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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

  it('reduced motion: static hero, no GSAP import, no scroll-track, instant jumps', async () => {
    restoreMatchMedia = stubMatchMedia([
      'min-width: 1024px',
      'min-width: 1360px',
      'prefers-reduced-motion: reduce',
    ]);
    const user = userEvent.setup();
    renderHome();
    expect(document.getElementById('hero')).toHaveAttribute('data-sequence', 'static');
    expect(loaders.loadScrollGsap).not.toHaveBeenCalled();
    expect(loaders.loadMotionPathGsap).not.toHaveBeenCalled();
    expect(screen.queryByTestId('scroll-track')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Page sections' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /explore collection/i }));
    expect(document.getElementById('collection')?.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('mobile / tablet: static hero without GSAP or the scroll-track', () => {
    renderHome();
    expect(document.getElementById('hero')).toHaveAttribute('data-sequence', 'static');
    expect(loaders.loadScrollGsap).not.toHaveBeenCalled();
    expect(screen.queryByTestId('scroll-track')).not.toBeInTheDocument();
  });

  it('wide desktop: loads the GSAP sequence lazily and renders the scroll-track station nav', async () => {
    restoreMatchMedia = stubMatchMedia(['min-width: 1024px', 'min-width: 1360px']);
    const user = userEvent.setup();
    renderHome();
    expect(document.getElementById('hero')).toHaveAttribute('data-sequence', 'scroll');
    expect(loaders.loadScrollGsap).toHaveBeenCalledTimes(1);

    const nav = screen.getByRole('navigation', { name: 'Page sections' });
    const stations = within(nav).getAllByRole('button');
    expect(stations.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Jump to Hero',
      'Jump to Collection',
      'Jump to New arrivals',
      'Jump to Vault',
      'Jump to Garage',
      'Jump to About',
    ]);
    expect(stations.filter((button) => button.hasAttribute('aria-current'))).toHaveLength(1);

    await user.click(within(nav).getByRole('button', { name: 'Jump to Vault' }));
    const vault = document.getElementById('vault');
    expect(vault?.scrollIntoView).toHaveBeenCalled();
    expect(vault).toHaveFocus();
  });
});
