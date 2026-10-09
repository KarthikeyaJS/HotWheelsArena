import { act, fireEvent, render, screen } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/providers/authContext';
import { UserMenu } from '../UserMenu';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

const TEST_USER = {
  uid: 'u1',
  displayName: 'Arjun Mehta',
  email: 'arjun@example.com',
  photoURL: null,
} as unknown as User;

/** Real-ish auth context: `signOut` flips the state like AuthProvider does. */
function AuthHarness({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(TEST_USER);
  const value: AuthContextValue = {
    user,
    profile: null,
    status: user ? 'signed-in' : 'signed-out',
    isProfileLoading: false,
    isSigningIn: false,
    signIn: () => Promise.resolve(null),
    signOut: () => {
      setUser(null);
      return Promise.resolve();
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function renderMenu() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE}>
      <AuthHarness>
        <UserMenu />
      </AuthHarness>
    </MemoryRouter>,
  );
}

describe('UserMenu', () => {
  it('opens on Enter with the first item focused and returns focus on Escape', () => {
    renderMenu();
    const button = screen.getByRole('button', { name: /^Account menu for Arjun Mehta/ });
    act(() => button.focus());
    fireEvent.click(button);
    expect(screen.getByRole('menuitem', { name: 'My Garage' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('moves focus to "Sign in" after signing out (the menu button unmounts)', async () => {
    renderMenu();
    const button = screen.getByRole('button', { name: /^Account menu for Arjun Mehta/ });
    act(() => button.focus());
    fireEvent.keyDown(button, { key: 'ArrowUp' });
    const signOut = screen.getByRole('menuitem', { name: 'Sign out' });
    expect(signOut).toHaveFocus();
    await act(async () => {
      fireEvent.click(signOut);
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /^Sign in/ })).toHaveFocus();
  });
});
