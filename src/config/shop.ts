/**
 * Shop + search configuration: the sub-views of /shop (tabs), sort options, paging and the
 * display data the filter rail needs (availability labels, paint swatches).
 *
 * Views are predicates over the cached catalogue (`useProducts()`), so adding a view is a
 * config-only change. Category views (`racing`, `sports`, …) carry their `category` so a
 * `/shop?category=off-road` link from the home page lands on the matching tab.
 */
import { Award, Gem, LayoutGrid, Zap, type LucideIcon } from 'lucide-react';
import { RARITY_ORDER } from '@/lib/product';
import type { CategorySlug, Product, StockStatus } from '@/types';
import { CATEGORY_DISPLAY } from './site';

/* ─────────────────────────────── Views ─────────────────────────────── */

export const SHOP_VIEW_IDS = [
  'all',
  'new',
  'premium',
  'limited',
  'racing',
  'sports',
  'off-road',
  'special',
] as const;

export type ShopViewId = (typeof SHOP_VIEW_IDS)[number];

export interface ShopView {
  id: ShopViewId;
  /** Tab label (Title Case — render with `uppercase`). */
  label: string;
  /** HUD eyebrow above the page title. */
  eyebrow: string;
  /** Page title (h1). */
  title: string;
  /** Racing microcopy under the title; also the meta description. */
  description: string;
  /** Document title (`New Arrivals | HotWheelsArena`). */
  metaTitle: string;
  icon: LucideIcon;
  /** Set for category views: `/shop?category=<slug>` resolves to this view. */
  category?: CategorySlug;
  predicate: (product: Product) => boolean;
}

/** Price (₹) at or above which a car counts as premium. */
export const PREMIUM_PRICE_THRESHOLD = 999;
/** Mainline scale; anything else (1:43, 1:18 …) is a premium casting. */
export const MAINLINE_SCALE = '1:64';

export function isPremiumProduct(product: Pick<Product, 'tags' | 'scale' | 'price'>): boolean {
  return (
    product.tags.some((tag) => tag.toLowerCase() === 'premium') ||
    product.scale.trim() !== MAINLINE_SCALE ||
    product.price >= PREMIUM_PRICE_THRESHOLD
  );
}

export function isLimitedProduct(product: Pick<Product, 'rarity' | 'isVault'>): boolean {
  return product.rarity === 'limited' || product.isVault;
}

const categoryView = (
  id: ShopViewId & CategorySlug,
  copy: Pick<ShopView, 'label' | 'title' | 'description' | 'metaTitle'>,
): ShopView => ({
  id,
  ...copy,
  eyebrow: `CATEGORY · ${CATEGORY_DISPLAY[id].label}`,
  icon: CATEGORY_DISPLAY[id].icon,
  category: id,
  predicate: (product) => product.category === id,
});

export const SHOP_VIEWS: readonly ShopView[] = [
  {
    id: 'all',
    label: 'All Cars',
    eyebrow: 'THE GARAGE · ALL CARS',
    title: 'Shop the garage',
    description:
      'Every die-cast machine on the grid. Filter by make, series, rarity and price, then park your favourites.',
    metaTitle: 'Shop all cars',
    icon: LayoutGrid,
    predicate: () => true,
  },
  {
    id: 'new',
    label: 'New Arrivals',
    eyebrow: 'NEW DROPS · JUST OFF THE TRACK',
    title: 'Just off the track',
    description:
      'Fresh castings straight off the transporter. Grab them before the next drop rolls in.',
    metaTitle: 'New arrivals',
    icon: Zap,
    predicate: (product) => product.isNew,
  },
  {
    id: 'premium',
    label: 'Premium',
    eyebrow: 'PREMIUM LINE · BIG SCALES & FLAGSHIPS',
    title: 'Premium machines',
    description:
      'Larger scales, metal-on-metal castings and flagship editions from ₹999 up. Built for the display shelf.',
    metaTitle: 'Premium die-cast cars',
    icon: Award,
    predicate: isPremiumProduct,
  },
  {
    id: 'limited',
    label: 'Limited Edition',
    eyebrow: 'THE VAULT · NUMBERED DROPS',
    title: 'Limited editions',
    description:
      'Numbered runs and vault exclusives. When the counter hits zero, they are gone for good.',
    metaTitle: 'Limited editions',
    icon: Gem,
    predicate: isLimitedProduct,
  },
  categoryView('racing', {
    label: 'Racing',
    title: 'Born on the circuit',
    description:
      'Le Mans prototypes, GT racers, touring cars and rally legends in full livery. Every one of them lives at the redline.',
    metaTitle: 'Racing cars',
  }),
  categoryView('sports', {
    label: 'Sports Cars',
    title: 'Built for the fast lane',
    description:
      'Supercars, sports coupes and muscle, from Stuttgart to Tokyo. Road machines tuned for speed.',
    metaTitle: 'Sports cars',
  }),
  categoryView('off-road', {
    label: 'Off-Road',
    title: 'Mud, dirt and zero limits',
    description: 'Lifted 4x4s, trail icons and rally raiders that never ask where the road ends.',
    metaTitle: 'Off-road cars',
  }),
  categoryView('special', {
    label: 'Special Editions',
    title: 'Character & special editions',
    description:
      'Original fantasy castings, hot rods and oddball legends. These are the cars that break every rule of the garage.',
    metaTitle: 'Character & special editions',
  }),
];

export const DEFAULT_SHOP_VIEW: ShopViewId = 'all';

const VIEW_MAP = new Map<string, ShopView>(SHOP_VIEWS.map((view) => [view.id, view]));

export function isShopViewId(value: string | null | undefined): value is ShopViewId {
  return value != null && VIEW_MAP.has(value);
}

/** The view for `id`, falling back to All Cars. */
export function getShopView(id: string | null | undefined): ShopView {
  return (
    (id != null ? VIEW_MAP.get(id) : undefined) ?? (VIEW_MAP.get(DEFAULT_SHOP_VIEW) as ShopView)
  );
}

/** The category view (`racing`, `sports`, …) for a category slug, if there is one. */
export function viewForCategory(category: CategorySlug | null | undefined): ShopView | undefined {
  return category ? SHOP_VIEWS.find((view) => view.category === category) : undefined;
}

export interface CategoryHeader {
  eyebrow: string;
  title: string;
  description: string;
  metaTitle: string;
}

/** Header copy for categories that have no view of their own (reached via `?category=`). */
const EXTRA_CATEGORY_COPY: Partial<Record<CategorySlug, Omit<CategoryHeader, 'eyebrow'>>> = {
  rescue: {
    title: 'First responders, full throttle',
    description:
      'Fire tenders, ambulances and highway patrols: the rescue squad that answers every call, sirens blazing.',
    metaTitle: 'Rescue vehicles',
  },
  limited: {
    title: 'Numbered drops from the vault',
    description:
      'Numbered castings in strictly limited runs. Check the edition counter before it hits zero.',
    metaTitle: 'Limited category',
  },
};

/** Header copy for a category (its view's copy when it has one). */
export function getCategoryHeader(category: CategorySlug): CategoryHeader {
  const view = viewForCategory(category);
  if (view) {
    return {
      eyebrow: view.eyebrow,
      title: view.title,
      description: view.description,
      metaTitle: view.metaTitle,
    };
  }
  const display = CATEGORY_DISPLAY[category];
  const extra = EXTRA_CATEGORY_COPY[category];
  return {
    eyebrow: `CATEGORY · ${display.label}`,
    title: extra?.title ?? display.tagline,
    description:
      extra?.description ??
      `${display.tagline}. Browse every ${display.name.toLowerCase()} machine in the garage.`,
    metaTitle: extra?.metaTitle ?? `${display.name} cars`,
  };
}

/* ─────────────────────────────── Sorting ─────────────────────────────── */

export const SORT_IDS = [
  'relevance',
  'newest',
  'price-asc',
  'price-desc',
  'rarity',
  'rating',
] as const;
export type SortId = (typeof SORT_IDS)[number];

export interface SortOption {
  id: SortId;
  /** Select label. */
  label: string;
  /** Comparator; `null` keeps the incoming order (relevance ranking from lib/search). */
  compare: ((a: Product, b: Product) => number) | null;
}

const byName = (a: Product, b: Product): number =>
  a.name.localeCompare(b.name, 'en', { numeric: true });

const byNewest = (a: Product, b: Product): number => (b.createdAt ?? 0) - (a.createdAt ?? 0);

export const SORT_OPTION_MAP: Readonly<Record<SortId, SortOption>> = {
  relevance: { id: 'relevance', label: 'Best match', compare: null },
  newest: {
    id: 'newest',
    label: 'Newest first',
    compare: (a, b) => byNewest(a, b) || byName(a, b),
  },
  'price-asc': {
    id: 'price-asc',
    label: 'Price: low to high',
    compare: (a, b) => a.price - b.price || byNewest(a, b) || byName(a, b),
  },
  'price-desc': {
    id: 'price-desc',
    label: 'Price: high to low',
    compare: (a, b) => b.price - a.price || byNewest(a, b) || byName(a, b),
  },
  rarity: {
    id: 'rarity',
    label: 'Rarity: rarest first',
    compare: (a, b) =>
      (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0) ||
      b.rarityScore - a.rarityScore ||
      b.collectorScore - a.collectorScore ||
      byName(a, b),
  },
  rating: {
    id: 'rating',
    label: 'Collector rating',
    compare: (a, b) =>
      b.collectorScore - a.collectorScore ||
      b.ratingAvg - a.ratingAvg ||
      b.ratingCount - a.ratingCount ||
      byName(a, b),
  },
};

/** Sort options on /shop (default first). */
export const SORT_OPTIONS: readonly SortOption[] = [
  SORT_OPTION_MAP.newest,
  SORT_OPTION_MAP['price-asc'],
  SORT_OPTION_MAP['price-desc'],
  SORT_OPTION_MAP.rarity,
  SORT_OPTION_MAP.rating,
];

/** Sort options on /search: relevance (default) + the shop sorts. */
export const SEARCH_SORT_OPTIONS: readonly SortOption[] = [
  SORT_OPTION_MAP.relevance,
  ...SORT_OPTIONS,
];

export const DEFAULT_SORT: SortId = 'newest';
export const DEFAULT_SEARCH_SORT: SortId = 'relevance';

export function isSortId(value: string | null | undefined): value is SortId {
  return value != null && (SORT_IDS as readonly string[]).includes(value);
}

/* ─────────────────────────────── Paging & filters ─────────────────────────────── */

/** Cars per "LOAD MORE" step. */
export const PAGE_SIZE = 12;
/** Upper bound for the `shown` URL param (defensive clamp). */
export const MAX_SHOWN = 480;
/** Price slider step (₹). Seed prices end in 49/99, so steps from the minimum hit real prices. */
export const PRICE_STEP = 50;
/** Debounce for price-slider URL writes while dragging (ms). */
export const PRICE_DEBOUNCE_MS = 250;
/** Debounce for the search page's inline field → `?q=` (ms). */
export const SEARCH_DEBOUNCE_MS = 300;
/** Idle time before a typed query is saved to recent searches (ms). */
export const RECENT_SEARCH_IDLE_MS = 1200;

/** Options shown per list facet before "Show all". */
export const FACET_VISIBLE_LIMIT = {
  make: 6,
  model: 6,
  series: 6,
  color: 10,
} as const;

export const AVAILABILITY_ORDER: readonly StockStatus[] = ['in-stock', 'low', 'sold-out'];

export const AVAILABILITY_LABELS: Readonly<Record<StockStatus, string>> = {
  'in-stock': 'In stock',
  low: 'Low stock',
  'sold-out': 'Sold out',
};

export const AVAILABILITY_HINTS: Readonly<Record<StockStatus, string>> = {
  'in-stock': 'Plenty on the shelf',
  low: '10 or fewer left',
  'sold-out': 'Track it for a restock',
};

/**
 * Paint swatches for the COLOR facet. These are product paint colours (catalogue data), not
 * theme colours, so they are the one place the shop uses literal colour values. Unknown colours
 * fall back to the metallic theme gradient.
 */
export const COLOR_SWATCHES: Readonly<Record<string, string>> = {
  black: '#101010',
  white: '#F4F4F2',
  silver: 'linear-gradient(135deg, #F1F2F4 0%, #A9AEB5 55%, #E3E5E8 100%)',
  grey: '#8B8F95',
  gray: '#8B8F95',
  red: '#D7261E',
  orange: '#FF6A13',
  yellow: '#F7C600',
  gold: 'linear-gradient(135deg, #F8E08E 0%, #C9961A 55%, #F2D36B 100%)',
  green: '#1F8A4C',
  blue: '#1E5BD8',
  purple: '#6B2FB3',
  pink: '#E6468C',
  brown: '#7A4B2A',
};

/** CSS `background` for a paint colour name, or `null` when unknown. */
export function colorSwatch(color: string): string | null {
  return COLOR_SWATCHES[color.trim().toLowerCase()] ?? null;
}
