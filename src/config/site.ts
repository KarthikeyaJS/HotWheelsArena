/**
 * Site-wide presentation config: canonical origin, default meta, category display metadata
 * and shared asset paths.
 */
import { Flag, Gauge, Gem, Mountain, Siren, Sparkles, type LucideIcon } from 'lucide-react';
import { CATEGORY_SLUGS, type CategorySlug } from '@shared/types';
import { BRAND_DESCRIPTION, DEFAULT_TITLE } from './brand';
import { env } from './env';

/** Public origin without trailing slash. */
export const SITE_URL = env.siteUrl;

/** Absolute URL for a site-relative path (`/product/x` → `https://…/product/x`). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** 1200×630 social preview image (served from public/). */
export const OG_IMAGE_PATH = '/og-image.png';

export interface DefaultMeta {
  title: string;
  description: string;
  image: string;
  type: 'website';
}

export const DEFAULT_META: Readonly<DefaultMeta> = {
  title: DEFAULT_TITLE,
  description: BRAND_DESCRIPTION,
  image: OG_IMAGE_PATH,
  type: 'website',
};

/** Always-available car placeholder (public/placeholders). */
export const FALLBACK_CAR_IMAGE = '/placeholders/car-generic.svg';
/** Hero LCP image (public/placeholders). */
export const HERO_CAR_IMAGE = '/placeholders/hero-car.svg';

export interface CategoryDisplay {
  slug: CategorySlug;
  /** Uppercase display label, e.g. `OFF ROAD`. */
  label: string;
  /** Title-case name for prose / aria, e.g. `Off Road`. */
  name: string;
  tagline: string;
  /** lucide-react icon name (matches `categories/{id}.icon` in Firestore). */
  iconName: string;
  icon: LucideIcon;
  /** Parked-car silhouette placeholder for the "Choose Your Ride" cards. */
  silhouette: string;
  order: number;
}

export const CATEGORY_DISPLAY: Readonly<Record<CategorySlug, CategoryDisplay>> = {
  sports: {
    slug: 'sports',
    label: 'SPORTS',
    name: 'Sports',
    tagline: 'Built for the fast lane',
    iconName: 'Gauge',
    icon: Gauge,
    silhouette: '/placeholders/category-sports.svg',
    order: 1,
  },
  'off-road': {
    slug: 'off-road',
    label: 'OFF ROAD',
    name: 'Off Road',
    tagline: 'Mud, dirt and zero limits',
    iconName: 'Mountain',
    icon: Mountain,
    silhouette: '/placeholders/category-off-road.svg',
    order: 2,
  },
  racing: {
    slug: 'racing',
    label: 'RACING',
    name: 'Racing',
    tagline: 'Born on the circuit',
    iconName: 'Flag',
    icon: Flag,
    silhouette: '/placeholders/category-racing.svg',
    order: 3,
  },
  special: {
    slug: 'special',
    label: 'SPECIAL',
    name: 'Special',
    tagline: 'Character cars and oddball legends',
    iconName: 'Sparkles',
    icon: Sparkles,
    silhouette: '/placeholders/category-special.svg',
    order: 4,
  },
  rescue: {
    slug: 'rescue',
    label: 'RESCUE',
    name: 'Rescue',
    tagline: 'First responders, full throttle',
    iconName: 'Siren',
    icon: Siren,
    silhouette: '/placeholders/category-rescue.svg',
    order: 5,
  },
  limited: {
    slug: 'limited',
    label: 'LIMITED',
    name: 'Limited',
    tagline: 'Numbered drops from the vault',
    iconName: 'Gem',
    icon: Gem,
    silhouette: '/placeholders/category-limited.svg',
    order: 6,
  },
};

/** Category slugs in display order. */
export const CATEGORY_ORDER: readonly CategorySlug[] = [...CATEGORY_SLUGS].sort(
  (a, b) => CATEGORY_DISPLAY[a].order - CATEGORY_DISPLAY[b].order,
);

export function isCategorySlug(value: string | null | undefined): value is CategorySlug {
  return value != null && (CATEGORY_SLUGS as readonly string[]).includes(value);
}

/** Display metadata for a (possibly unknown) category slug. */
export function getCategoryDisplay(slug: string | null | undefined): CategoryDisplay | undefined {
  return isCategorySlug(slug) ? CATEGORY_DISPLAY[slug] : undefined;
}
