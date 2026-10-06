import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPage from '@/pages/SearchPage';
import { useRecentSearchStore } from '@/store/recentSearchStore';
import type { Product } from '@/types';
import { CATALOGUE } from './fixtures';

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
vi.mock('@/hooks/useSeries', () => ({ useSeries: () => ({ data: [] }) }));
vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));

let currentUrl = '';
function LocationProbe() {
  const location = useLocation();
  currentUrl = `${location.pathname}${location.search}`;
  return null;
}

function renderSearch(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <LocationProbe />
      <Routes>
        <Route path="/search" element={<SearchPage />} />
        <Route path="/shop" element={<p>Shop page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SearchPage', () => {
  beforeEach(() => {
    mocks.products.data = [...CATALOGUE];
    mocks.products.isPending = false;
    mocks.products.isError = false;
    useRecentSearchStore.setState({ recent: [] });
    currentUrl = '';
  });

  it('ranks results for ?q= with the rail, count and noindex meta', () => {
    renderSearch('/search?q=porsche');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Results for “porsche”' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /machines$/ })).toHaveTextContent(
      '4machines',
    );
    expect(document.title).toMatch(/^Search: porsche \|/);
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('relevance');
    expect(screen.getByRole('complementary', { name: 'Filters' })).toBeInTheDocument();
  });

  it('offers MAKE → MODEL refinements', () => {
    renderSearch('/search?q=porsche');
    const refine = screen.getByRole('navigation', { name: 'Refine by make and model' });
    const models = within(refine).getByRole('list', { name: 'Porsche models' });
    expect(
      within(models)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/search?q=Porsche%20911%20GT3%20RS',
      '/search?q=Porsche%20911%20Safari%20Rally',
      '/search?q=Porsche%20911%20Turbo%203.3%20(930)',
      '/search?q=Porsche%20911%20Turbo%20S',
    ]);
  });

  it('syncs the inline field to ?q= (debounced) and records settled queries', async () => {
    const user = userEvent.setup();
    renderSearch('/search');
    const input = screen.getByRole('searchbox', { name: 'Search the garage' });
    await user.type(input, 'toyota');
    await waitFor(() => expect(currentUrl).toBe('/search?q=toyota'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Results for “toyota”' }),
    ).toBeInTheDocument();
    // Recorded after RECENT_SEARCH_IDLE_MS (1.2s) of no typing; the global 5s async timeout
    // (src/test/setup.ts) leaves headroom under full-suite load.
    await waitFor(() => expect(useRecentSearchStore.getState().recent).toEqual(['toyota']));
  });

  it('submits immediately on Enter', async () => {
    const user = userEvent.setup();
    renderSearch('/search');
    await user.type(screen.getByRole('searchbox', { name: 'Search the garage' }), 'rally{Enter}');
    expect(currentUrl).toBe('/search?q=rally');
    expect(useRecentSearchStore.getState().recent).toEqual(['rally']);
  });

  it('shows recent searches, category shortcuts and featured cars for a blank query', () => {
    useRecentSearchStore.setState({ recent: ['porsche 911'] });
    renderSearch('/search');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Search the garage' }),
    ).toBeInTheDocument();
    const recent = screen.getByRole('list', { name: 'Recent searches' });
    expect(within(recent).getByRole('link', { name: 'porsche 911' })).toHaveAttribute(
      'href',
      '/search?q=porsche%20911',
    );
    expect(screen.getByRole('link', { name: /^rescue/i })).toHaveAttribute(
      'href',
      '/shop?category=rescue',
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Featured machines' }),
    ).toBeInTheDocument();
  });

  it('handles no results with suggestions and a clear action', async () => {
    const user = userEvent.setup();
    renderSearch('/search?q=zeppelin');
    expect(screen.getByRole('heading', { name: 'No machines on this track' })).toBeInTheDocument();
    const tryList = screen.getByRole('list', { name: 'Try another search' });
    expect(within(tryList).getByRole('link', { name: 'Porsche' })).toHaveAttribute(
      'href',
      '/search?q=Porsche',
    );
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(currentUrl).toBe('/search');
  });

  it('shows a neutral results label and the retry state while the catalogue is unreachable', () => {
    mocks.products.data = undefined;
    mocks.products.isError = true;
    renderSearch('/search?q=porsche');
    expect(
      screen.getByRole('heading', { level: 2, name: /^machines unavailable$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /loading machines/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByText('No machines on this track')).not.toBeInTheDocument();
  });

  it('keeps the query when clearing filters that hide every result', async () => {
    const user = userEvent.setup();
    renderSearch('/search?q=porsche&color=green');
    expect(screen.getByText(/but not with these filters/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(currentUrl).toBe('/search?q=porsche');
  });
});
