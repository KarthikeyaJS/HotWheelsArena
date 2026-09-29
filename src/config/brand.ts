/**
 * Brand strings — the ONLY place the store name / trademark wording may appear.
 * Swapping the naming later is a one-file edit. This module must stay free of
 * `import.meta.env`, DOM and React so vite.config.ts can import it too (it injects
 * these values into index.html and the generated web manifest).
 */

export const BRAND_NAME = 'HotWheelsArena';
/** Wordmark rendered in the navbar / footer (display font, uppercase). */
export const BRAND_LOGO_TEXT = 'HOTWHEELSARENA';
export const BRAND_SHORT_NAME = 'HWA';
export const BRAND_TAGLINE = 'PUSH THE LIMITS';
/** Hero headline line 1 (line 2 is `BRAND_TAGLINE`). */
export const BRAND_HERO_TITLE = 'HOT WHEELS';
/** The collectible line the store specialises in (used in copy such as "Indian ___ collectors"). */
export const BRAND_PRODUCT_LINE = 'Hot Wheels';
export const BRAND_DESCRIPTION =
  "The Digital Collector's Garage for Indian die-cast collectors — rare 1:64 cars, limited vault drops, a virtual garage, badges and XP. Every car is a collectible machine.";

export const CURRENCY = 'INR';
export const LOCALE = 'en-IN';
export const COUNTRY = 'India';

export const SUPPORT_EMAIL = 'pitcrew@hotwheelsarena.in';
/** Display format; use `SUPPORT_PHONE_E164` for `tel:` links. */
export const SUPPORT_PHONE = '+91 80 4567 8900';
export const SUPPORT_PHONE_E164 = '+918045678900';
export const SUPPORT_HOURS = 'Mon–Sat, 10:00–19:00 IST';

export type SocialPlatform = 'instagram' | 'youtube' | 'x' | 'facebook';

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  href: string;
  handle: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/hotwheelsarena',
    handle: '@hotwheelsarena',
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/@hotwheelsarena',
    handle: '@hotwheelsarena',
  },
  {
    platform: 'x',
    label: 'X (Twitter)',
    href: 'https://x.com/hotwheelsarena',
    handle: '@hotwheelsarena',
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/hotwheelsarena',
    handle: 'hotwheelsarena',
  },
];

/** Legal entity shown in the copyright line. */
export const COPYRIGHT_OWNER = 'HotWheelsArena Collectibles';

/** Trademark disclaimer shown in the footer (phrased so the brand swap keeps it accurate). */
export const FOOTER_DISCLAIMER = `${BRAND_NAME} is an independent collector store and is not affiliated with, sponsored by or endorsed by the owner of the ${BRAND_PRODUCT_LINE} trademark. All trademarks belong to their respective owners. Vehicle specifications shown on this site are themed and fictional.`;

/** Default <title> when a page does not provide one. */
export const DEFAULT_TITLE = `${BRAND_NAME} — ${BRAND_PRODUCT_LINE} Collector's Garage | Push The Limits`;

/** Browser UI colour per theme (index.html + ThemeSync). */
export const THEME_COLORS = { dark: '#080808', light: '#F6F5F2' } as const;
