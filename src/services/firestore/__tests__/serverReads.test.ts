import { FirebaseError } from 'firebase/app';
import { getDoc, getDocs, type DocumentSnapshot, type QuerySnapshot } from 'firebase/firestore';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@shared/types';
import { fetchGarage } from '../garage';
import { fetchOrders } from '../orders';
import {
  fetchActiveProducts,
  fetchProductBySlug,
  fetchProductsByIds,
  productsCollection,
} from '../products';
import { getDocsOnline, isUnavailableError, OFFLINE_READ_MESSAGE } from '../serverReads';

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return { ...actual, getDocs: vi.fn(), getDoc: vi.fn() };
});

const getDocsMock = vi.mocked(getDocs);
const getDocMock = vi.mocked(getDoc);

function snapshot<T>(rows: T[], fromCache: boolean): QuerySnapshot<T> {
  return {
    metadata: { fromCache, hasPendingWrites: false },
    docs: rows.map((row) => ({ data: () => row })),
    size: rows.length,
    empty: rows.length === 0,
  } as unknown as QuerySnapshot<T>;
}

const product = (id: string, slug: string): Product =>
  ({ id, slug, createdAt: 1, collectionNumber: 1 }) as unknown as Product;

afterEach(() => {
  getDocsMock.mockReset();
  getDocMock.mockReset();
});

describe('getDocsOnline', () => {
  it('rejects with unavailable when the SDK answered from the local cache', async () => {
    getDocsMock.mockResolvedValue(snapshot([], true));
    const error = await getDocsOnline(productsCollection()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FirebaseError);
    expect(error).toMatchObject({ code: 'unavailable', message: OFFLINE_READ_MESSAGE });
    expect(isUnavailableError(error)).toBe(true);
  });

  it('returns a server snapshot unchanged (even when empty)', async () => {
    const server = snapshot([], false);
    getDocsMock.mockResolvedValue(server);
    await expect(getDocsOnline(productsCollection())).resolves.toBe(server);
  });

  it('passes SDK rejections through', async () => {
    getDocsMock.mockRejectedValue(new FirebaseError('permission-denied', 'nope'));
    await expect(getDocsOnline(productsCollection())).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('services read through getDocsOnline', () => {
  it('fetchActiveProducts rejects on a cached snapshot instead of resolving []', async () => {
    getDocsMock.mockResolvedValue(snapshot([product('a', 'a')], true));
    await expect(fetchActiveProducts()).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('fetchProductBySlug rejects on a cached-empty snapshot (no false 404)', async () => {
    getDocsMock.mockResolvedValue(snapshot([], true));
    await expect(fetchProductBySlug('porsche-911-gt3-rs')).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('fetchProductBySlug resolves null only for a server-confirmed miss', async () => {
    getDocsMock.mockResolvedValue(snapshot([], false));
    await expect(fetchProductBySlug('nope')).resolves.toBeNull();
  });

  it('fetchProductBySlug resolves the server match', async () => {
    const match = product('p1', 'porsche-911-gt3-rs');
    getDocsMock.mockResolvedValue(snapshot([match], false));
    await expect(fetchProductBySlug('porsche-911-gt3-rs')).resolves.toBe(match);
  });

  it('user lists (garage, orders) reject on cached snapshots too', async () => {
    getDocsMock.mockResolvedValue(snapshot([], true));
    await expect(fetchGarage('uid-1')).rejects.toMatchObject({ code: 'unavailable' });
    await expect(fetchOrders('uid-1')).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('fetchProductsByIds', () => {
  const docSnapshot = (value: Product | null) =>
    ({
      exists: () => value !== null,
      data: () => value ?? undefined,
    }) as unknown as DocumentSnapshot<Product>;

  it('rejects when every read failed because the backend is unreachable', async () => {
    getDocMock.mockRejectedValue(new FirebaseError('unavailable', 'client is offline'));
    await expect(fetchProductsByIds(['a', 'b'])).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('skips unreadable / missing products otherwise', async () => {
    const a = product('a', 'a');
    getDocMock
      .mockResolvedValueOnce(docSnapshot(a))
      .mockRejectedValueOnce(new FirebaseError('permission-denied', 'retired'))
      .mockResolvedValueOnce(docSnapshot(null));
    await expect(fetchProductsByIds(['a', 'b', 'c'])).resolves.toEqual([a]);
  });

  it('resolves [] when every read was denied (retired cars), and for no ids', async () => {
    getDocMock.mockRejectedValue(new FirebaseError('permission-denied', 'retired'));
    await expect(fetchProductsByIds(['x'])).resolves.toEqual([]);
    await expect(fetchProductsByIds([])).resolves.toEqual([]);
  });
});
