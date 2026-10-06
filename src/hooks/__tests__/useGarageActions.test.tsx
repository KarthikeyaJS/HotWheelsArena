import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingAuthAction, runPendingAuthAction } from '@/hooks/useRequireAuthAction';
import { useGarageStore } from '@/store/garageStore';
import { useToastStore } from '@/store/toastStore';
import type { GarageEntry } from '@/types';
import { useGarageActions } from '../useGarageActions';

const mocks = vi.hoisted(() => ({
  uid: null as string | null,
  fetchGarage: vi.fn<(uid: string) => Promise<GarageEntry[]>>(),
  addGarageEntry: vi.fn<(uid: string, productId: string) => Promise<void>>(),
  removeGarageEntry: vi.fn<(uid: string, productId: string) => Promise<void>>(),
  setGarageFavorite:
    vi.fn<(uid: string, productId: string, isFavorite: boolean) => Promise<void>>(),
  setGarageQuantity: vi.fn<(uid: string, productId: string, quantity: number) => Promise<void>>(),
}));

vi.mock('@/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/auth')>()),
  getCurrentUid: () => mocks.uid,
}));

vi.mock('@/services/firestore/garage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/firestore/garage')>()),
  fetchGarage: mocks.fetchGarage,
  addGarageEntry: mocks.addGarageEntry,
  removeGarageEntry: mocks.removeGarageEntry,
  setGarageFavorite: mocks.setGarageFavorite,
  setGarageQuantity: mocks.setGarageQuantity,
}));

const CAR = { id: 'sunstrike-concept', name: 'Sunstrike Concept' };
const parked = (overrides: Partial<GarageEntry> = {}): GarageEntry => ({
  productId: CAR.id,
  addedAt: 1,
  source: 'manual',
  isFavorite: false,
  quantity: 1,
  ...overrides,
});

let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const toasts = () => useToastStore.getState().toasts;
const writes = () =>
  mocks.addGarageEntry.mock.calls.length +
  mocks.removeGarageEntry.mock.calls.length +
  mocks.setGarageFavorite.mock.calls.length +
  mocks.setGarageQuantity.mock.calls.length;

async function signInAndRunQueued(uid: string) {
  mocks.uid = uid;
  await act(async () => {
    expect(runPendingAuthAction()).toBe(true);
    await Promise.resolve();
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mocks.uid = null;
  mocks.fetchGarage.mockReset();
  for (const write of [
    mocks.addGarageEntry,
    mocks.removeGarageEntry,
    mocks.setGarageFavorite,
    mocks.setGarageQuantity,
  ]) {
    write.mockReset().mockResolvedValue(undefined);
  }
  useGarageStore.getState().reset();
  useToastStore.getState().clear();
});

afterEach(() => {
  clearPendingAuthAction();
  client.clear();
});

describe('useGarageActions — action queued while signed out', () => {
  it('does not re-park a car that is already in the garage (no write, no error)', async () => {
    mocks.fetchGarage.mockResolvedValue([parked()]);
    const { result } = renderHook(() => useGarageActions(), { wrapper });

    act(() => result.current.addToGarage(CAR));
    await signInAndRunQueued('uid-2');
    await waitFor(() => expect(mocks.fetchGarage).toHaveBeenCalledWith('uid-2'));
    await flush();

    expect(writes()).toBe(0);
    expect(toasts().filter((toast) => toast.variant === 'error')).toEqual([]);
  });

  it('parks a car that is not in the garage yet', async () => {
    mocks.fetchGarage.mockResolvedValue([]);
    const { result } = renderHook(() => useGarageActions(), { wrapper });

    act(() => result.current.addToGarage(CAR));
    await signInAndRunQueued('uid-2');

    await waitFor(() => expect(mocks.addGarageEntry).toHaveBeenCalledWith('uid-2', CAR.id));
    expect(writes()).toBe(1);
  });

  it('a favorite for a car not in the garage says so and writes nothing', async () => {
    mocks.fetchGarage.mockResolvedValue([]);
    const { result } = renderHook(() => useGarageActions(), { wrapper });

    act(() => result.current.toggleFavorite(CAR));
    await signInAndRunQueued('uid-2');

    await waitFor(() =>
      expect(toasts().map((toast) => toast.title)).toContain('Not in your garage yet'),
    );
    expect(writes()).toBe(0);
  });

  it('a favorite queued signed out marks a parked car once, and skips one already marked', async () => {
    mocks.fetchGarage.mockResolvedValue([parked({ isFavorite: false })]);
    const first = renderHook(() => useGarageActions(), { wrapper });
    act(() => first.result.current.toggleFavorite(CAR));
    await signInAndRunQueued('uid-2');
    await waitFor(() =>
      expect(mocks.setGarageFavorite).toHaveBeenCalledWith('uid-2', CAR.id, true),
    );
    first.unmount();

    // A different collector whose car is already a favorite.
    client.clear();
    useGarageStore.getState().reset();
    mocks.uid = null;
    mocks.setGarageFavorite.mockClear();
    mocks.fetchGarage.mockResolvedValue([parked({ isFavorite: true })]);
    const second = renderHook(() => useGarageActions(), { wrapper });
    act(() => second.result.current.toggleFavorite(CAR));
    await signInAndRunQueued('uid-3');
    await waitFor(() => expect(mocks.fetchGarage).toHaveBeenCalledWith('uid-3'));
    await flush();
    expect(mocks.setGarageFavorite).not.toHaveBeenCalled();
  });
});

describe('useGarageActions — signed in and hydrated', () => {
  it('uses the mirror (no read) and still parks / un-parks', async () => {
    mocks.uid = 'uid-2';
    useGarageStore.getState().hydrateGarage([]);
    const { result } = renderHook(() => useGarageActions(), { wrapper });

    act(() => result.current.addToGarage(CAR));
    await waitFor(() => expect(mocks.addGarageEntry).toHaveBeenCalledTimes(1));
    act(() => result.current.removeFromGarage(CAR));
    await waitFor(() => expect(mocks.removeGarageEntry).toHaveBeenCalledTimes(1));
    expect(mocks.fetchGarage).not.toHaveBeenCalled();
  });
});
