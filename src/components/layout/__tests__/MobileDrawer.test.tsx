import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/providers/authContext';
import { useUiStore } from '@/store/uiStore';
import { MobileDrawer } from '../MobileDrawer';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

const SIGNED_OUT: AuthContextValue = {
  user: null,
  profile: null,
  status: 'signed-out',
  isProfileLoading: false,
  isSigningIn: false,
  signIn: () => Promise.resolve(null),
  signOut: () => Promise.resolve(),
};

function renderDrawerAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={ROUTER_FUTURE}>
      <AuthContext.Provider value={SIGNED_OUT}>
        <MobileDrawer />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('MobileDrawer', () => {
  beforeEach(() => {
    useUiStore.setState({ mobileNavOpen: false });
  });

  it('marks the current section and closes when its link is tapped (same URL)', () => {
    renderDrawerAt('/vault');
    act(() => useUiStore.getState().openMobileNav());
    const nav = screen.getByRole('navigation', { name: 'Mobile primary' });
    const vault = within(nav).getByRole('link', { name: /Vault/ });
    expect(vault).toHaveAttribute('aria-current', 'page');

    fireEvent.click(vault);
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });

  it('closes when a pit link to the current page is tapped', () => {
    renderDrawerAt('/cart');
    act(() => useUiStore.getState().openMobileNav());
    fireEvent.click(screen.getByRole('link', { name: 'Pit stop' }));
    expect(useUiStore.getState().mobileNavOpen).toBe(false);
  });
});
