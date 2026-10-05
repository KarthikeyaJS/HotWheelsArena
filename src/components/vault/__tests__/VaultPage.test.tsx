import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTER_FUTURE, makeVaultProduct } from '@/components/content/__tests__/fixtures';
import VaultPage from '@/pages/VaultPage';
import type { Product } from '@/types';

const state: { data: Product[] | undefined; isPending: boolean; isError: boolean } = {
  data: undefined,
  isPending: false,
  isError: false,
};
const refetch = vi.fn();

vi.mock('@/hooks/useProducts', () => ({
  productSelectors: {
    vault: (products: Product[]) => products.filter((product) => product.isVault),
  },
  useProducts: (select?: (products: Product[]) => Product[]) => ({
    data: state.data && select ? select(state.data) : state.data,
    isPending: state.isPending,
    isError: state.isError,
    error: state.isError ? new Error('offline') : null,
    refetch,
  }),
}));

vi.mock('@/components/product/VaultCard', () => ({
  VaultCard: ({ product }: { product: Product }) => (
    <article data-testid="vault-card">{product.name}</article>
  ),
}));

vi.mock('@/components/newsletter/NewsletterForm', () => ({
  NewsletterForm: ({ variant }: { variant?: string }) => (
    <form aria-label="Newsletter sign-up" data-variant={variant} />
  ),
}));

const VAULT: Product[] = [
  makeVaultProduct('countach', 'Lamborghini Countach', 37, 1, 500),
  makeVaultProduct('gt40', 'Ford GT40 Mk II', 3, 3, 50),
  makeVaultProduct('rx7', 'Mazda RX-7', 48, 64, 1000),
  makeVaultProduct('turbo', 'Porsche 930 Turbo', 5, 7, 100),
];

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.search}</p>;
}

function renderVault(initialEntry = '/vault') {
  return render(
    <MemoryRouter future={ROUTER_FUTURE} initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/vault"
          element={
            <>
              <VaultPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const cardNames = () => screen.queryAllByTestId('vault-card').map((card) => card.textContent);

beforeEach(() => {
  state.data = VAULT;
  state.isPending = false;
  state.isError = false;
  refetch.mockReset();
});

describe('VaultPage', () => {
  it('renders the hero, status HUD and editions sorted by fewest remaining', () => {
    renderVault();
    expect(screen.getByRole('heading', { level: 1, name: /the collector’s vault/i })).toBeVisible();
    expect(document.title).toMatch(/^The Vault/);
    expect(cardNames()).toEqual([
      'Ford GT40 Mk II',
      'Porsche 930 Turbo',
      'Lamborghini Countach',
      'Mazda RX-7',
    ]);
    // HUD: 4 editions, 93 cars left
    expect(screen.getByText('93')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'How editions work' })).toBeVisible();
    expect(screen.getByRole('form', { name: 'Newsletter sign-up' })).toHaveAttribute(
      'data-variant',
      'inline',
    );
  });

  it('re-sorts by most remaining and stores the choice in the URL', async () => {
    const user = userEvent.setup();
    renderVault();
    await user.selectOptions(screen.getByLabelText('Sort by'), 'remaining-desc');
    expect(cardNames()).toEqual([
      'Mazda RX-7',
      'Lamborghini Countach',
      'Porsche 930 Turbo',
      'Ford GT40 Mk II',
    ]);
    expect(screen.getByTestId('location')).toHaveTextContent('?sort=remaining-desc');
  });

  it('filters with toggle chips (aria-pressed) and shows counts', async () => {
    const user = userEvent.setup();
    state.data = [...VAULT, makeVaultProduct('gone', 'Sold Out Special', 0, 9, 250)];
    renderVault();

    const group = screen.getByRole('group', { name: 'Filter editions' });
    const all = within(group).getByRole('button', { name: /^all/i });
    const soldOut = within(group).getByRole('button', { name: /sold out/i });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(soldOut).toHaveTextContent('1');
    // sold-out editions sink to the end of "all"
    expect(cardNames().at(-1)).toBe('Sold Out Special');

    await user.click(soldOut);
    expect(soldOut).toHaveAttribute('aria-pressed', 'true');
    expect(cardNames()).toEqual(['Sold Out Special']);
    expect(screen.getByTestId('location')).toHaveTextContent('?filter=sold-out');

    await user.click(within(group).getByRole('button', { name: /available/i }));
    expect(cardNames()).not.toContain('Sold Out Special');
    expect(cardNames()).toHaveLength(4);
  });

  it('shows a friendly empty state when no edition is sold out', async () => {
    const user = userEvent.setup();
    renderVault('/vault?filter=sold-out');
    expect(cardNames()).toEqual([]);
    expect(screen.getByRole('heading', { name: /no sold-out editions — yet/i })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /show all editions/i }));
    expect(cardNames()).toHaveLength(4);
    expect(screen.getByTestId('location')).toHaveTextContent('');
  });

  it('shows the error state with a retry', async () => {
    const user = userEvent.setup();
    state.data = undefined;
    state.isError = true;
    renderVault();
    expect(screen.getByRole('alert')).toHaveTextContent(/vault door jammed/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows a loading skeleton while the catalogue loads', () => {
    state.data = undefined;
    state.isPending = true;
    renderVault();
    expect(screen.getByText('Opening the vault…')).toBeInTheDocument();
  });
});
