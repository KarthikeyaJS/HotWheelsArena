import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavLinks } from '../NavLinks';

const renderAt = (path: string) =>
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <NavLinks />
    </MemoryRouter>,
  );

const current = (): string[] =>
  screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent ?? '');

describe('NavLinks', () => {
  it('renders the five primary links in a labelled nav', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Garage',
      'Collections',
      'New Drops',
      'Vault',
      'My Garage',
    ]);
    expect(current()).toEqual([]);
  });

  it('tells /shop (Garage) and /shop?view=new (New Drops) apart', () => {
    renderAt('/shop');
    expect(current()).toEqual(['Garage']);
  });

  it('marks New Drops for the new view only', () => {
    renderAt('/shop?view=new');
    expect(current()).toEqual(['New Drops']);
  });

  it('marks section links for nested routes', () => {
    renderAt('/collections/hw-exotics-2026');
    expect(current()).toEqual(['Collections']);
  });

  it('marks My Garage on the wishlist too', () => {
    renderAt('/wishlist');
    expect(current()).toEqual(['My Garage']);
  });
});
