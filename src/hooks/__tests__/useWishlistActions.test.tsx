import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingAuthAction, runPendingAuthAction } from '@/hooks/useRequireAuthAction';
import { useGarageStore } from '@/store/garageStore';
import { useToastStore } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import type { WishlistEntry } from '@/types';
import { useWishlistActions } from '../useWishlistActions';

const mocks = vi.hoisted(() => ({
  uid: null as string | null,
  fetchWishlist: vi.fn<(uid: string) => Promise<WishlistEntry[]>>(),
  addToWishlist: vi.fn<(uid: string, productId: string) => Promise<void>>(),
  removeFromWishlist: vi.fn<(uid: string, productId: string) => Promise<void>>(),
}));

vi.mock('@/services/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/auth')>()),
  getCurrentUid: () => mocks.uid,
}));

vi.mock('@/services/firestore/wishlist', () => ({
  fetchWishlist: mocks.fetchWishlist,
  addToWishlist: mocks.addToWishlist,
  removeFromWishlist: mocks.removeFromWishlist,
}));

const CAR = { id: 'mahindra-thar', name: 'Mahindra Thar' };
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const toastTitles = () => useToastStore.getState().toasts.map((toast) => toast.title);
const errorToasts = () =>
  useToastStore.getState().toasts.filter((toast) => toast.variant === 'error');

/** Signs in as `uid` and runs the action queued behind the SignInPrompt (what AuthProvider does). */
async function signInAndRunQueued(uid: string) {
  mocks.uid = uid;
  await act(async () => {
    expect(runPendingAuthAction()).toBe(true);
    await Promise.resolve();
  });
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mocks.uid = null;
  mocks.fetchWishlist.mockReset();
  mocks.addToWishlist.mockReset().mockResolvedValue(undefined);
  mocks.removeFromWishlist.mockReset().mockResolvedValue(undefined);
  useGarageStore.getState().reset();
  useToastStore.getState().clear();
  useUiStore.getState().closeSignInPrompt();
});

afterEach(() => {
  clearPendingAuthAction();
  client.clear();
});

describe('useWishlistActions — action queued while signed out', () => {
  it('is a quiet no-op when the server wishlist already has the car (no remove, no error)', async () => {
    mocks.fetchWishlist.mockResolvedValue([{ productId: CAR.id, addedAt: 1 }]);
    const { result } = renderHook(() => useWishlistActions(), { wrapper });

    act(() => result.current.toggleWishlist(CAR));
    expect(useUiStore.getState().signInPrompt.open).toBe(true);

    // Signed in, but UserDataSync has not hydrated the mirror yet.
    await signInAndRunQueued('uid-1');
    await waitFor(() => expect(mocks.fetchWishlist).toHaveBeenCalledWith('uid-1'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.addToWishlist).not.toHaveBeenCalled();
    expect(mocks.removeFromWishlist).not.toHaveBeenCalled();
    expect(errorToasts()).toEqual([]);
  });

  it('adds a car that is not saved yet, exactly once', async () => {
    mocks.fetchWishlist.mockResolvedValue([]);
    const { result } = renderHook(() => useWishlistActions(), { wrapper });

    act(() => result.current.toggleWishlist(CAR));
    await signInAndRunQueued('uid-1');

    await waitFor(() => expect(mocks.addToWishlist).toHaveBeenCalledTimes(1));
    expect(mocks.addToWishlist).toHaveBeenCalledWith('uid-1', CAR.id);
    expect(mocks.removeFromWishlist).not.toHaveBeenCalled();
    await waitFor(() => expect(toastTitles()).toContain('Added to wishlist'));
    expect(useGarageStore.getState().wishlist[CAR.id]).toBeDefined();
  });

  it('writes nothing and shows a friendly error when the wishlist cannot be read', async () => {
    mocks.fetchWishlist.mockRejectedValue(
      Object.assign(new Error('offline'), { code: 'unavailable' }),
    );
    const { result } = renderHook(() => useWishlistActions(), { wrapper });

    act(() => result.current.toggleWishlist(CAR));
    await signInAndRunQueued('uid-1');

    await waitFor(() => expect(errorToasts()).toHaveLength(1));
    expect(errorToasts()[0]?.description).toMatch(/can't reach the track/i);
    expect(mocks.addToWishlist).not.toHaveBeenCalled();
    expect(mocks.removeFromWishlist).not.toHaveBeenCalled();
  });
});

describe('useWishlistActions — signed in', () => {
  it('a hydrated toggle still removes a saved car (no extra read)', async () => {
    mocks.uid = 'uid-1';
    useGarageStore.getState().hydrateWishlist([{ productId: CAR.id, addedAt: 1 }]);
    const { result } = renderHook(() => useWishlistActions(), { wrapper });

    act(() => result.current.toggleWishlist(CAR));

    await waitFor(() => expect(mocks.removeFromWishlist).toHaveBeenCalledWith('uid-1', CAR.id));
    expect(mocks.addToWishlist).not.toHaveBeenCalled();
    expect(mocks.fetchWishlist).not.toHaveBeenCalled();
  });

  it('before hydration, a toggle means "add" (what the heart shows) and skips a saved car', async () => {
    mocks.uid = 'uid-1';
    mocks.fetchWishlist.mockResolvedValue([{ productId: CAR.id, addedAt: 1 }]);
    const { result } = renderHook(() => useWishlistActions(), { wrapper });

    act(() => result.current.toggleWishlist(CAR));

    await waitFor(() => expect(mocks.fetchWishlist).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.removeFromWishlist).not.toHaveBeenCalled();
    expect(mocks.addToWishlist).not.toHaveBeenCalled();
  });
});
