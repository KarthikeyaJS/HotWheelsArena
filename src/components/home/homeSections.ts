/**
 * Home page section registry: ids (used for anchors and `aria-labelledby`) in their fixed
 * on-page order, plus the in-page jump helper used by the hero's "Explore Collection" CTA.
 */

export const HOME_SECTION_IDS = {
  hero: 'hero',
  collection: 'collection',
  newArrivals: 'new-arrivals',
  featured: 'featured',
  vault: 'vault',
  garage: 'garage',
  achievements: 'achievements',
  about: 'about',
} as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[keyof typeof HOME_SECTION_IDS];

/** Every home section, top to bottom (spec §5.1 order). */
export const HOME_SECTION_ORDER: readonly HomeSectionId[] = [
  HOME_SECTION_IDS.hero,
  HOME_SECTION_IDS.collection,
  HOME_SECTION_IDS.newArrivals,
  HOME_SECTION_IDS.featured,
  HOME_SECTION_IDS.vault,
  HOME_SECTION_IDS.garage,
  HOME_SECTION_IDS.achievements,
  HOME_SECTION_IDS.about,
];

/** `aria-labelledby` target for a section's heading. */
export const sectionHeadingId = (id: HomeSectionId): string => `${id}-title`;

export interface ScrollToSectionOptions {
  /** Jump instantly instead of gliding (prefers-reduced-motion). */
  reducedMotion: boolean;
  /** Move keyboard focus to the section afterwards (default true). */
  focus?: boolean;
}

/**
 * Scrolls a home section into view (honouring the global `scroll-padding-top` for the sticky
 * header) and moves focus to it without a second jump, so keyboard and screen-reader users land
 * where the page scrolled to. No URL hash change (SPA-safe). Returns false when the section is
 * not on the page.
 */
export function scrollToSection(
  id: HomeSectionId,
  { reducedMotion, focus = true }: ScrollToSectionOptions,
): boolean {
  if (typeof document === 'undefined') return false;
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  if (focus) target.focus({ preventScroll: true });
  return true;
}
