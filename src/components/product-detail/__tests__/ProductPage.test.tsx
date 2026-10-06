import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_SETTINGS } from '@shared/commerce';
import { makeProduct, ROUTER_FUTURE } from '@/components/product/__tests__/fixtures';
import { BRAND_PRODUCT_LINE } from '@/config/brand';
import { ROUTES } from '@/config/routes';
import ProductPage from '@/pages/ProductPage';
import type { Product, Review, Series } from '@/types';

interface FakeQuery<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function ready<T>(data: T): FakeQuery<T> {
  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    refetch: vi.fn(async () => undefined),
  };
}

const state = vi.hoisted(() => ({
  product: null as Product | null,
  products: [] as Product[],
  series: [] as Series[],
  reviews: [] as Review[],
}));

vi.mock('@/hooks/useProducts', () => ({
  useProduct: () => ready(state.product),
  useProducts: () => ready(state.products),
}));
vi.mock('@/hooks/useSeries', () => ({ useSeries: () => ready(state.series) }));
vi.mock('@/hooks/useReviews', () => ({
  useReviews: () => ready(state.reviews),
  useSubmitReview: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false }),
}));
vi.mock('@/hooks/useSiteSettings', () => ({
  useSettings: () => DEFAULT_SITE_SETTINGS,
  useSiteSettings: () => ready(DEFAULT_SITE_SETTINGS),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    status: 'signed-out',
    isProfileLoading: false,
    signIn: vi.fn(async () => null),
    signOut: vi.fn(async () => undefined),
    isSigningIn: false,
  }),
  useUid: () => null,
}));
vi.mock('@/hooks/useGarageActions', () => ({
  useGarageActions: () => ({
    addToGarage: vi.fn(),
    removeFromGarage: vi.fn(),
    toggleFavorite: vi.fn(),
    setQuantity: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));
vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));

function renderPage(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/product/${slug}`]} future={ROUTER_FUTURE}>
      <Routes>
        <Route path={ROUTES.product} element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function jsonLd(id: string): Record<string, unknown> | null {
  const script = document.getElementById(`jsonld-${id}`);
  return script?.textContent ? (JSON.parse(script.textContent) as Record<string, unknown>) : null;
}

const series: Series = {
  id: 'hw-legends-2025',
  name: 'HW Legends',
  slug: 'hw-legends-2025',
  year: 2025,
  totalCars: 6,
  carIds: ['twin-mill-orange', 'a', 'b', 'c', 'd', 'e'],
  description: 'Icons of the garage.',
  isActive: true,
  createdAt: null,
  updatedAt: null,
};

const review: Review = {
  id: 'u1',
  productId: 'twin-mill-orange',
  uid: 'u1',
  displayName: 'Arjun Mehta',
  photoURL: null,
  rating: 5,
  text: 'Chrome engine looks unreal on the shelf.',
  verifiedBuyer: true,
  createdAt: Date.now() - 3 * 86_400_000,
  updatedAt: Date.now() - 3 * 86_400_000,
};

beforeEach(() => {
  state.product = null;
  state.products = [];
  state.series = [series];
  state.reviews = [];
  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
});

describe('ProductPage', () => {
  it('renders the product with meta, JSON-LD and every section', () => {
    const product = makeProduct({ ratingAvg: 5, ratingCount: 1 });
    const related = makeProduct({ id: 'bone-shaker', slug: 'bone-shaker', name: 'Bone Shaker' });
    state.product = product;
    state.products = [product, related];
    state.reviews = [review];
    renderPage(product.slug);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Twin Mill' })).toBeInTheDocument();
    expect(document.title).toBe('Twin Mill — HW Legends | HotWheelsArena');
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );

    const ld = jsonLd('product');
    expect(ld).toMatchObject({
      '@type': 'Product',
      name: 'Twin Mill',
      sku: 'twin-mill-orange',
      brand: { name: BRAND_PRODUCT_LINE },
      model: 'Hot Rod Co Twin Mill',
      offers: { priceCurrency: 'INR', availability: 'https://schema.org/InStock' },
      aggregateRating: { reviewCount: 1 },
    });
    expect(jsonLd('breadcrumbs')).toMatchObject({ '@type': 'BreadcrumbList' });

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/shop');
    expect(within(crumbs).getByText('Twin Mill')).toHaveAttribute('aria-current', 'page');

    expect(screen.getByText('HW LEGENDS · 2025 SERIES')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy Twin Mill now' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add to garage – Twin Mill' })).toBeInTheDocument();
    expect(screen.getByText('Free shipping over')).toBeInTheDocument();
    expect(
      screen.getByText('Themed vehicle specifications — not claims about the toy itself.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'TOP SPEED' })).toHaveAttribute(
      'aria-valuemax',
      '450',
    );
    expect(screen.getByRole('heading', { name: 'HW Legends' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View the HW Legends series' })).toHaveAttribute(
      'href',
      '/collections/hw-legends-2025',
    );
    expect(screen.getByRole('link', { name: 'Bone Shaker' })).toHaveAttribute(
      'href',
      '/product/bone-shaker',
    );
    const reviews = document.getElementById('reviews');
    expect(reviews).not.toBeNull();
    const card = within(reviews as HTMLElement).getByRole('article', {
      name: 'Review by Arjun Mehta',
    });
    expect(within(card).getByText('Verified buyer')).toBeInTheDocument();
    expect(within(card).getByText(review.text)).toBeInTheDocument();
    expect(
      within(reviews as HTMLElement).getByRole('button', { name: /Sign in to write a review/ }),
    ).toBeInTheDocument();
  });

  it('shows the vault edition block for numbered cars', () => {
    const product = makeProduct({
      isVault: true,
      rarity: 'limited',
      stock: 37,
      limitedEdition: { editionNumber: 1, editionSize: 500 },
    });
    state.product = product;
    state.products = [product];
    renderPage(product.slug);

    expect(screen.getByText('#001/500')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Edition claimed' })).toHaveAttribute(
      'aria-valuetext',
      '463 of 500 claimed, 37 remaining',
    );
  });

  it('renders the in-page not-found panel with noindex and no JSON-LD', () => {
    state.product = null;
    renderPage('ghost-car');

    expect(
      screen.getByRole('heading', { level: 1, name: "This machine isn't in our garage" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse the garage/ })).toHaveAttribute(
      'href',
      '/shop',
    );
    expect(screen.getByRole('link', { name: /Search “ghost car”/ })).toHaveAttribute(
      'href',
      '/search?q=ghost%20car',
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(jsonLd('product')).toBeNull();
  });
});
