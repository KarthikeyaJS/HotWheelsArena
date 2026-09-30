import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyFilters, type ProductFilters } from '@/components/shop/filtering';
import {
  SEARCH_FILTER_CONFIG,
  SHOP_FILTER_CONFIG,
  joinList,
  listActiveFilters,
  parseFilterParams,
  serializeFilterState,
  splitList,
  useProductFilters,
  withListValues,
  type FilterUrlState,
} from './useProductFilters';

const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

const parse = (search: string, config = SHOP_FILTER_CONFIG): FilterUrlState =>
  parseFilterParams(new URLSearchParams(search), config);

const state = (patch: Partial<ProductFilters> = {}, rest: Partial<FilterUrlState> = {}) => ({
  filters: { ...createEmptyFilters(), ...patch },
  sort: SHOP_FILTER_CONFIG.defaultSort,
  shown: SHOP_FILTER_CONFIG.pageSize,
  q: '',
  ...rest,
});

describe('list encoding', () => {
  it('splits comma lists, trimming, de-duping case-insensitively and dropping blanks', () => {
    expect(splitList('Porsche, Ford,,porsche , ')).toEqual(['Porsche', 'Ford']);
    expect(splitList(null)).toEqual([]);
    expect(splitList('')).toEqual([]);
  });

  it('escapes commas and backslashes inside values', () => {
    const values = ['Red, metallic', 'Back\\slash', 'Plain'];
    const joined = joinList(values);
    expect(joined).toBe('Red\\, metallic,Back\\\\slash,Plain');
    expect(splitList(joined)).toEqual(values);
  });
});

describe('parseFilterParams / serializeFilterState', () => {
  const roundTrip = (input: FilterUrlState, config = SHOP_FILTER_CONFIG): FilterUrlState =>
    parseFilterParams(new URLSearchParams(serializeFilterState(input, config)), config);

  it('round-trips every field', () => {
    const full = state(
      {
        view: 'premium',
        category: 'rescue',
        make: ['Porsche', 'Mercedes-AMG', 'Garage Originals'],
        model: ['911 Turbo 3.3 (930)', 'Skyline GT-R R34 V-Spec II'],
        series: ['hw-legends-2026'],
        year: ['2026', '2024'],
        color: ['Red, metallic', 'Silver'],
        scale: ['1:43', '1:18'],
        rarity: ['limited', 'super-rare'],
        availability: ['in-stock', 'low'],
        priceMin: 499,
        priceMax: 1999,
      },
      { sort: 'price-desc', shown: 36, q: 'porsche 911' },
    );
    expect(roundTrip(full)).toEqual(full);
  });

  it('round-trips open-ended prices and the empty state', () => {
    expect(roundTrip(state({ priceMin: 299 }))).toEqual(state({ priceMin: 299 }));
    expect(roundTrip(state({ priceMax: 999 }))).toEqual(state({ priceMax: 999 }));
    expect(roundTrip(state())).toEqual(state());
    expect(serializeFilterState(state())).toBe('');
  });

  it('writes readable, stable URLs and omits defaults', () => {
    expect(
      serializeFilterState(
        state(
          { view: 'new', make: ['Porsche', 'Land Rover'], scale: ['1:64'], priceMax: 999 },
          { sort: 'newest', shown: 12 },
        ),
      ),
    ).toBe('view=new&make=Porsche,Land+Rover&scale=1:64&price=-999');
    expect(serializeFilterState(state({}, { sort: 'rarity', shown: 24 }))).toBe(
      'sort=rarity&shown=24',
    );
  });

  it('preserves params it does not own', () => {
    const preserve = new URLSearchParams('utm_source=insta&make=Ford&view=new');
    expect(serializeFilterState(state({ make: ['Tata'] }), SHOP_FILTER_CONFIG, preserve)).toBe(
      'make=Tata&utm_source=insta',
    );
  });

  it('drops invalid values and falls back to defaults', () => {
    const parsed = parse(
      'view=bogus&category=boats&rarity=mythic,RARE&availability=soon,sold-out&year=26,2025&price=abc&sort=cheapest&shown=-4',
    );
    expect(parsed.filters.view).toBe('all');
    expect(parsed.filters.category).toBeNull();
    expect(parsed.filters.rarity).toEqual(['rare']);
    expect(parsed.filters.availability).toEqual(['sold-out']);
    expect(parsed.filters.year).toEqual(['2025']);
    expect(parsed.filters.priceMin).toBeNull();
    expect(parsed.sort).toBe('newest');
    expect(parsed.shown).toBe(12);
  });

  it('swaps a reversed price range and clamps paging', () => {
    const parsed = parse('price=1999-499&shown=100000');
    expect([parsed.filters.priceMin, parsed.filters.priceMax]).toEqual([499, 1999]);
    expect(parsed.shown).toBe(480);
  });

  it('maps ?category= onto its view (home category cards)', () => {
    expect(parse('category=off-road').filters).toMatchObject({ view: 'off-road', category: null });
    expect(parse('category=rescue').filters).toMatchObject({ view: 'all', category: 'rescue' });
    expect(parse('view=racing&category=racing').filters).toMatchObject({
      view: 'racing',
      category: null,
    });
    expect(parse('view=new&category=sports').filters).toMatchObject({
      view: 'new',
      category: 'sports',
    });
  });

  it('uses the search config for sort defaults (relevance)', () => {
    expect(parse('q=porsche', SEARCH_FILTER_CONFIG).sort).toBe('relevance');
    expect(parse('q=porsche&sort=relevance', SHOP_FILTER_CONFIG).sort).toBe('newest');
    expect(
      serializeFilterState(state({}, { sort: 'relevance', q: 'gt' }), SEARCH_FILTER_CONFIG),
    ).toBe('q=gt');
  });

  it('validates list values per group', () => {
    const filters = withListValues(createEmptyFilters(), 'series', ['HW-Exotics-2026']);
    expect(filters.series).toEqual(['hw-exotics-2026']);
    expect(withListValues(filters, 'rarity', ['Limited', 'nope']).rarity).toEqual(['limited']);
  });
});

describe('listActiveFilters', () => {
  it('lists chips in rail order with readable labels', () => {
    const chips = listActiveFilters({
      ...createEmptyFilters('new'),
      category: 'rescue',
      make: ['Porsche'],
      rarity: ['super-rare'],
      availability: ['low'],
      priceMin: 499,
    });
    expect(chips.map((chip) => [chip.group, chip.label])).toEqual([
      ['category', 'Rescue'],
      ['make', 'Porsche'],
      ['rarity', 'SUPER RARE'],
      ['availability', 'Low stock'],
      ['price', 'From ₹499'],
    ]);
  });
});

/* ─────────────────────────────── Hook ─────────────────────────────── */

let probe: { search: string; action: string } = { search: '', action: '' };

function Probe() {
  const location = useLocation();
  const action = useNavigationType();
  probe = { search: location.search, action };
  return null;
}

function wrapperFor(initial: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initial]} future={ROUTER_FUTURE}>
        <Probe />
        {children}
      </MemoryRouter>
    );
  };
}

describe('useProductFilters', () => {
  beforeEach(() => {
    probe = { search: '', action: '' };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads state from the URL', () => {
    const { result } = renderHook(() => useProductFilters(), {
      wrapper: wrapperFor('/shop?view=limited&make=Porsche&sort=rarity'),
    });
    expect(result.current.filters.view).toBe('limited');
    expect(result.current.filters.make).toEqual(['Porsche']);
    expect(result.current.sort).toBe('rarity');
    expect(result.current.activeCount).toBe(1);
  });

  it('toggles filters with history replace and resets paging', () => {
    const { result } = renderHook(() => useProductFilters(), {
      wrapper: wrapperFor('/shop?shown=24'),
    });
    act(() => result.current.toggle('make', 'Porsche'));
    expect(probe).toEqual({ search: '?make=Porsche', action: 'REPLACE' });
    act(() => result.current.toggle('make', 'Toyota'));
    expect(probe.search).toBe('?make=Porsche,Toyota');
    act(() => result.current.toggle('make', 'porsche'));
    expect(probe.search).toBe('?make=Toyota');
    expect(result.current.filters.make).toEqual(['Toyota']);
  });

  it('builds on the latest state when updates happen back to back', () => {
    const { result } = renderHook(() => useProductFilters(), { wrapper: wrapperFor('/shop') });
    act(() => {
      result.current.toggle('color', 'Red');
      result.current.toggle('scale', '1:43');
      result.current.setSort('price-asc');
    });
    expect(probe.search).toBe('?color=Red&scale=1:43&sort=price-asc');
  });

  it('pushes view changes, keeping filters but dropping category and paging', () => {
    const { result } = renderHook(() => useProductFilters(), {
      wrapper: wrapperFor('/shop?category=rescue&make=Tata&shown=24&sort=rating'),
    });
    expect(result.current.hrefForView('new')).toBe('/shop?view=new&make=Tata&sort=rating');
    act(() => result.current.setView('new'));
    expect(probe).toEqual({ search: '?view=new&make=Tata&sort=rating', action: 'PUSH' });
  });

  it('loads more in page-size steps and clears everything except the view', () => {
    const { result } = renderHook(() => useProductFilters(), {
      wrapper: wrapperFor('/shop?view=premium&make=Ford&price=299-&q=gt'),
    });
    act(() => result.current.loadMore());
    expect(result.current.shown).toBe(24);
    act(() => result.current.clearAll());
    expect(probe.search).toBe('?q=gt&view=premium');
    act(() => result.current.clearAll({ query: true }));
    expect(probe.search).toBe('?view=premium');
  });

  it('removes a single active filter chip', () => {
    const { result } = renderHook(() => useProductFilters(), {
      wrapper: wrapperFor('/shop?category=rescue&rarity=rare&price=-999'),
    });
    const [category, rarity, price] = result.current.activeFilters;
    act(() => result.current.removeFilter(rarity!));
    expect(probe.search).toBe('?category=rescue&price=-999');
    act(() => result.current.removeFilter(price!));
    expect(probe.search).toBe('?category=rescue');
    act(() => result.current.removeFilter(category!));
    expect(probe.search).toBe('');
  });

  it('debounces price slider writes and flushes on commit', () => {
    vi.useFakeTimers();
    const bounds = { min: 199, max: 2499 };
    const { result } = renderHook(() => useProductFilters({ priceDebounceMs: 250 }), {
      wrapper: wrapperFor('/shop'),
    });
    act(() => result.current.setPriceDraft([449, 2499], bounds));
    act(() => result.current.setPriceDraft([499, 1999], bounds));
    expect(result.current.priceDraft).toEqual([499, 1999]);
    expect(probe.search).toBe('');
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(probe).toEqual({ search: '?price=499-1999', action: 'REPLACE' });
    expect(result.current.filters.priceMin).toBe(499);

    act(() => result.current.commitPrice([199, 999], bounds));
    expect(probe.search).toBe('?price=-999');
  });

  it('folds a pending price into the next filter change', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProductFilters(), { wrapper: wrapperFor('/shop') });
    act(() => result.current.setPriceDraft([999, 2499], { min: 199, max: 2499 }));
    act(() => result.current.toggle('year', '2026'));
    expect(probe.search).toBe('?year=2026&price=999-');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(probe.search).toBe('?year=2026&price=999-');
  });

  it('sets the query (trimmed) and keeps filters', () => {
    const { result } = renderHook(() => useProductFilters({ config: SEARCH_FILTER_CONFIG }), {
      wrapper: wrapperFor('/search?q=pors&color=Blue'),
    });
    act(() => result.current.setQuery('  porsche   911 '));
    expect(probe.search).toBe('?q=porsche+911&color=Blue');
    expect(result.current.q).toBe('porsche 911');
  });
});
