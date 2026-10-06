import { beforeEach, describe, expect, it } from 'vitest';
import type { CartItem, Product } from '@/types';
import { CART_STORAGE_KEY, useCartStore } from './cartStore';

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
    useCartStore.setState({ catalogueSyncedAt: 0 });
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

  describe('catalogueSyncedAt', () => {
    const product = (overrides: Partial<Product> = {}): Product =>
      ({
        id: 'p1',
        slug: 'twin-mill',
        name: 'Twin Mill',
        price: 349,
        stock: 5,
        images: [],
        primaryImage: '/placeholders/car-generic.svg',
        seriesName: 'HW Legends',
        collectionNumber: 7,
        isActive: true,
        ...overrides,
      }) as Product;

    const storedBlob = () =>
      JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '{}') as {
        state?: { items?: CartItem[]; catalogueSyncedAt?: number };
      };

    it('reconcile(products, t) refreshes snapshots and stores catalogueSyncedAt = t', () => {
      useCartStore.getState().addItem(line());
      useCartStore.getState().reconcile([product()], 1_000);
      expect(useCartStore.getState().items[0]?.price).toBe(349);
      expect(useCartStore.getState().catalogueSyncedAt).toBe(1_000);
      expect(storedBlob().state?.catalogueSyncedAt).toBe(1_000);
    });

    it('never moves the stamp backwards and does not write when nothing changed', () => {
      useCartStore.getState().addItem(line());
      useCartStore.getState().reconcile([product()], 5_000);
      useCartStore.getState().reconcile([product({ price: 399 })], 4_000);
      expect(useCartStore.getState().items[0]?.price).toBe(399);
      expect(useCartStore.getState().catalogueSyncedAt).toBe(5_000);
      useCartStore.getState().reconcile([product({ price: 399 })], 9_000);
      expect(useCartStore.getState().catalogueSyncedAt).toBe(5_000);
    });

    it('clear() keeps the stamp', () => {
      useCartStore.getState().addItem(line());
      useCartStore.getState().reconcile([product()], 2_000);
      useCartStore.getState().clear();
      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().catalogueSyncedAt).toBe(2_000);
    });

    it('rehydrates a legacy v1 blob without the field as 0', async () => {
      useCartStore.setState({ catalogueSyncedAt: 7_000 });
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ state: { items: [{ ...line(), qty: 2 }] }, version: 1 }),
      );
      await useCartStore.persist.rehydrate();
      expect(useCartStore.getState().items[0]?.qty).toBe(2);
      expect(useCartStore.getState().catalogueSyncedAt).toBe(0);
    });

    it('round-trips a numeric stamp and ignores invalid ones', async () => {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          state: { items: [{ ...line(), qty: 1 }], catalogueSyncedAt: 123 },
          version: 1,
        }),
      );
      await useCartStore.persist.rehydrate();
      expect(useCartStore.getState().catalogueSyncedAt).toBe(123);

      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ state: { items: [], catalogueSyncedAt: 'soon' }, version: 1 }),
      );
      await useCartStore.persist.rehydrate();
      expect(useCartStore.getState().catalogueSyncedAt).toBe(0);
    });
  });
});
