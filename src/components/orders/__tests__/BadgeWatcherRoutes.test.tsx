import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgeWatcher } from '@/components/gamification/BadgeWatcher';
import { EMPTY_USER_STATS } from '@/config/gamification';
import { useToastStore } from '@/store/toastStore';
import type { AuthStatus, BadgeId, UserProfile } from '@/types';
import { ROUTER_FUTURE } from '../../cart/__tests__/fixtures';

interface MockAuth {
  profile: UserProfile | null;
  status: AuthStatus;
}

const auth = vi.hoisted(() => ({ current: { profile: null, status: 'loading' } as MockAuth }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));

function profile(badges: BadgeId[]): UserProfile {
  return {
    uid: 'uid-1',
    displayName: 'Arjun Mehta',
    email: 'arjun@example.com',
    photoURL: null,
    xp: 0,
    level: 1,
    badges,
    stats: { ...EMPTY_USER_STATS },
    role: 'customer',
    createdAt: 0,
    updatedAt: 0,
  };
}

/** Baseline profile, then a profile update that unlocks FIRST RIDE (as placeOrder does). */
function renderAndUnlock(path: string) {
  auth.current = { profile: profile([]), status: 'signed-in' };
  const tree = () => (
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <BadgeWatcher />
    </MemoryRouter>
  );
  const utils = render(tree());
  auth.current = { profile: profile(['first-ride']), status: 'signed-in' };
  act(() => utils.rerender(tree()));
  return utils;
}

const achievementToasts = () =>
  useToastStore.getState().toasts.filter((item) => item.variant === 'achievement');

beforeEach(() => {
  useToastStore.getState().clear();
});

describe('BadgeWatcher on commerce routes', () => {
  it('skips the unlock modal (keeps the toast) on the order-success page', () => {
    renderAndUnlock('/checkout/success/order-1');
    expect(achievementToasts()).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('skips the modal on /checkout too (the snapshot can land just before navigating)', () => {
    renderAndUnlock('/checkout');
    expect(achievementToasts()).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still shows the modal elsewhere', async () => {
    renderAndUnlock('/garage');
    expect(achievementToasts()).toHaveLength(1);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
