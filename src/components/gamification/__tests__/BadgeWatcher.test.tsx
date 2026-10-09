import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_USER_STATS } from '@/config/gamification';
import { useToastStore } from '@/store/toastStore';
import type { AuthStatus, BadgeId, UserProfile } from '@/types';
import { BadgeWatcher } from '../BadgeWatcher';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

interface MockAuth {
  profile: UserProfile | null;
  status: AuthStatus;
}

const auth = vi.hoisted(() => ({ current: { profile: null, status: 'loading' } as MockAuth }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => auth.current,
}));

function profile(uid: string, badges: BadgeId[], level = 1): UserProfile {
  return {
    uid,
    displayName: 'Arjun Mehta',
    email: `${uid}@example.com`,
    photoURL: null,
    xp: 0,
    level,
    badges,
    stats: { ...EMPTY_USER_STATS },
    role: 'customer',
    createdAt: 0,
    updatedAt: 0,
  };
}

function setAuth(next: MockAuth, rerender: () => void): void {
  auth.current = next;
  act(() => rerender());
}

const toastTitles = (): string[] => useToastStore.getState().toasts.map((item) => item.title);

describe('BadgeWatcher', () => {
  beforeEach(() => {
    auth.current = { profile: null, status: 'loading' };
    useToastStore.getState().clear();
  });

  function renderWatcher(path = '/') {
    const utils = render(
      <MemoryRouter future={ROUTER_FUTURE} initialEntries={[path]}>
        <BadgeWatcher />
      </MemoryRouter>,
    );
    const rerender = (): void =>
      utils.rerender(
        <MemoryRouter future={ROUTER_FUTURE}>
          <BadgeWatcher />
        </MemoryRouter>,
      );
    return { ...utils, rerender };
  }

  it('does not celebrate badges that exist on the first profile load', () => {
    const { rerender } = renderWatcher();
    setAuth(
      { profile: profile('u1', ['first-ride', 'treasure-hunter'], 4), status: 'signed-in' },
      rerender,
    );
    expect(toastTitles()).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('celebrates a live unlock with the unlock modal (no duplicate badge toast)', async () => {
    const { rerender } = renderWatcher();
    setAuth({ profile: profile('u1', ['first-ride'], 2), status: 'signed-in' }, rerender);
    setAuth(
      { profile: profile('u1', ['first-ride', 'treasure-hunter'], 3), status: 'signed-in' },
      rerender,
    );

    expect(toastTitles()).toEqual(['LEVEL UP — LEVEL 03']);
    await waitFor(() =>
      // (jsdom's name computation pads inline elements with spaces; browsers do not)
      expect(
        screen.getByRole('dialog', { name: /badge unlocked\s*:\s*treasure hunter/i }),
      ).toBeInTheDocument(),
    );
  });

  it('toasts the badge instead of opening the modal on modal-free routes', () => {
    const { rerender } = renderWatcher('/checkout');
    setAuth({ profile: profile('u1', ['first-ride'], 2), status: 'signed-in' }, rerender);
    setAuth(
      { profile: profile('u1', ['first-ride', 'treasure-hunter'], 2), status: 'signed-in' },
      rerender,
    );
    expect(toastTitles()).toEqual(['BADGE UNLOCKED']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not fire on a user switch or after signing out and back in', () => {
    const { rerender } = renderWatcher();
    setAuth({ profile: profile('u1', []), status: 'signed-in' }, rerender);
    setAuth(
      { profile: profile('u2', ['first-ride', 'speed-demon'], 6), status: 'signed-in' },
      rerender,
    );
    expect(toastTitles()).toEqual([]);

    setAuth({ profile: null, status: 'signed-out' }, rerender);
    setAuth(
      {
        profile: profile('u2', ['first-ride', 'speed-demon', 'garage-builder'], 7),
        status: 'signed-in',
      },
      rerender,
    );
    expect(toastTitles()).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
