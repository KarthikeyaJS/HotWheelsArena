import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ActiveFilter } from '@/hooks/useProductFilters';
import { useRecentSearchStore } from '@/store/recentSearchStore';
import { ActiveFilterChips } from '../ActiveFilterChips';
import { FilterDrawer } from '../FilterDrawer';
import { RecentSearches } from '../RecentSearches';
import { ResultsToolbar } from '../ResultsToolbar';
import { SORT_OPTIONS } from '@/config/shop';

const chip = (value: string): ActiveFilter => ({
  id: `make:${value.toLowerCase()}`,
  group: 'make',
  groupLabel: 'Make',
  value,
  label: value,
});

function ChipsHarness({ onFocusFallback }: { onFocusFallback: () => void }) {
  const [filters, setFilters] = useState<ActiveFilter[]>([chip('Porsche'), chip('BMW')]);
  return (
    <ActiveFilterChips
      filters={filters}
      onRemove={(filter) => setFilters((current) => current.filter((f) => f.id !== filter.id))}
      onClearAll={() => setFilters([])}
      onFocusFallback={onFocusFallback}
    />
  );
}

describe('ActiveFilterChips focus', () => {
  it('moves focus to the next chip, then to the fallback once the last chip is gone', async () => {
    const user = userEvent.setup();
    const onFocusFallback = vi.fn();
    render(<ChipsHarness onFocusFallback={onFocusFallback} />);

    await user.click(screen.getByRole('button', { name: 'Remove make filter: Porsche' }));
    expect(screen.getByRole('button', { name: 'Remove make filter: BMW' })).toHaveFocus();
    expect(onFocusFallback).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    expect(screen.queryByRole('list', { name: 'Active filters' })).not.toBeInTheDocument();
    expect(onFocusFallback).toHaveBeenCalledTimes(1);
  });

  it('hands focus to the fallback after "Clear all" and shows full labels as tooltips', async () => {
    const user = userEvent.setup();
    const onFocusFallback = vi.fn();
    render(<ChipsHarness onFocusFallback={onFocusFallback} />);

    expect(screen.getByTitle('Make: Porsche')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onFocusFallback).toHaveBeenCalledTimes(1);
  });
});

describe('RecentSearches focus', () => {
  afterEach(() => {
    act(() => useRecentSearchStore.getState().clearRecent());
  });

  it('keeps focus in the list on remove and lands on the empty line after "Clear history"', async () => {
    const user = userEvent.setup();
    act(() => {
      const { addRecent } = useRecentSearchStore.getState();
      addRecent('thar');
      addRecent('rally');
      addRecent('porsche');
    });
    render(
      <MemoryRouter>
        <RecentSearches />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'porsche' })).toHaveAttribute('title', 'porsche');
    await user.click(screen.getByRole('button', { name: 'Remove “porsche” from recent searches' }));
    expect(
      screen.getByRole('button', { name: 'Remove “rally” from recent searches' }),
    ).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(screen.getByText(/your recent searches land here/i)).toHaveFocus();
  });
});

describe('FilterDrawer focus', () => {
  it('moves focus to the results button when "Clear all" disables itself', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [active, setActive] = useState(2);
      return (
        <FilterDrawer
          open
          onClose={() => undefined}
          resultCount={active ? 4 : 36}
          activeCount={active}
          onClearAll={() => setActive(0)}
        >
          <p>rail</p>
        </FilterDrawer>
      );
    }
    render(<Harness />);

    await user.click(await screen.findByRole('button', { name: 'Clear all' }));
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show 36 cars' })).toHaveFocus();
  });
});

describe('ResultsToolbar', () => {
  it('renders a focusable results heading in every state', () => {
    const props = {
      headingId: 'results',
      sort: 'newest' as const,
      sortOptions: SORT_OPTIONS,
      onSortChange: () => undefined,
      filterCount: 0,
      onOpenFilters: () => undefined,
      filtersOpen: false,
    };
    const { rerender } = render(<ResultsToolbar {...props} count={null} />);
    expect(document.getElementById('results')).toHaveAttribute('tabindex', '-1');
    rerender(<ResultsToolbar {...props} count={12} />);
    expect(screen.getByRole('heading', { name: /12\s*machines/i })).toHaveAttribute(
      'tabindex',
      '-1',
    );
    rerender(<ResultsToolbar {...props} count={null} unavailable />);
    expect(document.getElementById('results')).toHaveAttribute('tabindex', '-1');
  });
});
