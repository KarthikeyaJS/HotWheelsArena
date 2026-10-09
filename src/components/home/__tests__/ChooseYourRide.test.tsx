import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category, Product } from '@/types';
import { ChooseYourRide } from '../ChooseYourRide';
import { REV_TIMINGS } from '../useRevSequence';
import { HOME_PRODUCTS, ROUTER_FUTURE, makeCategory, stubMatchMedia } from './homeFixtures';

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
}

const categoriesState: QueryState<Category[]> = {
  data: undefined,
  isLoading: false,
  isError: false,
};
const productsState: QueryState<Product[]> = {
  data: HOME_PRODUCTS,
  isLoading: false,
  isError: false,
};

vi.mock('@/hooks/useCategories', () => ({
  useCategories: () => ({ ...categoriesState, error: null, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({ ...productsState, error: null, refetch: vi.fn() }),
}));

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderRide() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ChooseYourRide />} />
        <Route path="/shop" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const cardLink = (name: string): HTMLElement =>
  screen.getByRole('link', { name: new RegExp(`^${name}\\b`, 'i') });

let restoreMatchMedia: (() => void) | null = null;

beforeEach(() => {
  categoriesState.data = [
    makeCategory('sports', 1),
    makeCategory('off-road', 2),
    makeCategory('racing', 3),
    makeCategory('special', 4),
    makeCategory('rescue', 5),
    makeCategory('limited', 6),
  ];
  categoriesState.isLoading = false;
  categoriesState.isError = false;
  productsState.data = HOME_PRODUCTS;
  productsState.isLoading = false;
});

afterEach(() => {
  restoreMatchMedia?.();
  restoreMatchMedia = null;
  vi.useRealTimers();
});

describe('ChooseYourRide', () => {
  it('renders the six classes in Firestore order with live counts', () => {
    renderRide();
    const section = screen.getByRole('region', { name: /choose your ride/i });
    expect(section).toHaveAttribute('id', 'collection');
    const links = within(section)
      .getAllByRole('link')
      .filter((link) => link.dataset.category);
    expect(links.map((link) => link.dataset.category)).toEqual([
      'sports',
      'off-road',
      'racing',
      'special',
      'rescue',
      'limited',
    ]);
    expect(cardLink('limited')).toHaveTextContent('02 cars');
    expect(cardLink('off road')).toHaveTextContent('00 cars');
  });

  it('falls back to the built-in classes when the categories query fails', () => {
    categoriesState.data = undefined;
    categoriesState.isError = true;
    renderRide();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(cardLink('rescue')).toHaveAttribute('href', '/shop?category=rescue');
  });

  it('shows the racing skeleton while categories load', () => {
    categoriesState.isLoading = true;
    renderRide();
    expect(screen.getByRole('status')).toHaveTextContent(/rolling the cars out/i);
    expect(screen.queryByRole('link', { name: /^sports/i })).not.toBeInTheDocument();
  });

  it('links every class to its shop view and navigates on click', async () => {
    const user = userEvent.setup();
    renderRide();
    expect(cardLink('sports')).toHaveAttribute('href', '/shop?category=sports');
    await user.click(cardLink('racing'));
    expect(screen.getByTestId('location')).toHaveTextContent('/shop?category=racing');
  });

  it('runs rev → lights → expanded on keyboard focus (desktop) and navigates with Enter', async () => {
    restoreMatchMedia = stubMatchMedia(['min-width: 1024px']);
    const user = userEvent.setup();
    renderRide();

    await user.tab(); // "All cars"
    await user.tab(); // first parked car
    const sports = cardLink('sports');
    expect(sports).toHaveFocus();
    expect(sports).toHaveAttribute('data-phase', 'rev');

    await waitFor(() => expect(sports).toHaveAttribute('data-phase', 'lights'));
    await waitFor(() => expect(sports).toHaveAttribute('data-phase', 'expanded'));

    await user.tab();
    expect(sports).toHaveAttribute('data-phase', 'idle');
    const offRoad = cardLink('off road');
    expect(offRoad).toHaveFocus();
    expect(offRoad).not.toHaveAttribute('data-phase', 'idle');

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/shop?category=off-road');
  });

  it('never expands below desktop and drops back to idle on pointer leave', () => {
    vi.useFakeTimers();
    renderRide();
    const racing = cardLink('racing');
    const item = racing.closest('li');
    if (!item) throw new Error('card item missing');
    fireEvent.mouseEnter(item);
    act(() => {
      vi.advanceTimersByTime(REV_TIMINGS.expand + 50);
    });
    expect(racing).toHaveAttribute('data-phase', 'lights');
    fireEvent.mouseLeave(item);
    expect(racing).toHaveAttribute('data-phase', 'idle');
  });

  it('skips the shake and the expansion under reduced motion (glow only)', () => {
    restoreMatchMedia = stubMatchMedia(['min-width: 1024px', 'prefers-reduced-motion: reduce']);
    vi.useFakeTimers();
    renderRide();
    const special = cardLink('special');
    fireEvent.focus(special);
    expect(special).toHaveAttribute('data-phase', 'lights');
    act(() => {
      vi.advanceTimersByTime(REV_TIMINGS.expand + 50);
    });
    expect(special).toHaveAttribute('data-phase', 'lights');
  });
});
