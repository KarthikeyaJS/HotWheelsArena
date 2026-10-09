import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CartPage from '@/pages/CartPage';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';
import type { Product } from '@/types';
import { useCartNoticeStore } from '../cartNoticeStore';
import { makeCartItem, makeProduct, makeSettings, ROUTER_FUTURE } from './fixtures';

// Not featured → the empty pit stop renders no suggestions rail (no product-card hooks needed).
const gt3 = makeProduct({ isFeatured: false });
const thar = makeProduct({
  id: 'mahindra-thar',
  name: 'Mahindra Thar',
  price: 229,
  stock: 134,
  rarity: 'common',
  isFeatured: false,
});

const mocks = vi.hoisted(() => ({
  catalogue: [] as Product[],
  refetch: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/hooks/useProducts', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/useProducts')>();
  return {
    ...original,
    useProducts: <T,>(select?: (products: Product[]) => T) => ({
      data: select ? select(mocks.catalogue) : mocks.catalogue,
      isPending: false,
      isSuccess: true,
      isFetching: false,
      isStale: false,
      isError: false,
      error: null,
      dataUpdatedAt: Date.now(),
      refetch: mocks.refetch,
    }),
  };
});

vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    data: makeSettings(),
    isPlaceholderData: false,
    isFetching: false,
    refetch: mocks.refetch,
  }),
}));

function renderCart() {
  return render(
    <MemoryRouter initialEntries={['/cart']} future={ROUTER_FUTURE}>
      <CartPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.catalogue = [gt3, thar];
  useToastStore.getState().clear();
  useCartNoticeStore.getState().dismiss();
});

afterEach(() => {
  useCartStore.setState({ items: [] });
});

describe('CartPage', () => {
  it('counts units in the eyebrow with a proper plural ("2 UNITS", not "2 UNITs")', () => {
    useCartStore.setState({ items: [makeCartItem(gt3, { qty: 2 })] });
    renderCart();
    expect(screen.getByText('PIT STOP · 2 UNITS')).toBeInTheDocument();
  });

  it('keeps focus on the page when the last Undo row is dismissed from an empty pit stop', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [makeCartItem(gt3)] });
    renderCart();

    await user.click(
      screen.getByRole('button', { name: 'Remove Porsche 911 GT3 RS from your pit stop' }),
    );
    const undo = await screen.findByRole('button', { name: /^Undo — put Porsche 911 GT3 RS/ });
    await waitFor(() => expect(undo).toHaveFocus());
    expect(screen.getByRole('heading', { name: /your pit stop is empty/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Dismiss the removed Porsche/ }));

    // Before: focus fell back to <body> (the lines heading does not exist in the empty view).
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Explore the garage' })).toHaveFocus(),
    );
  });

  it('moves focus to the next Undo row when one of several is dismissed while empty', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [makeCartItem(gt3), makeCartItem(thar)] });
    renderCart();

    await user.click(
      screen.getByRole('button', { name: 'Remove Porsche 911 GT3 RS from your pit stop' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Remove Mahindra Thar from your pit stop' }),
    );
    await user.click(screen.getByRole('button', { name: /^Dismiss the removed Mahindra Thar/ }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Undo — put Porsche 911 GT3 RS/ })).toHaveFocus(),
    );
  });

  it('keeps focus on the page after "Remove unavailable" empties the pit stop', async () => {
    const user = userEvent.setup();
    mocks.catalogue = [thar]; // the GT3 is no longer listed → unavailable
    useCartStore.setState({ items: [makeCartItem(gt3)] });
    renderCart();

    await user.click(await screen.findByRole('button', { name: 'Remove unavailable' }));

    expect(useCartStore.getState().items).toHaveLength(0);
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Explore the garage' })).toHaveFocus(),
    );
  });

  it('moves focus to the lines heading after "Remove unavailable" when cars remain', async () => {
    const user = userEvent.setup();
    mocks.catalogue = [thar];
    useCartStore.setState({ items: [makeCartItem(gt3), makeCartItem(thar)] });
    renderCart();

    await user.click(await screen.findByRole('button', { name: 'Remove unavailable' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /on the lift · 1 car/i })).toHaveFocus(),
    );
  });
});
