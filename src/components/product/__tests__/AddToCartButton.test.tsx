import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_QTY_PER_ITEM } from '@shared/commerce';
import { toCartItem } from '@/lib/product';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/store/toastStore';
import { AddToCartButton } from '../AddToCartButton';
import { makeProduct } from './fixtures';

beforeEach(() => {
  useCartStore.setState({ items: [] });
  useToastStore.getState().clear();
});

describe('AddToCartButton', () => {
  it('adds the product to the pit stop cart and toasts', async () => {
    const user = userEvent.setup();
    const product = makeProduct();
    render(<AddToCartButton product={product} />);

    await user.click(screen.getByRole('button', { name: 'Add Twin Mill to cart' }));

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      qty: 1,
      stock: product.stock,
    });
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ title: 'Added to your pit stop', variant: 'success' }),
    ]);
    // Brief confirmation state right after adding.
    expect(screen.getByRole('button', { name: /^Added/ })).toBeInTheDocument();
  });

  it('shows the IN PIT STOP state for a car already in the cart and still adds +1', async () => {
    const user = userEvent.setup();
    const product = makeProduct();
    useCartStore.getState().addItem(toCartItem(product), 2);
    render(<AddToCartButton product={product} />);

    const button = screen.getByRole('button', { name: /^In pit stop \(2\)/ });
    expect(button).toHaveTextContent(/in pit stop/i);
    await user.click(button);

    expect(useCartStore.getState().items[0]?.qty).toBe(3);
  });

  it('adds `qty` units per click', async () => {
    const user = userEvent.setup();
    render(<AddToCartButton product={makeProduct()} qty={3} />);
    await user.click(screen.getByRole('button', { name: 'Add Twin Mill to cart' }));
    expect(useCartStore.getState().items[0]?.qty).toBe(3);
  });

  it('is disabled when sold out', () => {
    render(<AddToCartButton product={makeProduct({ stock: 0 })} />);
    const button = screen.getByRole('button', { name: /^Sold out/ });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/sold out/i);
  });

  it('is disabled (but stays focusable) once the max or the whole stock is in the cart', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ stock: 2 });
    useCartStore.getState().addItem(toCartItem(product), 2);
    render(<AddToCartButton product={product} />);
    const button = screen.getByRole('button', { name: /^Max in cart/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleName('Max in cart – 2 × Twin Mill, every one in stock');

    await user.click(button);
    expect(useCartStore.getState().items[0]?.qty).toBe(2);
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('keeps keyboard focus on the button when the last unit goes in', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ stock: 1 });
    render(<AddToCartButton product={product} />);
    const button = screen.getByRole('button', { name: 'Add Twin Mill to cart' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(useCartStore.getState().items[0]?.qty).toBe(1);
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('names the stock (not the collector limit) when stock is the cap', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ stock: 3 });
    useCartStore.getState().addItem(toCartItem(product), 1);
    render(<AddToCartButton product={product} qty={5} />);

    await user.click(screen.getByRole('button', { name: /^In pit stop/ }));

    expect(useCartStore.getState().items[0]?.qty).toBe(3);
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({
        title: 'Only 3 in stock',
        description: 'Your pit stop now holds 3 × Twin Mill.',
      }),
    ]);
  });

  it('caps at MAX_QTY_PER_ITEM and says so', async () => {
    const user = userEvent.setup();
    const product = makeProduct({ stock: 50 });
    useCartStore.getState().addItem(toCartItem(product), MAX_QTY_PER_ITEM - 1);
    render(<AddToCartButton product={product} qty={5} />);

    await user.click(screen.getByRole('button', { name: /^In pit stop/ }));

    expect(useCartStore.getState().items[0]?.qty).toBe(MAX_QTY_PER_ITEM);
    expect(useToastStore.getState().toasts).toEqual([
      expect.objectContaining({ title: 'Max per collector reached' }),
    ]);
  });
});
