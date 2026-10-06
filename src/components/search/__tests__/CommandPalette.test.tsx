import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecentSearchStore } from '@/store/recentSearchStore';
import { useUiStore } from '@/store/uiStore';
import type { Product } from '@/types';
import { CommandPalette } from '../CommandPalette';

const { catalogue } = vi.hoisted(() => {
  const base = {
    description: '',
    series: 'hw-exotics-2026',
    seriesName: 'HW Exotics',
    seriesNumber: 1,
    year: 2026,
    scale: '1:64',
    color: 'Silver',
    material: 'Die-cast metal',
    vehicleType: 'Supercar',
    category: 'sports',
    rarity: 'common',
    rarityScore: 3,
    collectorScore: 5,
    themedStats: { topSpeedKmh: 300, powerHp: 500 },
    compareAtPrice: null,
    currency: 'INR',
    stock: 20,
    limitedEdition: null,
    images: [],
    primaryImage: '/placeholders/car-generic.svg',
    ratingAvg: 4,
    ratingCount: 3,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: null,
    updatedAt: null,
  } as const;
  const make = (
    id: string,
    name: string,
    makeName: string,
    model: string,
    price: number,
    collectionNumber: number,
  ) => ({ ...base, id, slug: id, name, make: makeName, model, price, collectionNumber });
  return {
    catalogue: [
      make('porsche-911-gt3-rs', 'Porsche 911 GT3 RS', 'Porsche', '911 GT3 RS', 499, 142),
      make('porsche-911-turbo-s', 'Porsche 911 Turbo S', 'Porsche', '911 Turbo S', 599, 143),
      make('nissan-gt-r-nismo', 'Nissan GT-R Nismo', 'Nissan', 'GT-R Nismo', 449, 12),
    ],
  };
});

vi.mock('@/hooks/useProducts', () => ({
  useProducts: () => ({
    data: catalogue as unknown as Product[],
    isPending: false,
    isError: false,
    isSuccess: true,
    isFetching: false,
    error: null,
    refetch: () => Promise.resolve(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPalette(initialPath = '/shop') {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <input aria-label="Page field" />
      <CommandPalette />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const activeOptionText = (): string => {
  const input = screen.getByRole('combobox');
  const id = input.getAttribute('aria-activedescendant');
  return id ? (document.getElementById(id)?.textContent ?? '') : '';
};

beforeAll(async () => {
  // The dialog is code-split (React.lazy); load it once so a cold transform can't time out a test.
  await import('../CommandPaletteDialog');
});

beforeEach(() => {
  useUiStore.setState({ searchOpen: false, mobileNavOpen: false });
  useRecentSearchStore.setState({ recent: [] });
});

describe('CommandPalette', () => {
  it('opens with Ctrl+K as a labelled dialog with the combobox focused', async () => {
    const user = userEvent.setup();
    renderPalette();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.keyboard('{Control>}k{/Control}');

    const dialog = await screen.findByRole('dialog', { name: 'Search the garage' });
    const input = within(dialog).getByRole('combobox', { name: 'Search the garage' });
    // The dialog is lazy and useFocusTrap focuses the input in a passive effect, which can still
    // be pending when findByRole resolves (under full-suite load): wait for it.
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    // Blank query: quick links + categories, nothing active yet.
    expect(screen.getByRole('group', { name: 'Quick links' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Categories' })).toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-activedescendant');
  });

  it('opens with "/" but not while typing in a field', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByRole('textbox', { name: 'Page field' }));
    await user.keyboard('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(document.body);
    await user.keyboard('/');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('shows grouped Make → Models and car suggestions after the debounce', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'pors');

    const makeGroup = await screen.findByRole('group', { name: 'Porsche models' });
    const options = within(makeGroup).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Porsche'),
      expect.stringContaining('911 GT3 RS'),
      expect.stringContaining('911 Turbo S'),
    ]);
    const cars = screen.getByRole('group', { name: 'Cars' });
    expect(within(cars).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('group', { name: 'Nissan models' })).not.toBeInTheDocument();

    // The free-text search option is active first.
    expect(activeOptionText()).toContain('Search the garage for “pors”');
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
  });

  it('navigates options with the arrow keys (wrapping) and Home/End', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'pors');
    await screen.findByRole('group', { name: 'Porsche models' });

    await user.keyboard('{ArrowDown}');
    expect(activeOptionText()).toContain('Porsche');
    await user.keyboard('{End}');
    const all = screen.getAllByRole('option');
    expect(activeOptionText()).toBe(all[all.length - 1]?.textContent);
    await user.keyboard('{ArrowDown}');
    expect(activeOptionText()).toContain('Search the garage for');
    await user.keyboard('{ArrowUp}');
    expect(activeOptionText()).toBe(all[all.length - 1]?.textContent);
    await user.keyboard('{Home}');
    expect(activeOptionText()).toContain('Search the garage for');
  });

  it('selecting a make searches for it, saves a recent search and closes', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'pors');
    await screen.findByRole('group', { name: 'Porsche models' });
    await user.keyboard('{ArrowDown}{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=Porsche');
    expect(useRecentSearchStore.getState().recent).toEqual(['Porsche']);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('selecting a model searches for "make model"', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), '911');
    const turbo = await screen.findByRole('option', { name: /911 Turbo S\s*1 car/i });
    await user.click(turbo);
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/search?q=${encodeURIComponent('Porsche 911 Turbo S')}`,
    );
  });

  it('selecting a car opens its product page', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'nismo');
    const cars = await screen.findByRole('group', { name: 'Cars' });
    await user.click(within(cars).getByRole('option', { name: /Nissan GT-R Nismo/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/product/nissan-gt-r-nismo');
  });

  it('Enter on free text goes to the search page (live text, not the debounced one)', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'blue supercar{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/search?q=${encodeURIComponent('blue supercar')}`,
    );
  });

  it('shows a no-match state with suggestions', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'zzqx');
    expect(await screen.findByText('No cars match')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Porsche' }));
    expect(screen.getByRole('combobox')).toHaveValue('Porsche');
  });

  it('lists recent searches when blank and can clear them', async () => {
    useRecentSearchStore.setState({ recent: ['Rally', 'Porsche'] });
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    const recent = await screen.findByRole('group', { name: 'Recent searches' });
    expect(
      within(recent)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Rally', 'Porsche']);
    await user.click(screen.getByRole('button', { name: /Clear history/ }));
    expect(useRecentSearchStore.getState().recent).toEqual([]);
    expect(screen.queryByRole('group', { name: 'Recent searches' })).not.toBeInTheDocument();
  });

  it('closes with Escape and toggles with Ctrl+K', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.keyboard('{Control>}k{/Control}');
    await screen.findByRole('dialog');
    await user.keyboard('{Control>}k{/Control}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
