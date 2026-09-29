import { beforeEach, describe, expect, it } from 'vitest';
import type { CartItem } from '@/types';
import { useCartStore } from './cartStore';

const line = (overrides: Partial<Omit<CartItem, 'qty'>> = {}): Omit<CartItem, 'qty'> => ({
  productId: 'p1',
  slug: 'twin-mill',
  name: 'Twin Mill',
  price: 299,
  image: '/placeholders/car-generic.svg',
  stock: 5,
  ...overrides,
});

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('adds and merges lines', () => {
    const { addItem } = useCartStore.getState();
    expect(addItem(line())).toEqual({ qty: 1, added: 1, limited: false });
    expect(addItem(line(), 2)).toEqual({ qty: 3, added: 2, limited: false });
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('clamps to stock and reports limits', () => {
    const { addItem } = useCartStore.getState();
    expect(addItem(line(), 9)).toEqual({ qty: 5, added: 5, limited: true });
    expect(addItem(line({ productId: 'p2', stock: 0 }))).toEqual({
      qty: 0,
      added: 0,
      limited: true,
    });
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('clamps setQty to 1..min(stock, 10)', () => {
    const { addItem, setQty } = useCartStore.getState();
    addItem(line({ stock: 50 }));
    setQty('p1', 25);
    expect(useCartStore.getState().items[0]?.qty).toBe(10);
    setQty('p1', 0);
    expect(useCartStore.getState().items[0]?.qty).toBe(1);
  });

  it('removes lines and persists to localStorage', () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(line());
    addItem(line({ productId: 'p2' }));
    removeItem('p1');
    expect(useCartStore.getState().items.map((item) => item.productId)).toEqual(['p2']);
    const stored = JSON.parse(window.localStorage.getItem('hwa-cart-v1') ?? '{}') as {
      state?: { items?: CartItem[] };
    };
    expect(stored.state?.items?.map((item) => item.productId)).toEqual(['p2']);
  });
});
