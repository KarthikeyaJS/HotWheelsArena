import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OwnedProductIds } from '@/components/collections/useOwnedProductIds';
import { RESCUE_CARS, RESCUE_SERIES, ROUTER_FUTURE } from '@/components/content/__tests__/fixtures';
import SeriesPage from '@/pages/SeriesPage';
import type { Product, Series } from '@/types';

const seriesState: { data: Series | null | undefined; isPending: boolean } = {
  data: RESCUE_SERIES,
  isPending: false,
};
const productsState: { data: Product[] | undefined } = { data: [...RESCUE_CARS] };
let owned: OwnedProductIds;

vi.mock('@/hooks/useSeries', () => ({
  useSeriesBySlug: () => ({
    data: seriesState.data,
    isPending: seriesState.isPending,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    data: productsState.data,
    isPending: productsState.data === undefined,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/collections/useOwnedProductIds', () => ({
  useOwnedProductIds: () => owned,
}));

vi.mock('@/components/product/ProductGrid', () => ({
  ProductGrid: ({ products, label }: { products: readonly Product[]; label?: string }) => (
    <ul aria-label={label}>
      {products.map((product) => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  ),
}));

vi.mock('@/components/product/AddToCartButton', () => ({
  AddToCartButton: ({ product }: { product: Product }) => (
    <button type="button">{`Add ${product.name} to cart`}</button>
  ),
}));

vi.mock('@/components/product/AddToGarageButton', () => ({
  AddToGarageButton: ({ product }: { product: Product }) => (
    <button type="button">{`Add ${product.name} to garage`}</button>
  ),
}));

vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: () => <button type="button">Sign in with Google</button>,
}));

function ownedState(
  ids: string[] | null,
  overrides: Partial<OwnedProductIds> = {},
): OwnedProductIds {
  return {
    ownedIds: ids ? new Set(ids) : null,
    isLoading: false,
    isSignedIn: ids !== null,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderSeries(slug = 'hw-rescue-2025') {
  return render(
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={[`/collections/${slug}`]}>
      <Routes>
        <Route path="/collections/:slug" element={<SeriesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  seriesState.data = RESCUE_SERIES;
  seriesState.isPending = false;
  productsState.data = [...RESCUE_CARS];
  owned = ownedState(['tata-signa-fire-tender', 'dodge-charger-pursuit']);
});

describe('SeriesPage', () => {
  it('renders the series header, meta and the cars in series order', () => {
    renderSeries();
    expect(screen.getByRole('heading', { level: 1, name: 'HW Rescue' })).toBeVisible();
    expect(document.title).toBe('HW Rescue 2025 | HotWheelsArena');
    const grid = screen.getByRole('list', { name: 'Cars in HW Rescue' });
    expect(
      within(grid)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(RESCUE_CARS.map((car) => car.name));
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
      /home.*collections.*hw rescue/i,
    );
  });

  it('shows completion progress and only the missing cars for a signed-in collector', () => {
    renderSeries();
    expect(screen.getByRole('heading', { level: 2, name: '3 cars to go' })).toBeVisible();
    const bar = screen.getByRole('progressbar', { name: 'HW Rescue completion' });
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText('2/5')).toBeInTheDocument();

    const missing = screen.getByRole('list', { name: 'Cars missing from your HW Rescue set' });
    const names = within(missing)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(names).toEqual([
      'Force Traveller Ambulance',
      'Mahindra Scorpio-N Highway Patrol',
      'Ashok Leyland Airport Crash Tender',
    ]);
    expect(
      within(missing).getByRole('button', { name: 'Add Force Traveller Ambulance to garage' }),
    ).toBeInTheDocument();
  });

  it('celebrates a completed series', () => {
    owned = ownedState(RESCUE_SERIES.carIds);
    renderSeries();
    expect(screen.getByRole('heading', { level: 2, name: 'Series complete' })).toBeVisible();
    expect(screen.getByText(/master collector/i)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /cars missing/i })).toBeNull();
  });

  it('asks signed-out visitors to sign in instead of showing progress', () => {
    owned = ownedState(null);
    renderSeries();
    expect(screen.getByText('Track your HW Rescue set')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar', { name: /completion/i })).toBeNull();
  });

  it('shows a loading state while the garage loads', () => {
    owned = ownedState(null, { isLoading: true, isSignedIn: true });
    renderSeries();
    expect(screen.getByText('Checking your garage…')).toBeInTheDocument();
  });

  it('renders a friendly, noindex not-found panel for unknown slugs', () => {
    seriesState.data = null;
    renderSeries('nope');
    expect(screen.getByRole('heading', { level: 1, name: 'Series not found' })).toBeVisible();
    expect(screen.getByText(/“nope”/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all collections/i })).toHaveAttribute(
      'href',
      '/collections',
    );
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
});
