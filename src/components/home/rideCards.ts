/**
 * "Choose Your Ride" data: merges the Firestore categories (order / active flag) with the
 * display metadata in `CATEGORY_DISPLAY` and live per-category product counts.
 */
import type { LucideIcon } from 'lucide-react';
import { CATEGORY_DISPLAY, CATEGORY_ORDER, isCategorySlug } from '@/config/site';
import type { Category, CategorySlug, Product } from '@/types';

export interface HeadlightPosition {
  /** % of the silhouette box width. */
  x: number;
  /** % of the silhouette box height. */
  y: number;
}

/**
 * Headlight centre of each parked-car silhouette (`/placeholders/category-<slug>.svg`,
 * 800×450) — where the "headlights on" glow is drawn.
 */
export const HEADLIGHT_POSITIONS: Readonly<Record<CategorySlug, HeadlightPosition>> = {
  sports: { x: 92, y: 64.9 },
  'off-road': { x: 92.3, y: 58.2 },
  racing: { x: 92, y: 65.3 },
  special: { x: 90.8, y: 60.4 },
  rescue: { x: 93, y: 60 },
  limited: { x: 91.3, y: 60.7 },
};

export interface RideCard {
  slug: CategorySlug;
  /** `OFF ROAD` */
  label: string;
  /** `Off Road` */
  name: string;
  tagline: string;
  icon: LucideIcon;
  silhouette: string;
  /** Parking bay number, 1-based, in display order. */
  bay: number;
  /** Active cars in this class; `null` while unknown (loading / error). */
  count: number | null;
  headlight: HeadlightPosition;
}

/**
 * Category slugs in display order: the active Firestore categories sorted by `order`, or — when
 * the query failed / returned nothing usable — the static `CATEGORY_ORDER`.
 */
export function orderedCategorySlugs(categories: readonly Category[] | undefined): CategorySlug[] {
  const seen = new Set<CategorySlug>();
  const fromQuery = [...(categories ?? [])]
    .filter((category) => category.isActive && isCategorySlug(category.slug))
    .sort((a, b) => a.order - b.order)
    .map((category) => category.slug)
    .filter((slug) => {
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
  return fromQuery.length > 0 ? fromQuery : [...CATEGORY_ORDER];
}

/** Active product count per category (`null` when the catalogue isn't available). */
export function countByCategory(
  products: readonly Product[] | undefined,
): Partial<Record<CategorySlug, number>> | null {
  if (!products) return null;
  const counts: Partial<Record<CategorySlug, number>> = {};
  for (const product of products) {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
  }
  return counts;
}

export function buildRideCards(
  categories: readonly Category[] | undefined,
  products: readonly Product[] | undefined,
): RideCard[] {
  const counts = countByCategory(products);
  return orderedCategorySlugs(categories).map((slug, index) => {
    const display = CATEGORY_DISPLAY[slug];
    return {
      slug,
      label: display.label,
      name: display.name,
      tagline: display.tagline,
      icon: display.icon,
      silhouette: display.silhouette,
      bay: index + 1,
      count: counts ? (counts[slug] ?? 0) : null,
      headlight: HEADLIGHT_POSITIONS[slug],
    };
  });
}
