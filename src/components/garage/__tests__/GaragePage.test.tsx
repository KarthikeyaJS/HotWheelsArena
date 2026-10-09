import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GaragePage from '@/pages/GaragePage';
import { useGarageStore } from '@/store/garageStore';
import type { GarageEntry, Product } from '@/types';
import {
  CATALOGUE,
  NOW,
  DAY,
  ROUTER_FUTURE,
  SERIES_LIST,
  makeEntry,
  makeProduct,
} from './fixtures';

const state = vi.hoisted(() => ({
  entries: [] as GarageEntry[],
  offCatalogue: [] as Product[],
  actions: {
    addToGarage: vi.fn(),
    removeFromGarage: vi.fn(),
    toggleFavorite: vi.fn(),
    setQuantity: vi.fn(),
  },
  wishlistActions: {
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'uid-1', displayName: 'Arjun Mehta', photoURL: null },
    profile: {
      uid: 'uid-1',
      displayName: 'Arjun Mehta',
      email: 'arjun@example.com',
      photoURL: null,
      xp: 1240,
      level: 7,
      badges: ['treasure-hunter'],
      stats: {
        carsOwned: 4,
        uniqueCars: 3,
        seriesCompleted: 0,
        ordersPlaced: 0,
        racingCars: 1,
        rareCars: 2,
        totalSpent: 0,
      },
      role: 'customer',
      createdAt: NOW - 30 * DAY,
      updatedAt: NOW,
    },
    status: 'signed-in',
    isProfileLoading: false,
    isSigningIn: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  useUid: () => 'uid-1',
}));

vi.mock('@/hooks/useGarage', () => ({
  useGarage: () => ({
    data: state.entries,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    data: CATALOGUE,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useProductsByIds: (ids: readonly string[]) => ({
    data: state.offCatalogue.filter((product) => ids.includes(product.id)),
    isPending: false,
    isLoading: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSeries', () => ({
  useSeries: () => ({
    data: SERIES_LIST,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistProducts: () => ({
    products: [],
    entries: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGarageActions', () => ({
  useGarageActions: () => ({ ...state.actions, isPending: false, pendingProductId: null }),
}));

vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    ...state.wishlistActions,
    isPending: false,
    pendingProductId: null,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderPage(path = '/garage') {
  return render(
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <GaragePage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const currentPath = () => screen.getByTestId('location').textContent;

const GARAGE: GarageEntry[] = [
  makeEntry({ productId: 'revuelto', quantity: 2, isFavorite: true, addedAt: NOW - DAY }),
  makeEntry({ productId: 'mclaren-750s', addedAt: NOW - 2 * DAY, source: 'purchase' }),
  makeEntry({ productId: 'swift-rally', addedAt: NOW - 3 * DAY }),
];

beforeEach(() => {
  state.entries = GARAGE;
  state.offCatalogue = [];
  Object.values(state.actions).forEach((fn) => fn.mockReset());
  Object.values(state.wishlistActions).forEach((fn) => fn.mockReset());
  useGarageStore.getState().hydrateGarage(GARAGE);
});

afterEach(() => {
  vi.useRealTimers();
  useGarageStore.getState().reset();
});

describe('GaragePage header and stats', () => {
  it('greets the collector and shows level, XP and collection numbers', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: /welcome back, arjun/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Level 7')).toBeInTheDocument();
    const strip = screen.getByRole('region', { name: 'Garage stats' });
    // 2 + 1 + 1 copies; value 1299×2 + 549 + 199.
    expect(within(strip).getByText('4')).toBeInTheDocument();
    expect(within(strip).getByText('₹3,346')).toBeInTheDocument();
  });

  it('renders every parked car with its source badge', () => {
    renderPage();
    const grid = screen.getByRole('list', { name: /garage cars/i });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(3);
    expect(within(grid).getByText('Purchased')).toBeInTheDocument();
    expect(within(grid).getAllByText('Manual')).toHaveLength(2);
  });

  it('shows the empty garage state with shop and add-a-car CTAs', () => {
    state.entries = [];
    useGarageStore.getState().hydrateGarage([]);
    renderPage();
    expect(
      screen.getByRole('heading', {
        name: /your garage is empty — every legend starts with one car/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore the garage/i })).toHaveAttribute(
      'href',
      '/shop',
    );
  });
});

describe('GaragePage tabs (URL synced)', () => {
  it('opens the tab from ?tab= and writes the selection back to the URL', () => {
    renderPage('/garage?tab=achievements');
    expect(screen.getByRole('tab', { name: /achievements/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: /collector badges/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /stats/i }));
    expect(currentPath()).toBe('/garage?tab=stats');
    expect(screen.getByRole('heading', { name: /series completion/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /collection/i }));
    expect(currentPath()).toBe('/garage');
  });

  it('supports arrow-key navigation between tabs', () => {
    renderPage();
    const collection = screen.getByRole('tab', { name: /collection/i });
    collection.focus();
    fireEvent.keyDown(collection, { key: 'ArrowRight' });
    expect(currentPath()).toBe('/garage?tab=wishlist');
    expect(screen.getByRole('tab', { name: /wishlist/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to the collection for unknown tabs and cleans the URL', () => {
    renderPage('/garage?tab=pit-lane');
    expect(screen.getByRole('tab', { name: /collection/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(currentPath()).toBe('/garage');
  });

  it('lists only starred cars on the favorites tab', () => {
    renderPage('/garage?tab=favorites');
    const list = screen.getByRole('list', { name: 'Favorite cars' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Lamborghini Revuelto')).toBeInTheDocument();
  });
});

describe('GaragePage collection tools', () => {
  it('filters duplicates and shows the duplicates tracker', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /duplicates · 1/i }));
    const grid = screen.getByRole('list', { name: /garage cars/i });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(1);
    const tracker = screen.getByRole('list', { name: 'Duplicate cars' });
    expect(within(tracker).getByText('×2 — 1 spare')).toBeInTheDocument();
  });

  it('lists the missing models of started series with an "I have it" action', () => {
    renderPage();
    const missing = screen.getByRole('list', { name: 'Missing from HW Exotics' });
    expect(within(missing).getByText('Porsche 911 GT3 RS')).toBeInTheDocument();
    fireEvent.click(within(missing).getByRole('button', { name: /i have it/i }));
    expect(state.actions.addToGarage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'gt3-rs' }),
    );
  });

  it('renders retired cars (inactive products) as RETIRED cards', () => {
    const retired = makeProduct({ id: 'old-casting', name: 'Old Casting', isActive: false });
    state.entries = [...GARAGE, makeEntry({ productId: 'old-casting' })];
    state.offCatalogue = [retired];
    renderPage();
    const card = screen.getByText('Old Casting').closest('article');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getAllByText(/retired/i).length).toBeGreaterThan(0);
    expect(within(card as HTMLElement).queryByRole('link', { name: 'Old Casting' })).toBeNull();
  });

  it('removes with a two-step confirm, offers undo, then commits after the window', () => {
    vi.useFakeTimers();
    renderPage();
    const remove = screen.getByRole('button', {
      name: 'Remove Lamborghini Revuelto from your garage',
    });
    fireEvent.click(remove);
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm: remove Lamborghini Revuelto from your garage' }),
    );
    const grid = screen.getByRole('list', { name: /garage cars/i });
    expect(within(grid).queryByText('Lamborghini Revuelto')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /undo — put lamborghini revuelto back/i }));
    expect(within(grid).getByText('Lamborghini Revuelto')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(state.actions.removeFromGarage).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove McLaren 750S from your garage' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm: remove McLaren 750S from your garage' }),
    );
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(state.actions.removeFromGarage).toHaveBeenCalledWith({
      id: 'mclaren-750s',
      name: 'McLaren 750S',
    });
  });

  it('parks cars from the ADD A CAR picker', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /add a car/i })[0]!);
    const dialog = screen.getByRole('dialog', { name: /add a car/i });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Park it — Porsche 911 GT3 RS' }));
    expect(state.actions.addToGarage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'gt3-rs' }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '+1 copy — McLaren 750S' }));
    expect(state.actions.setQuantity).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mclaren-750s' }),
      2,
    );
  });
});

describe('GaragePage focus after actions that remove the focused control', () => {
  function renderAgain(view: ReturnType<typeof renderPage>) {
    view.rerender(
      <MemoryRouter initialEntries={['/garage']} future={ROUTER_FUTURE}>
        <GaragePage />
        <LocationProbe />
      </MemoryRouter>,
    );
  }

  it('focuses the COLLECTION tab when the favorites empty state sends you there', () => {
    state.entries = GARAGE.map((entry) => ({ ...entry, isFavorite: false }));
    renderPage('/garage?tab=favorites');
    const cta = screen.getByRole('button', { name: 'Go to your collection' });
    cta.focus();
    fireEvent.click(cta);

    expect(currentPath()).toBe('/garage');
    // Before: the CTA unmounted with its panel and focus fell back to <body>.
    expect(screen.getByRole('tab', { name: /collection/i })).toHaveFocus();
  });

  it('focuses the ALL chip after "Show all cars" in an empty filter', () => {
    state.entries = GARAGE.map((entry) => ({ ...entry, isFavorite: false }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /favorites · 0/i }));
    const showAll = screen.getByRole('button', { name: 'Show all cars' });
    showAll.focus();
    fireEvent.click(showAll);

    expect(screen.getByRole('button', { name: /^all · 3/i })).toHaveFocus();
  });

  it('keeps focus in the series card after "I have it" parks a missing car', () => {
    state.entries = [
      makeEntry({ productId: 'revuelto', addedAt: NOW - DAY }),
      makeEntry({ productId: 'swift-rally', addedAt: NOW - 3 * DAY }),
    ];
    state.actions.addToGarage.mockImplementation((product: Product) => {
      state.entries = [...state.entries, makeEntry({ productId: product.id, addedAt: NOW })];
    });
    const view = renderPage();

    const haveIt = (name: string) =>
      screen.getByRole('button', { name: `I have it — park ${name} in your garage` });
    const mclaren = haveIt('McLaren 750S');
    mclaren.focus();
    fireEvent.click(mclaren);
    renderAgain(view);
    // The McLaren row is gone; the next missing car's action takes focus (not <body>).
    expect(haveIt('Porsche 911 GT3 RS')).toHaveFocus();

    fireEvent.click(haveIt('Porsche 911 GT3 RS'));
    renderAgain(view);
    // Series complete: no rows left, so focus lands on the series link.
    expect(screen.getByRole('link', { name: 'HW Exotics' })).toHaveFocus();
  });
});
