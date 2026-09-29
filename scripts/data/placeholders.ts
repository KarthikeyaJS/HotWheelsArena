/**
 * Catalogue of the stylised car illustrations in `public/placeholders/`.
 *
 * Single source of truth for BOTH the image generator (`scripts/generate-images.ts`, which renders
 * one SVG per entry) and the seed data (`products.ts` references entries by id, so a typo is a
 * compile error and the validator can confirm every referenced file exists).
 */

/** Side-profile body shapes the generator can draw. */
export const CAR_BODIES = [
  'supercar',
  'coupe',
  'muscle',
  'offroad',
  'prototype',
  'rescue',
  'fantasy',
  'hatch',
] as const;
export type CarBody = (typeof CAR_BODIES)[number];

/** Metallic paint palettes (see `PAINT_PALETTES` in scripts/images/palette.ts). */
export const PAINTS = [
  'orange',
  'red',
  'blue',
  'green',
  'yellow',
  'gold',
  'silver',
  'white',
  'black',
  'purple',
] as const;
export type Paint = (typeof PAINTS)[number];

/** Decoration layered over the paint. */
export const LIVERIES = [
  'none',
  'race',
  'rally',
  'police',
  'patrol',
  'fire',
  'ambulance',
  'crash',
  'flames',
] as const;
export type Livery = (typeof LIVERIES)[number];

export interface CarVariant {
  body: CarBody;
  paint: Paint;
  livery: Livery;
  /** Lower-case colour/livery description used in image alt text, e.g. `yellow race livery`. */
  label: string;
  /** Race number drawn in the door roundel (race / rally liveries). */
  number?: string;
}

export const CAR_VARIANTS = {
  'supercar-orange': { body: 'supercar', paint: 'orange', livery: 'none', label: 'orange' },
  'supercar-green': { body: 'supercar', paint: 'green', livery: 'none', label: 'green' },
  'supercar-gold': { body: 'supercar', paint: 'gold', livery: 'none', label: 'gold' },
  'supercar-silver': { body: 'supercar', paint: 'silver', livery: 'none', label: 'silver' },
  'supercar-white': { body: 'supercar', paint: 'white', livery: 'none', label: 'pearl white' },
  'supercar-race': {
    body: 'supercar',
    paint: 'yellow',
    livery: 'race',
    label: 'yellow race livery',
    number: '4',
  },
  'coupe-blue': { body: 'coupe', paint: 'blue', livery: 'none', label: 'blue' },
  'coupe-orange': { body: 'coupe', paint: 'orange', livery: 'none', label: 'orange' },
  'coupe-silver': { body: 'coupe', paint: 'silver', livery: 'none', label: 'silver' },
  'coupe-white': { body: 'coupe', paint: 'white', livery: 'none', label: 'white' },
  'coupe-purple': { body: 'coupe', paint: 'purple', livery: 'none', label: 'midnight purple' },
  'coupe-red': { body: 'coupe', paint: 'red', livery: 'none', label: 'red' },
  'coupe-black': { body: 'coupe', paint: 'black', livery: 'none', label: 'black' },
  'coupe-rally': {
    body: 'coupe',
    paint: 'white',
    livery: 'rally',
    label: 'white rally livery',
    number: '7',
  },
  'coupe-race': {
    body: 'coupe',
    paint: 'white',
    livery: 'race',
    label: 'white race livery',
    number: '12',
  },
  'muscle-blue': { body: 'muscle', paint: 'blue', livery: 'none', label: 'blue' },
  'muscle-police': {
    body: 'muscle',
    paint: 'black',
    livery: 'police',
    label: 'black-and-white police livery',
  },
  'offroad-green': { body: 'offroad', paint: 'green', livery: 'none', label: 'green' },
  'offroad-orange': { body: 'offroad', paint: 'orange', livery: 'none', label: 'orange' },
  'offroad-red': { body: 'offroad', paint: 'red', livery: 'none', label: 'red' },
  'offroad-black': { body: 'offroad', paint: 'black', livery: 'none', label: 'black' },
  'offroad-patrol': {
    body: 'offroad',
    paint: 'white',
    livery: 'patrol',
    label: 'white highway-patrol livery',
  },
  'offroad-flames': {
    body: 'offroad',
    paint: 'black',
    livery: 'flames',
    label: 'black with orange flames',
  },
  'prototype-white': {
    body: 'prototype',
    paint: 'white',
    livery: 'race',
    label: 'white race livery',
    number: '63',
  },
  'prototype-red': {
    body: 'prototype',
    paint: 'red',
    livery: 'race',
    label: 'red race livery',
    number: '8',
  },
  'prototype-blue': {
    body: 'prototype',
    paint: 'blue',
    livery: 'race',
    label: 'blue with white racing stripes',
    number: '2',
  },
  'rescue-fire': { body: 'rescue', paint: 'red', livery: 'fire', label: 'fire-service red' },
  'rescue-ambulance': {
    body: 'rescue',
    paint: 'white',
    livery: 'ambulance',
    label: 'ambulance white',
  },
  'rescue-crash': { body: 'rescue', paint: 'yellow', livery: 'crash', label: 'hi-vis yellow' },
  'fantasy-purple': { body: 'fantasy', paint: 'purple', livery: 'none', label: 'candy purple' },
  'fantasy-green': { body: 'fantasy', paint: 'green', livery: 'none', label: 'neon green' },
  'fantasy-orange': { body: 'fantasy', paint: 'orange', livery: 'none', label: 'blazing orange' },
  'hatch-race': {
    body: 'hatch',
    paint: 'white',
    livery: 'race',
    label: 'white race livery',
    number: '17',
  },
  'hatch-rally': {
    body: 'hatch',
    paint: 'blue',
    livery: 'rally',
    label: 'blue rally livery',
    number: '22',
  },
} as const satisfies Record<string, CarVariant>;

export type CarVariantId = keyof typeof CAR_VARIANTS;

export const CAR_VARIANT_IDS = Object.keys(CAR_VARIANTS) as CarVariantId[];

/** Public URL folder of the generated placeholders (served from `public/placeholders`). */
export const PLACEHOLDER_URL_PREFIX = '/placeholders/';

/** Always-available fallback (FALLBACK_CAR_IMAGE in src/config/site.ts). */
export const GENERIC_CAR_URL = `${PLACEHOLDER_URL_PREFIX}car-generic.svg`;

/** `/placeholders/<variant>.svg`. */
export function placeholderUrl(id: CarVariantId): string {
  return `${PLACEHOLDER_URL_PREFIX}${id}.svg`;
}

/** Cloudinary folder for product images (`publicId` = `hotwheelsarena/cars/<slug>[-n]`). */
export const CLOUDINARY_CAR_FOLDER = 'hotwheelsarena/cars';
