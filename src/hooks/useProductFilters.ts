/**
 * URL-synced filter state for /shop and /search.
 *
 * The URL is the single source of truth (shareable, survives reloads and back/forward):
 *   /shop?view=premium&make=Porsche,Toyota&scale=1:43&price=499-1999&sort=price-asc&shown=24
 * - lists are comma-separated (a literal comma inside a value is escaped as `\,`);
 * - `price=MIN-MAX` with either side optional (`price=499-`, `price=-999`);
 * - defaults are omitted (`view=all`, the default sort, `shown` = one page);
 * - unknown params (e.g. `utm_*`) are preserved.
 *
 * Every filter change uses history REPLACE + `preventScrollReset` (no history spam, no jump to
 * the top); switching views (tabs) pushes. The price slider writes are debounced.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_ORDER,
  DEFAULT_SEARCH_SORT,
  DEFAULT_SORT,
  MAX_SHOWN,
  PAGE_SIZE,
  PRICE_DEBOUNCE_MS,
  SEARCH_SORT_OPTIONS,
  SORT_OPTIONS,
  getShopView,
  isShopViewId,
  isSortId,
  viewForCategory,
  type ShopViewId,
  type SortId,
} from '@/config/shop';
import { CATEGORY_DISPLAY, isCategorySlug } from '@/config/site';
import {
  LIST_FACET_KEYS,
  countActiveFilters,
  createEmptyFilters,
  normalizeFacetValue,
  rangeToPrice,
  type ListFacetKey,
  type PriceBounds,
  type PriceRange,
  type ProductFilters,
} from '@/components/shop/filtering';
import { formatINR } from '@/lib/format';
import { rarityLabel } from '@/lib/product';
import { RARITIES } from '@shared/types';
import type { CategorySlug, Rarity, StockStatus } from '@/types';

/* ─────────────────────────────── URL codec (pure) ─────────────────────────────── */

export interface FilterUrlState {
  filters: ProductFilters;
  sort: SortId;
  /** Cars revealed by "LOAD MORE" (≥ one page). */
  shown: number;
  /** Free-text query (`?q=`), trimmed. */
  q: string;
}

export interface FilterUrlConfig {
  defaultSort: SortId;
  /** Sorts accepted from the URL (others fall back to `defaultSort`). */
  sortOptions: readonly SortId[];
  pageSize: number;
}

export const SHOP_FILTER_CONFIG: FilterUrlConfig = {
  defaultSort: DEFAULT_SORT,
  sortOptions: SORT_OPTIONS.map((option) => option.id),
  pageSize: PAGE_SIZE,
};

export const SEARCH_FILTER_CONFIG: FilterUrlConfig = {
  defaultSort: DEFAULT_SEARCH_SORT,
  sortOptions: SEARCH_SORT_OPTIONS.map((option) => option.id),
  pageSize: PAGE_SIZE,
};

/** Every param the codec owns (anything else is preserved untouched). */
export const FILTER_PARAM_KEYS: readonly string[] = [
  'q',
  'view',
  'category',
  ...LIST_FACET_KEYS,
  'price',
  'sort',
  'shown',
];

const MAX_QUERY_LENGTH = 120;
const MAX_LIST_VALUES = 40;
const MAX_VALUE_LENGTH = 80;

/** Splits a comma list, honouring `\,` / `\\` escapes; trims, drops blanks, de-dupes (case-insensitive). */
export function splitList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const values: string[] = [];
  let current = '';
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '\\' && index + 1 < raw.length) {
      current += raw[index + 1];
      index += 1;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, ' ').trim().slice(0, MAX_VALUE_LENGTH);
    const key = normalizeFacetValue(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= MAX_LIST_VALUES) break;
  }
  return result;
}

/** Inverse of `splitList`. */
export function joinList(values: readonly string[]): string {
  return values.map((value) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,')).join(',');
}

const PRICE_PATTERN = /^\s*(\d{0,7})\s*-\s*(\d{0,7})\s*$/;

function parsePrice(raw: string | null): Pick<ProductFilters, 'priceMin' | 'priceMax'> {
  const match = raw ? PRICE_PATTERN.exec(raw) : null;
  if (!match) return { priceMin: null, priceMax: null };
  const low = match[1] ? Number(match[1]) : null;
  const high = match[2] ? Number(match[2]) : null;
  if (low !== null && high !== null && low > high) return { priceMin: high, priceMax: low };
  return { priceMin: low, priceMax: high };
}

const RARITY_SET = new Set<string>(RARITIES);
const AVAILABILITY_SET = new Set<string>(AVAILABILITY_ORDER);

const isRarity = (value: string): value is Rarity => RARITY_SET.has(value);
const isAvailability = (value: string): value is StockStatus => AVAILABILITY_SET.has(value);

/**
 * `filters` with the list group `key` replaced by `values` — cleaned (trimmed, de-duped) and
 * validated for the group (years are 4 digits, series ids lower case, rarity/stock enums).
 */
export function withListValues(
  filters: ProductFilters,
  key: ListFacetKey,
  values: readonly string[],
): ProductFilters {
  const clean = splitList(joinList(values));
  const next: ProductFilters = { ...filters };
  switch (key) {
    case 'rarity':
      next.rarity = clean.map((value) => value.toLowerCase()).filter(isRarity);
      break;
    case 'availability':
      next.availability = clean.map((value) => value.toLowerCase()).filter(isAvailability);
      break;
    case 'series':
      next.series = clean.map((value) => value.toLowerCase());
      break;
    case 'year':
      next.year = clean.filter((value) => /^\d{4}$/.test(value));
      break;
    default:
      next[key] = clean;
  }
  return next;
}

/** Resolves the view/category pair: `?category=off-road` → the Off-Road view. */
function resolveViewAndCategory(
  rawView: string | null,
  rawCategory: string | null,
): Pick<ProductFilters, 'view' | 'category'> {
  let view: ShopViewId = isShopViewId(rawView) ? rawView : 'all';
  let category: CategorySlug | null = isCategorySlug(rawCategory) ? rawCategory : null;
  if (category) {
    const categoryView = viewForCategory(category);
    if (view === 'all' && categoryView) {
      view = categoryView.id;
      category = null;
    } else if (getShopView(view).category === category) {
      category = null;
    }
  }
  return { view, category };
}

/** URL → state. Invalid values are dropped; missing values fall back to defaults. */
export function parseFilterParams(
  params: URLSearchParams,
  config: FilterUrlConfig = SHOP_FILTER_CONFIG,
): FilterUrlState {
  const { view, category } = resolveViewAndCategory(params.get('view'), params.get('category'));
  let filters: ProductFilters = {
    ...createEmptyFilters(view),
    category,
    ...parsePrice(params.get('price')),
  };
  for (const key of LIST_FACET_KEYS) {
    filters = withListValues(filters, key, splitList(params.get(key)));
  }

  const rawSort = params.get('sort');
  const sort =
    isSortId(rawSort) && config.sortOptions.includes(rawSort) ? rawSort : config.defaultSort;

  const rawShown = Number.parseInt(params.get('shown') ?? '', 10);
  const shown = Number.isFinite(rawShown)
    ? Math.min(MAX_SHOWN, Math.max(config.pageSize, rawShown))
    : config.pageSize;

  const q = (params.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);

  return { filters, sort, shown, q };
}

/** Percent-encodes a value but keeps the separators readable (`,` `:` and `+` for spaces). */
function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/gi, ',').replace(/%3A/gi, ':').replace(/%20/g, '+');
}

/**
 * State → query string (no leading `?`). Param order is stable; defaults are omitted. Params
 * in `preserve` that the codec doesn't own are appended unchanged.
 */
export function serializeFilterState(
  state: FilterUrlState,
  config: FilterUrlConfig = SHOP_FILTER_CONFIG,
  preserve?: URLSearchParams,
): string {
  const pairs: string[] = [];
  const add = (key: string, value: string): void => {
    pairs.push(`${key}=${encodeValue(value)}`);
  };
  const { filters } = state;

  const q = state.q.trim();
  if (q) add('q', q);
  if (filters.view !== 'all') add('view', filters.view);
  if (filters.category) add('category', filters.category);
  for (const key of LIST_FACET_KEYS) {
    if (filters[key].length > 0) add(key, joinList(filters[key]));
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    add('price', `${filters.priceMin ?? ''}-${filters.priceMax ?? ''}`);
  }
  if (state.sort !== config.defaultSort && config.sortOptions.includes(state.sort)) {
    add('sort', state.sort);
  }
  if (state.shown > config.pageSize) add('shown', String(Math.min(MAX_SHOWN, state.shown)));

  if (preserve) {
    const owned = new Set(FILTER_PARAM_KEYS);
    preserve.forEach((value, key) => {
      if (!owned.has(key)) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    });
  }
  return pairs.join('&');
}

/* ─────────────────────────────── Active filters ─────────────────────────────── */

export type ActiveFilterGroup = ListFacetKey | 'category' | 'price';

export interface ActiveFilter {
  /** Stable key (`make:porsche`). */
  id: string;
  group: ActiveFilterGroup;
  /** Short group caption, e.g. `Make`. */
  groupLabel: string;
  value: string;
  /** Default chip label (series → the id; map it to a name in the UI). */
  label: string;
}

export const ACTIVE_FILTER_GROUP_LABELS: Readonly<Record<ActiveFilterGroup, string>> = {
  category: 'Category',
  make: 'Make',
  model: 'Model',
  series: 'Series',
  year: 'Year',
  color: 'Color',
  scale: 'Scale',
  rarity: 'Rarity',
  availability: 'Stock',
  price: 'Price',
};

/** `₹499 – ₹999`, `From ₹499`, `Up to ₹999`. */
export function formatPriceFilter(filters: Pick<ProductFilters, 'priceMin' | 'priceMax'>): string {
  const { priceMin, priceMax } = filters;
  if (priceMin !== null && priceMax !== null)
    return `${formatINR(priceMin)} – ${formatINR(priceMax)}`;
  if (priceMin !== null) return `From ${formatINR(priceMin)}`;
  if (priceMax !== null) return `Up to ${formatINR(priceMax)}`;
  return 'Any price';
}

/** Chips for every active filter, in rail order. */
export function listActiveFilters(filters: ProductFilters): ActiveFilter[] {
  const active: ActiveFilter[] = [];
  if (filters.category) {
    active.push({
      id: `category:${filters.category}`,
      group: 'category',
      groupLabel: ACTIVE_FILTER_GROUP_LABELS.category,
      value: filters.category,
      label: CATEGORY_DISPLAY[filters.category].name,
    });
  }
  for (const key of LIST_FACET_KEYS) {
    for (const value of filters[key]) {
      let label = value;
      if (key === 'rarity') label = rarityLabel(value as Rarity);
      if (key === 'availability') label = AVAILABILITY_LABELS[value as StockStatus] ?? value;
      active.push({
        id: `${key}:${normalizeFacetValue(value)}`,
        group: key,
        groupLabel: ACTIVE_FILTER_GROUP_LABELS[key],
        value,
        label,
      });
    }
  }
  if (filters.priceMin !== null || filters.priceMax !== null) {
    active.push({
      id: 'price',
      group: 'price',
      groupLabel: ACTIVE_FILTER_GROUP_LABELS.price,
      value: `${filters.priceMin ?? ''}-${filters.priceMax ?? ''}`,
      label: formatPriceFilter(filters),
    });
  }
  return active;
}

/* ─────────────────────────────── Hook ─────────────────────────────── */

export interface UseProductFiltersOptions {
  /** URL defaults (sort menu, page size). Default: the shop config. */
  config?: FilterUrlConfig;
  /** Debounce for price-slider URL writes (ms). */
  priceDebounceMs?: number;
}

export interface ClearAllOptions {
  /** Also clear `?q=` (default false — the search page keeps its query). */
  query?: boolean;
}

export interface ProductFiltersController extends FilterUrlState {
  /** Slider position while the price is being dragged (null → use the committed filter). */
  priceDraft: PriceRange | null;
  activeFilters: ActiveFilter[];
  /** Active filter count (rail groups + category + price). */
  activeCount: number;
  /** Href for a view tab (keeps rail filters + sort + query; drops category + paging). */
  hrefForView: (view: ShopViewId) => string;
  setView: (view: ShopViewId) => void;
  setCategory: (category: CategorySlug | null) => void;
  setSort: (sort: SortId) => void;
  setQuery: (query: string) => void;
  toggle: (key: ListFacetKey, value: string) => void;
  setGroup: (key: ListFacetKey, values: readonly string[]) => void;
  clearGroup: (key: ListFacetKey) => void;
  /** Live slider update: moves the thumbs now, writes the URL after the debounce. */
  setPriceDraft: (range: readonly [number, number], bounds: PriceBounds) => void;
  /** Writes the price immediately (slider released / key up). */
  commitPrice: (range: readonly [number, number], bounds: PriceBounds) => void;
  clearPrice: () => void;
  removeFilter: (filter: ActiveFilter) => void;
  clearAll: (options?: ClearAllOptions) => void;
  loadMore: (step?: number) => void;
}

type Mode = 'replace' | 'push';

const withFilters = (
  state: FilterUrlState,
  patch: Partial<ProductFilters>,
  config: FilterUrlConfig,
): FilterUrlState => ({
  ...state,
  filters: { ...state.filters, ...patch },
  shown: config.pageSize,
});

/** URL-synced filter / sort / paging state for the shop grid and search results. */
export function useProductFilters(
  options: UseProductFiltersOptions = {},
): ProductFiltersController {
  const config = options.config ?? SHOP_FILTER_CONFIG;
  const debounceMs = options.priceDebounceMs ?? PRICE_DEBOUNCE_MS;
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const state = useMemo(() => parseFilterParams(searchParams, config), [searchParams, config]);

  // Latest state including writes that the router hasn't rendered yet (rapid consecutive
  // updates must build on each other). Re-synced only when the URL-derived state changes.
  const stateRef = useRef(state);
  const syncedRef = useRef(state);
  const paramsRef = useRef(searchParams);
  if (syncedRef.current !== state) {
    syncedRef.current = state;
    stateRef.current = state;
    paramsRef.current = searchParams;
  }

  const [priceDraft, setPriceDraftState] = useState<PriceRange | null>(null);
  const pendingPriceRef = useRef<Pick<ProductFilters, 'priceMin' | 'priceMax'> | null>(null);
  const timerRef = useRef<number | null>(null);

  const cancelTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => cancelTimer, [cancelTimer]);

  // A new URL state ends any finished slider interaction.
  useEffect(() => {
    if (timerRef.current === null) setPriceDraftState(null);
  }, [state]);

  const write = useCallback(
    (next: FilterUrlState, mode: Mode = 'replace'): void => {
      stateRef.current = next;
      const search = serializeFilterState(next, config, paramsRef.current);
      navigate(
        { pathname, search: search ? `?${search}` : '' },
        { replace: mode === 'replace', preventScrollReset: true },
      );
    },
    [config, navigate, pathname],
  );

  /** Applies `recipe` to the latest state (+ any pending price) and writes it. */
  const update = useCallback(
    (recipe: (current: FilterUrlState) => FilterUrlState, mode: Mode = 'replace'): void => {
      const pending = pendingPriceRef.current;
      pendingPriceRef.current = null;
      cancelTimer();
      const base = pending
        ? { ...stateRef.current, filters: { ...stateRef.current.filters, ...pending } }
        : stateRef.current;
      write(recipe(base), mode);
    },
    [cancelTimer, write],
  );

  const viewState = useCallback(
    (current: FilterUrlState, view: ShopViewId): FilterUrlState => ({
      ...current,
      filters: { ...current.filters, view, category: null },
      shown: config.pageSize,
    }),
    [config.pageSize],
  );

  const hrefForView = useCallback(
    (view: ShopViewId): string => {
      const search = serializeFilterState(viewState(state, view), config, searchParams);
      return search ? `${pathname}?${search}` : pathname;
    },
    [config, pathname, searchParams, state, viewState],
  );

  const setView = useCallback(
    (view: ShopViewId): void => update((current) => viewState(current, view), 'push'),
    [update, viewState],
  );

  const setCategory = useCallback(
    (category: CategorySlug | null): void =>
      update((current) => {
        const resolved = resolveViewAndCategory(current.filters.view, category ?? null);
        return withFilters(current, category ? resolved : { category: null }, config);
      }),
    [config, update],
  );

  const setSort = useCallback(
    (sort: SortId): void =>
      update((current) => ({
        ...current,
        sort: config.sortOptions.includes(sort) ? sort : config.defaultSort,
      })),
    [config, update],
  );

  const setQuery = useCallback(
    (query: string): void =>
      update((current) => ({
        ...current,
        q: query.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH),
        shown: config.pageSize,
      })),
    [config.pageSize, update],
  );

  const setGroup = useCallback(
    (key: ListFacetKey, values: readonly string[]): void =>
      update((current) => ({
        ...current,
        filters: withListValues(current.filters, key, values),
        shown: config.pageSize,
      })),
    [config.pageSize, update],
  );

  const toggle = useCallback(
    (key: ListFacetKey, value: string): void =>
      update((current) => {
        const normalized = normalizeFacetValue(value);
        const list: readonly string[] = current.filters[key];
        const next = list.some((entry) => normalizeFacetValue(entry) === normalized)
          ? list.filter((entry) => normalizeFacetValue(entry) !== normalized)
          : [...list, value];
        return {
          ...current,
          filters: withListValues(current.filters, key, next),
          shown: config.pageSize,
        };
      }),
    [config.pageSize, update],
  );

  const clearGroup = useCallback((key: ListFacetKey): void => setGroup(key, []), [setGroup]);

  const setPriceDraft = useCallback(
    (range: readonly [number, number], bounds: PriceBounds): void => {
      setPriceDraftState([range[0], range[1]]);
      pendingPriceRef.current = rangeToPrice(range, bounds);
      cancelTimer();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        update((current) => ({ ...current, shown: config.pageSize }));
      }, debounceMs);
    },
    [cancelTimer, config.pageSize, debounceMs, update],
  );

  const commitPrice = useCallback(
    (range: readonly [number, number], bounds: PriceBounds): void => {
      setPriceDraftState([range[0], range[1]]);
      pendingPriceRef.current = rangeToPrice(range, bounds);
      update((current) => ({ ...current, shown: config.pageSize }));
    },
    [config.pageSize, update],
  );

  const clearPrice = useCallback((): void => {
    setPriceDraftState(null);
    update((current) => withFilters(current, { priceMin: null, priceMax: null }, config));
  }, [config, update]);

  const removeFilter = useCallback(
    (filter: ActiveFilter): void => {
      if (filter.group === 'price') clearPrice();
      else if (filter.group === 'category') setCategory(null);
      else toggle(filter.group, filter.value);
    },
    [clearPrice, setCategory, toggle],
  );

  const clearAll = useCallback(
    ({ query = false }: ClearAllOptions = {}): void => {
      setPriceDraftState(null);
      update((current) => ({
        ...current,
        filters: createEmptyFilters(current.filters.view),
        q: query ? '' : current.q,
        shown: config.pageSize,
      }));
    },
    [config.pageSize, update],
  );

  const loadMore = useCallback(
    (step?: number): void =>
      update((current) => ({
        ...current,
        shown: Math.min(MAX_SHOWN, current.shown + Math.max(1, step ?? config.pageSize)),
      })),
    [config.pageSize, update],
  );

  const activeFilters = useMemo(() => listActiveFilters(state.filters), [state.filters]);
  const activeCount = useMemo(() => countActiveFilters(state.filters), [state.filters]);

  return useMemo(
    () => ({
      ...state,
      priceDraft,
      activeFilters,
      activeCount,
      hrefForView,
      setView,
      setCategory,
      setSort,
      setQuery,
      toggle,
      setGroup,
      clearGroup,
      setPriceDraft,
      commitPrice,
      clearPrice,
      removeFilter,
      clearAll,
      loadMore,
    }),
    [
      state,
      priceDraft,
      activeFilters,
      activeCount,
      hrefForView,
      setView,
      setCategory,
      setSort,
      setQuery,
      toggle,
      setGroup,
      clearGroup,
      setPriceDraft,
      commitPrice,
      clearPrice,
      removeFilter,
      clearAll,
      loadMore,
    ],
  );
}
