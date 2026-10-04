import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShopPage from '@/pages/ShopPage';
import type { Product } from '@/types';
import { CATALOGUE, makeShopProduct } from './fixtures';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

const mocks = vi.hoisted(() => ({
  products: {
    data: undefined as Product[] | undefined,
    isPending: false,
    isError: false,
    error: null as Error | null,
    refetch: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/hooks/useProducts', () => ({ useProducts: () => mocks.products }));
vi.mock('@/hooks/useSeries', () => ({
  useSeries: () => ({
    data: [
      { id: 'hw-exotics-2026', name: 'HW Exotics', year: 2026 },
      { id: 'hw-race-day-2024', name: 'HW Race Day', year: 2024 },
    ],
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

/** 10 fixture cars + 16 rescue trucks = 26 (three LOAD MORE pages). */
const BIG_CATALOGUE: Product[] = [
  ...CATALOGUE,
  ...Array.from({ length: 16 }, (_, index) =>
    makeShopProduct({
      id: `rescue-${index + 1}`,
      name: `Rescue Truck ${index + 1}`,
      make: 'Tata',
      model: `Signa ${index + 1}`,
      category: 'rescue',
      price: 299 + index,
      createdAt: 1_700_000_000_000 + index,
    }),
  ),
];

let currentUrl = '';
function LocationProbe() {
  const location = useLocation();
  currentUrl = `${location.pathname}${location.search}`;
  return null;
}

function renderShop(path = '/shop') {
  return render(
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <LocationProbe />
      <ShopPage />
    </MemoryRouter>,
  );
}

const rail = () => screen.getByRole('complementary', { name: 'Filters' });
const resultsHeading = () => screen.getByRole('heading', { level: 2, name: /machines?$/i });

describe('ShopPage', () => {
  beforeEach(() => {
    mocks.products.data = BIG_CATALOGUE;
    mocks.products.isPending = false;
    mocks.products.isError = false;
    mocks.products.error = null;
    mocks.products.refetch.mockClear();
    currentUrl = '';
  });

  it('renders the All Cars view with tabs, count, meta and the first page', () => {
    renderShop();
    expect(screen.getByRole('heading', { level: 1, name: 'Shop the garage' })).toBeInTheDocument();
    expect(document.title).toMatch(/^Shop all cars \|/);
    const tabs = screen.getByRole('navigation', { name: 'Shop views' });
    expect(within(tabs).getByRole('link', { name: /^All Cars\s*,\s*26 cars$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(resultsHeading()).toHaveTextContent('26machines');
    const grid = screen.getByRole('list', { name: 'All cars' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 12 of 26');
  });

  it('lands home category cards on the matching view', () => {
    renderShop('/shop?category=off-road');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mud, dirt and zero limits' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Off-Road\s*,\s*1 car$/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(resultsHeading()).toHaveTextContent('1machine');
  });

  it('shows categories without a view as a removable chip', async () => {
    const user = userEvent.setup();
    renderShop('/shop?category=rescue');
    expect(
      screen.getByRole('heading', { level: 1, name: 'First responders, full throttle' }),
    ).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Shop views' });
    expect(within(tabs).queryByRole('link', { current: 'page' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove category filter: Rescue' }));
    expect(currentUrl).toBe('/shop');
  });

  it('filters from the rail, shows chips with counts and clears them', async () => {
    const user = userEvent.setup();
    renderShop();
    await user.click(within(rail()).getByRole('checkbox', { name: 'Porsche, 4 cars' }));
    expect(currentUrl).toBe('/shop?make=Porsche');
    expect(resultsHeading()).toHaveTextContent('4machines');
    const chips = screen.getByRole('list', { name: 'Active filters' });
    expect(within(chips).getByText('Porsche')).toBeInTheDocument();

    // model options narrow to the selected make
    const modelGroup = within(rail()).getByRole('group', { name: 'Model' });
    expect(within(modelGroup).getAllByRole('checkbox')).toHaveLength(4);

    await user.click(within(rail()).getByRole('button', { name: /^1:18\s*,\s*1 car$/ }));
    expect(currentUrl).toBe('/shop?make=Porsche&scale=1:18');
    expect(resultsHeading()).toHaveTextContent('1machine');

    await user.click(within(chips).getByRole('button', { name: 'Clear all' }));
    expect(currentUrl).toBe('/shop');
  });

  it('disables facet options with no matches', () => {
    renderShop('/shop?view=racing');
    const rarity = within(rail()).getByRole('group', { name: 'Rarity' });
    expect(within(rarity).getByRole('checkbox', { name: 'LIMITED, 0 cars' })).toBeDisabled();
    expect(within(rarity).getByRole('checkbox', { name: 'RARE, 1 car' })).toBeEnabled();
  });

  it('loads more cars and moves focus to the first new one', async () => {
    const user = userEvent.setup();
    renderShop();
    await user.click(screen.getByRole('button', { name: /Load more/ }));
    expect(currentUrl).toBe('/shop?shown=24');
    const grid = screen.getByRole('list', { name: 'All cars' });
    const items = within(grid).getAllByRole('listitem');
    expect(items).toHaveLength(24);
    expect(within(items[12]!).getAllByRole('link')[0]).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /Load more/ }));
    expect(within(grid).getAllByRole('listitem')).toHaveLength(26);
    expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull();
    expect(screen.getByText('End of the track')).toBeInTheDocument();
  });

  it('sorts with the select (history replace keeps filters)', async () => {
    const user = userEvent.setup();
    renderShop('/shop?view=premium');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'price-asc');
    expect(currentUrl).toBe('/shop?view=premium&sort=price-asc');
    const grid = screen.getByRole('list', { name: 'Premium' });
    const names = within(grid)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(names[0]).toBe('Toyota Supra (A80)');
    expect(names.at(-1)).toBe('Porsche 911 Turbo 3.3 (930)');
  });

  it('shows the empty state with a clear-filters CTA', async () => {
    const user = userEvent.setup();
    renderShop('/shop?view=racing&make=Porsche');
    expect(screen.getByRole('heading', { name: 'No machines on this track' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(currentUrl).toBe('/shop?view=racing');
  });

  it('shows skeletons while loading and a retry on errors', async () => {
    mocks.products.data = undefined;
    mocks.products.isPending = true;
    const { unmount } = renderShop();
    expect(screen.getByText('Warming up the grid…')).toBeInTheDocument();
    unmount();

    mocks.products.isPending = false;
    mocks.products.isError = true;
    mocks.products.error = new Error('unavailable');
    const user = userEvent.setup();
    renderShop();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(mocks.products.refetch).toHaveBeenCalled();
  });
});
