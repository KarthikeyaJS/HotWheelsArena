/**
 * Pure model for the command palette: turns (query, catalogue, recent searches) into ordered
 * option groups. Kept framework-free so it can be unit-tested and reused (e.g. a search page
 * typeahead).
 */
import {
  Clock,
  Heart,
  HelpCircle,
  Mail,
  Package,
  Search,
  ShoppingCart,
  Trophy,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { NAV_LINKS } from '@/config/nav';
import { ROUTES, garagePath, productPath, searchPath, shopPath } from '@/config/routes';
import { CATEGORY_DISPLAY, CATEGORY_ORDER } from '@/config/site';
import { formatCollectionNumber } from '@/lib/format';
import { groupSuggestions, matchText, searchProducts, type SearchIndex } from '@/lib/search';
import type { Product } from '@/types';

export type PaletteItemKind = 'search' | 'recent' | 'make' | 'model' | 'car' | 'category' | 'link';

export interface PaletteItem {
  /** Stable, unique key (`car:<slug>`, `link:/vault` …). */
  id: string;
  kind: PaletteItemKind;
  label: string;
  /** Secondary line / right-hand meta. */
  description?: string;
  /** Router destination. */
  to: string;
  /** Query saved to recent searches when this option is chosen. */
  recentQuery?: string;
  /** Car rows only. */
  product?: Product;
  /** Makes / models: number of matching cars. */
  count?: number;
  icon?: LucideIcon;
  /** Rendered indented under the previous item (models under their make). */
  indent?: boolean;
}

export interface PaletteGroup {
  id: string;
  /** Visible section header (omitted for continuation groups, e.g. the 2nd make). */
  heading?: string;
  /** Accessible group name. */
  label: string;
  items: PaletteItem[];
}

export interface QuickLink {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
  /** Extra words for matching ("cart", "basket"…). */
  keywords?: string;
  /** Only offered when the query matches (not in the default list). */
  searchOnly?: boolean;
}

export const QUICK_LINKS: readonly QuickLink[] = [
  ...NAV_LINKS.map((link) => ({
    id: link.id,
    label: link.label,
    description: link.description,
    to: link.to,
    icon: link.icon,
    keywords:
      link.id === 'garage'
        ? 'shop all cars catalogue browse'
        : link.id === 'my-garage'
          ? 'collection dashboard profile xp level'
          : link.id === 'new-drops'
            ? 'new arrivals latest just off the track'
            : link.id === 'vault'
              ? 'limited rare edition numbered'
              : 'series sets',
  })),
  {
    id: 'cart',
    label: 'Pit stop',
    description: 'Your cart',
    to: ROUTES.cart,
    icon: ShoppingCart,
    keywords: 'cart basket bag checkout',
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    description: 'Cars on your hit list',
    to: ROUTES.wishlist,
    icon: Heart,
    keywords: 'saved favourites favorites',
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Track your deliveries',
    to: ROUTES.orders,
    icon: Package,
    keywords: 'order history delivery tracking',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    description: 'Badges, level and XP',
    to: garagePath('achievements'),
    icon: Trophy,
    keywords: 'badges xp level rewards',
    searchOnly: true,
  },
  {
    id: 'shipping',
    label: 'Shipping & returns',
    description: 'Delivery times and return policy',
    to: ROUTES.shippingReturns,
    icon: Truck,
    keywords: 'delivery return refund',
    searchOnly: true,
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Answers from the pit crew',
    to: ROUTES.faq,
    icon: HelpCircle,
    keywords: 'help questions support',
    searchOnly: true,
  },
  {
    id: 'contact',
    label: 'Contact',
    description: 'Talk to the pit crew',
    to: ROUTES.contact,
    icon: Mail,
    keywords: 'support email phone help',
    searchOnly: true,
  },
];

/** Suggested queries shown when nothing matches. */
export const SEARCH_SUGGESTIONS: readonly string[] = ['Porsche', 'Rally', 'Limited', 'Off road'];

export interface BuildPaletteOptions {
  query: string;
  products: readonly Product[];
  index: SearchIndex;
  recent: readonly string[];
  /** Max car rows (default 6). */
  maxCars?: number;
  /** Max makes in the Make → Models group (default 3). */
  maxMakes?: number;
  /** Max models per make (default 5). */
  maxModels?: number;
}

const linkItem = (link: QuickLink): PaletteItem => ({
  id: `link:${link.id}`,
  kind: 'link',
  label: link.label,
  description: link.description,
  to: link.to,
  icon: link.icon,
});

const categoryItems = (query: string): PaletteItem[] =>
  CATEGORY_ORDER.map((slug) => CATEGORY_DISPLAY[slug])
    .filter(
      (category) =>
        !query ||
        matchText(
          `${category.label} ${category.name} ${category.tagline} ${category.slug}`,
          query,
        ) > 0,
    )
    .map((category) => ({
      id: `category:${category.slug}`,
      kind: 'category' as const,
      label: category.name,
      description: category.tagline,
      to: shopPath({ category: category.slug }),
      icon: category.icon,
    }));

/** Ordered option groups for the palette. Blank query → recent searches, quick links, categories. */
export function buildPaletteGroups({
  query,
  products,
  index,
  recent,
  maxCars = 6,
  maxMakes = 3,
  maxModels = 5,
}: BuildPaletteOptions): PaletteGroup[] {
  const trimmed = query.trim();
  const groups: PaletteGroup[] = [];

  if (!trimmed) {
    if (recent.length > 0) {
      groups.push({
        id: 'recent',
        heading: 'Recent searches',
        label: 'Recent searches',
        items: recent.map((entry) => ({
          id: `recent:${entry.toLowerCase()}`,
          kind: 'recent',
          label: entry,
          to: searchPath(entry),
          recentQuery: entry,
          icon: Clock,
        })),
      });
    }
    groups.push({
      id: 'links',
      heading: 'Quick links',
      label: 'Quick links',
      items: QUICK_LINKS.filter((link) => !link.searchOnly).map(linkItem),
    });
    groups.push({
      id: 'categories',
      heading: 'Categories',
      label: 'Categories',
      items: categoryItems(''),
    });
    return groups;
  }

  groups.push({
    id: 'search',
    heading: 'Search',
    label: 'Search',
    items: [
      {
        id: 'search:query',
        kind: 'search',
        label: `Search the garage for “${trimmed}”`,
        description: 'All results',
        to: searchPath(trimmed),
        recentQuery: trimmed,
        icon: Search,
      },
    ],
  });

  groupSuggestions(products, trimmed, { maxMakes, maxModels }).forEach((suggestion, position) => {
    const total = suggestion.models.reduce((sum, model) => sum + model.count, 0);
    const makeCount = products.filter(
      (product) => product.make.toLowerCase() === suggestion.make.toLowerCase(),
    ).length;
    groups.push({
      id: `make:${suggestion.make.toLowerCase()}`,
      ...(position === 0 ? { heading: 'Makes → Models' } : {}),
      label: `${suggestion.make} models`,
      items: [
        {
          id: `make:${suggestion.make.toLowerCase()}`,
          kind: 'make',
          label: suggestion.make,
          description: 'All models',
          to: searchPath(suggestion.make),
          recentQuery: suggestion.make,
          count: Math.max(makeCount, total),
        },
        ...suggestion.models.map((model) => ({
          id: `model:${suggestion.make.toLowerCase()}:${model.model.toLowerCase()}`,
          kind: 'model' as const,
          label: model.model,
          description: suggestion.make,
          to: searchPath(`${suggestion.make} ${model.model}`),
          recentQuery: `${suggestion.make} ${model.model}`,
          count: model.count,
          indent: true,
        })),
      ],
    });
  });

  const cars = searchProducts(index, trimmed, maxCars);
  if (cars.length > 0) {
    groups.push({
      id: 'cars',
      heading: 'Cars',
      label: 'Cars',
      items: cars.map((product) => ({
        id: `car:${product.slug}`,
        kind: 'car',
        label: product.name,
        description: `${product.seriesName} · ${formatCollectionNumber(product.collectionNumber)}`,
        to: productPath(product.slug),
        product,
      })),
    });
  }

  const categories = categoryItems(trimmed);
  if (categories.length > 0) {
    groups.push({
      id: 'categories',
      heading: 'Categories',
      label: 'Categories',
      items: categories,
    });
  }

  const links = QUICK_LINKS.filter(
    (link) => matchText(`${link.label} ${link.description} ${link.keywords ?? ''}`, trimmed) > 0,
  ).map(linkItem);
  if (links.length > 0) {
    groups.push({ id: 'links', heading: 'Quick links', label: 'Quick links', items: links });
  }

  return groups;
}

/** Number of real results (excludes the free-text "Search for …" option). */
export function countPaletteResults(groups: readonly PaletteGroup[]): number {
  return groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.kind !== 'search').length,
    0,
  );
}
