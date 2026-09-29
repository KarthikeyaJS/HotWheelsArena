import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatINR } from '@/lib/format';
import { useCartStore } from '@/store/cartStore';
import { useGarageStore } from '@/store/garageStore';
import { useToastStore } from '@/store/toastStore';
import type { Product } from '@/types';
import { ProductCard } from '../ProductCard';
import { makeProduct, ROUTER_FUTURE } from './fixtures';

const toggleWishlist = vi.fn();

vi.mock('@/hooks/useWishlistActions', () => ({
  useWishlistActions: () => ({
    toggleWishlist,
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    isPending: false,
    pendingProductId: null,
  }),
}));

function renderCard(product: Product) {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  toggleWishlist.mockReset();
  useCartStore.setState({ items: [] });
  useGarageStore.getState().reset();
  useToastStore.getState().clear();
});

describe('ProductCard', () => {
  it('renders the collector fields, price and a link to the product page', () => {
    const product = makeProduct({ compareAtPrice: 1599 });
    renderCard(product);

    const card = screen.getByRole('article');
    const link = within(card).getByRole('link', { name: 'Twin Mill' });
    expect(link).toHaveAttribute('href', '/product/twin-mill-orange');
    expect(within(card).getByRole('heading', { level: 3, name: 'Twin Mill' })).toBeInTheDocument();

    expect(card).toHaveTextContent('SERIES 03');
    expect(card).toHaveTextContent('#142');
    expect(card).toHaveTextContent(formatINR(1299));
    expect(card).toHaveTextContent(formatINR(1599));
    expect(card).toHaveTextContent('Rarity: RARE');
    expect(card).toHaveTextContent('Collector edition');
    expect(card).toHaveTextContent('IN STOCK');
    // Mini-meta: scale · year · type
    expect(card).toHaveTextContent('1:64');
    expect(card).toHaveTextContent('2025');
    expect(card).toHaveTextContent('Concept');

    expect(
      within(card).getByRole('img', { name: 'Rated 4.5 out of 5, 12 ratings' }),
    ).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Orange Twin Mill concept car' })).toHaveAttribute(
      'loading',
      'lazy',
    );
    expect(within(card).getByRole('button', { name: 'Add Twin Mill to cart' })).toBeEnabled();
    expect(
      within(card).getByRole('button', { name: 'Save Twin Mill to wishlist' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows "No reviews yet" and hides the collector tag for unrated, low-score cars', () => {
    renderCard(makeProduct({ ratingCount: 0, ratingAvg: 0, collectorScore: 5 }));
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(screen.queryByText('Collector edition')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Rated/ })).not.toBeInTheDocument();
  });

  it('keeps the actions reachable and in order: name link → cart → wishlist', async () => {
    const user = userEvent.setup();
    renderCard(makeProduct());
    await user.tab();
    expect(screen.getByRole('link', { name: 'Twin Mill' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Add Twin Mill to cart' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save Twin Mill to wishlist' })).toHaveFocus();
  });

  it('adds to the cart and toggles the wishlist from the card', async () => {
    const user = userEvent.setup();
    const product = makeProduct();
    renderCard(product);

    await user.click(screen.getByRole('button', { name: 'Add Twin Mill to cart' }));
    expect(useCartStore.getState().items[0]).toMatchObject({ productId: product.id, qty: 1 });

    await user.click(screen.getByRole('button', { name: 'Save Twin Mill to wishlist' }));
    expect(toggleWishlist).toHaveBeenCalledWith({ id: product.id, name: product.name });
  });

  it('reflects a wishlisted car with aria-pressed', () => {
    const product = makeProduct();
    useGarageStore.getState().setWishlisted(product.id, true);
    renderCard(product);
    expect(screen.getByRole('button', { name: 'Save Twin Mill to wishlist' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('renders the sold-out state with a disabled cart button', () => {
    renderCard(makeProduct({ stock: 0 }));
    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sold out/ })).toBeDisabled();
  });
});
