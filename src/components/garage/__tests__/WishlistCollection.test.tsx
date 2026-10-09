import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/store/cartStore';
import type { Product, WishlistEntry } from '@/types';
import { WishlistCollection } from '../WishlistCollection';
import { blockedMoveToast, sortWishlist } from '../wishlistModel';
import { DAY, NOW, ROUTER_FUTURE, makeProduct } from './fixtures';

const state = vi.hoisted(() => ({
  products: [] as Product[],
  entries: [] as WishlistEntry[],
  isLoading: false,
  isError: false,
  removeFromWishlist: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/hooks/useWishlist', () => ({
  useWishlistProducts: () => ({
    products: state.products,
    entries: state.entries,
    isLoading: state.isLoading,
    isError: state.isError,
    error: state.isError ? new Error('boom') : null,
    refetch: state.refetch,
  }),
}));

vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: state.removeFromWishlist,
    isPending: false,
    pendingProductId: null,
  }),
}));

const thar = makeProduct({
  id: 'thar',
  slug: 'thar',
  name: 'Mahindra Thar',
  price: 229,
  stock: 40,
  rarity: 'common',
});
const gr010 = makeProduct({
  id: 'gr010',
  slug: 'gr010',
  name: 'Toyota GR010 Hybrid',
  price: 649,
  stock: 0,
  rarity: 'rare',
});
const amgOne = makeProduct({
  id: 'amg-one',
  slug: 'amg-one',
  name: 'Mercedes-AMG ONE',
  price: 2199,
  stock: 7,
  rarity: 'limited',
});

function renderCollection() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <WishlistCollection />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.products = [thar, gr010, amgOne];
  state.entries = [
    { productId: 'thar', addedAt: NOW },
    { productId: 'gr010', addedAt: NOW - DAY },
    { productId: 'amg-one', addedAt: NOW - 2 * DAY },
  ];
  state.isLoading = false;
  state.isError = false;
  state.removeFromWishlist.mockReset();
  state.refetch.mockReset();
  useCartStore.getState().clear();
});

describe('WishlistCollection', () => {
  it('summarises the wishlist and lists every saved car', () => {
    renderCollection();
    expect(screen.getByText('₹3,077')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Wishlisted cars' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('moves a car to the pit stop and clears it from the wishlist', () => {
    renderCollection();
    fireEvent.click(screen.getByRole('button', { name: 'Move to pit stop — Mahindra Thar' }));
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ productId: 'thar', qty: 1 }),
    ]);
    expect(state.removeFromWishlist).toHaveBeenCalledWith(thar);
  });

  it('does not add a second copy when the car is already in the pit stop', () => {
    useCartStore.getState().addItem({
      productId: 'thar',
      slug: 'thar',
      name: 'Mahindra Thar',
      price: 229,
      image: '/x.svg',
      stock: 40,
    });
    renderCollection();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Move to pit stop — Mahindra Thar (already in your pit stop)',
      }),
    );
    expect(useCartStore.getState().items[0]?.qty).toBe(1);
    expect(state.removeFromWishlist).toHaveBeenCalledWith(thar);
  });

  it('disables moving sold-out cars and moves all in-stock ones at once', () => {
    renderCollection();
    expect(screen.getByRole('button', { name: 'Toyota GR010 Hybrid is sold out' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /move all to pit stop/i }));
    expect(
      useCartStore
        .getState()
        .items.map((item) => item.productId)
        .sort(),
    ).toEqual(['amg-one', 'thar']);
    expect(state.removeFromWishlist).toHaveBeenCalledTimes(2);
  });

  it('removes a car with the trash action', () => {
    renderCollection();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Remove Mercedes-AMG ONE from your wishlist' })[0]!,
    );
    expect(state.removeFromWishlist).toHaveBeenCalledWith(amgOne);
  });

  it('sorts by price', () => {
    renderCollection();
    fireEvent.change(screen.getByLabelText('Sort'), { target: { value: 'price-desc' } });
    const names = within(screen.getByRole('list', { name: 'Wishlisted cars' }))
      .getAllByRole('heading')
      .map((heading) => heading.textContent);
    expect(names).toEqual(['Mercedes-AMG ONE', 'Toyota GR010 Hybrid', 'Mahindra Thar']);
  });

  it('shows the empty state with shop CTAs', () => {
    state.products = [];
    state.entries = [];
    renderCollection();
    expect(screen.getByRole('heading', { name: 'Your wishlist is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore the garage/i })).toHaveAttribute(
      'href',
      '/shop',
    );
  });

  it('shows a retry on errors', () => {
    state.isError = true;
    renderCollection();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(state.refetch).toHaveBeenCalled();
  });
});

describe('sortWishlist', () => {
  const addedAt = new Map<string, number | null>([
    ['thar', NOW],
    ['gr010', null],
    ['amg-one', NOW - DAY],
  ]);
  const ids = (products: Product[]) => products.map((product) => product.id);

  it('orders by saved date (unknown last), price and rarity', () => {
    const list = [thar, gr010, amgOne];
    expect(ids(sortWishlist(list, 'recent', addedAt))).toEqual(['thar', 'amg-one', 'gr010']);
    expect(ids(sortWishlist(list, 'price-asc', addedAt))).toEqual(['thar', 'gr010', 'amg-one']);
    expect(ids(sortWishlist(list, 'rarity', addedAt))).toEqual(['amg-one', 'gr010', 'thar']);
  });

  it('always sinks retired products to the end', () => {
    const retired = { ...amgOne, isActive: false };
    expect(ids(sortWishlist([retired, thar], 'price-desc', addedAt))).toEqual(['thar', 'amg-one']);
  });
});

describe('WishlistCollection focus + refusal copy', () => {
  function renderLive() {
    // The real hook removes the car optimistically; mirror that and re-render.
    state.removeFromWishlist.mockImplementation((product: Product) => {
      state.products = state.products.filter((entry) => entry.id !== product.id);
    });
    const view = renderCollection();
    return () =>
      view.rerender(
        <MemoryRouter future={ROUTER_FUTURE}>
          <WishlistCollection />
        </MemoryRouter>,
      );
  }

  it('moves focus to the next car after removing the focused one', () => {
    const rerender = renderLive();
    const remove = screen.getByRole('button', { name: 'Remove Mahindra Thar from your wishlist' });
    remove.focus();
    fireEvent.click(remove);
    rerender();

    // Next card is sold out, so its first enabled action is Remove (before: focus on <body>).
    expect(
      screen.getByRole('button', { name: 'Remove Toyota GR010 Hybrid from your wishlist' }),
    ).toHaveFocus();
  });

  it('moves focus to what is left after "Move all to pit stop"', () => {
    const rerender = renderLive();
    const moveAll = screen.getByRole('button', { name: /move all to pit stop/i });
    moveAll.focus();
    fireEvent.click(moveAll);
    rerender();

    expect(screen.getByRole('button', { name: /move all to pit stop/i })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remove Toyota GR010 Hybrid from your wishlist' }),
    ).toHaveFocus();
  });

  it('focuses the empty state CTA when the last car leaves', () => {
    state.products = [thar];
    const rerender = renderLive();
    const move = screen.getByRole('button', { name: 'Move to pit stop — Mahindra Thar' });
    move.focus();
    fireEvent.click(move);
    rerender();

    expect(screen.getByRole('link', { name: 'Explore the garage' })).toHaveFocus();
  });

  it('explains why a car could not be moved (not always "Max per collector")', () => {
    expect(blockedMoveToast('sold-out', { name: 'GR010', stock: 0 }).title).toBe('Sold out');
    expect(blockedMoveToast('unavailable', { name: 'GR010', stock: 4 }).title).toBe(
      'No longer available',
    );
    expect(blockedMoveToast('capped', { name: 'GT40', stock: 3 }).title).toBe('Only 3 in stock');
    expect(blockedMoveToast('capped', { name: 'Thar', stock: 40 }).title).toBe(
      'Max per collector reached',
    );
  });
});
