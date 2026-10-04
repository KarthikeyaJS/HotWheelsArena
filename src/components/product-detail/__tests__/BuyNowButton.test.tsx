import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeProduct, ROUTER_FUTURE } from '@/components/product/__tests__/fixtures';
import { ROUTES } from '@/config/routes';
import { toCartItem } from '@/lib/product';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { BuyNowButton } from '../BuyNowButton';

function renderAt(product: Product) {
  return render(
    <MemoryRouter initialEntries={[`/product/${product.slug}`]} future={ROUTER_FUTURE}>
      <Routes>
        <Route path={ROUTES.product} element={<BuyNowButton product={product} />} />
        <Route path={ROUTES.checkout} element={<h1>Checkout page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('BuyNowButton', () => {
  it('adds one to the pit stop and navigates to checkout', async () => {
    const user = userEvent.setup();
    const product = makeProduct();
    renderAt(product);

    await user.click(screen.getByRole('button', { name: 'Buy Twin Mill now' }));

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ productId: product.id, qty: 1, price: product.price }),
    ]);
    expect(await screen.findByRole('heading', { name: 'Checkout page' })).toBeInTheDocument();
  });

  it('keeps the chosen quantity when the car is already in the cart', async () => {
    const user = userEvent.setup();
    const product = makeProduct();
    useCartStore.getState().addItem(toCartItem(product), 3);
    renderAt(product);

    await user.click(screen.getByRole('button', { name: 'Buy Twin Mill now' }));

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.qty).toBe(3);
    expect(await screen.findByRole('heading', { name: 'Checkout page' })).toBeInTheDocument();
  });

  it('is disabled and does nothing when the car is sold out', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ stock: 0 });
    renderAt(product);

    const button = screen.getByRole('button', { name: 'Sold out – Twin Mill' });
    expect(button).toBeDisabled();
    await user.click(button);

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Checkout page' })).not.toBeInTheDocument();
  });
});
