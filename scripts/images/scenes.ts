/**
 * Complete SVG documents built from the car renderer and glyph font:
 * product placeholders, the generic fallback, "parked car" category silhouettes, the hero car,
 * the favicon and the 1200×630 social card.
 */
import type { CategorySlug } from '../../shared/types.ts';
import {
  CAR_VARIANTS,
  type CarBody,
  type CarVariantId,
  type Livery,
} from '../data/placeholders.ts';
import { renderCar, stackCar } from './car.ts';
import { strokeFor, textRun } from './glyphs.ts';
import { BRAND, CHROME_RAMP, GRAPHITE_RAMP, METAL_RAMP, PAINT_PALETTES } from './palette.ts';
import { el, linearGradient, n, radialGradient, svgDocument } from './svg.ts';

/** Text for the brand art (read from src/config/brand.ts by the generator). */
export interface BrandText {
  logo: string;
  tagline: string;
  shortName: string;
  country: string;
}

/* ------------------------------ car documents ----------------------------- */

export function placeholderSvg(variantId: CarVariantId): string {
  const variant = CAR_VARIANTS[variantId];
  const { defs, content } = stackCar(
    renderCar({
      id: variantId,
      body: variant.body,
      ramp: PAINT_PALETTES[variant.paint],
      paint: variant.paint,
      livery: variant.livery,
      number: 'number' in variant ? variant.number : undefined,
    }),
  );
  return svgDocument(800, 450, `<defs>${defs}</defs>${content}`);
}

/** Neutral graphite coupe used whenever a product image fails to load. */
export function genericCarSvg(): string {
  const { defs, content } = stackCar(
    renderCar({ id: 'generic', body: 'coupe', ramp: GRAPHITE_RAMP, caliper: null }),
  );
  return svgDocument(800, 450, `<defs>${defs}</defs>${content}`);
}

interface CategoryArt {
  body: CarBody;
  livery: Livery;
  accentLine?: string;
}

const CATEGORY_ART: Readonly<Record<CategorySlug, CategoryArt>> = {
  sports: { body: 'supercar', livery: 'none' },
  'off-road': { body: 'offroad', livery: 'none' },
  racing: { body: 'prototype', livery: 'none' },
  special: { body: 'fantasy', livery: 'none' },
  rescue: { body: 'rescue', livery: 'fire' },
  limited: { body: 'coupe', livery: 'none', accentLine: BRAND.highlight },
};

/**
 * "Parked car" silhouette in dark garage metal. Headlights are grouped under
 * `class="headlight"` (dim by default via the opacity attribute), tail lamps carry
 * `class="taillight"` and rescue light bars `class="beacon"`, so an inlined copy can light them
 * up with CSS, e.g. `.group:hover .headlight { opacity: 1 }`.
 */
export function categorySvg(slug: CategorySlug): string {
  const art = CATEGORY_ART[slug];
  const layers = renderCar({
    id: `cat-${slug}`,
    body: art.body,
    ramp: METAL_RAMP,
    livery: art.livery,
    style: 'silhouette',
    accentLine: art.accentLine,
    caliper: null,
  });
  const content = [
    layers.shadow,
    layers.underlay,
    layers.wells,
    layers.wheelRear,
    layers.wheelFront,
    layers.body,
    el('g', { class: 'headlight', opacity: 0.35 }, layers.headlamp + layers.glow),
  ].join('');
  return svgDocument(800, 450, `<defs>${layers.defs}</defs>${content}`);
}

/* ---------------------------------- hero ---------------------------------- */

/**
 * Hero car, 1600×800, facing right. Groups with ids `body`, `wheel-rear`, `wheel-front` and
 * `headlights` let an inlined copy spin the wheels (they rotate around their own centres thanks
 * to `transform-box: fill-box`) and flare the lights. Other ids are prefixed `hc-`.
 */
export function heroCarSvg(): string {
  const layers = renderCar({
    id: 'hc',
    body: 'supercar',
    ramp: CHROME_RAMP,
    style: 'hero',
    sideStripes: BRAND.accent,
    caliper: null,
  });
  const heroDetails = [
    // Ducktail wing + supports.
    el('path', {
      d: 'M86 238L182 232L184 241L88 247Z',
      fill: '#15171A',
      stroke: '#FFFFFF',
      'stroke-opacity': 0.35,
      'stroke-width': 1,
    }),
    el('path', { d: 'M132 244L138 254M160 242L166 252', stroke: '#15171A', 'stroke-width': 4 }),
    // Engine-bay louvres.
    el('path', {
      d: 'M212 252L232 244M226 254L246 246M240 256L260 248M254 258L274 250',
      stroke: '#0E1013',
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }),
    // Second glass reflection + fuel filler.
    el('path', { d: 'M494 207L506 208L468 249L456 249Z', fill: '#FFFFFF', opacity: 0.1 }),
    el('circle', {
      cx: 330,
      cy: 244,
      r: 5,
      fill: 'none',
      stroke: '#0E1013',
      'stroke-opacity': 0.6,
      'stroke-width': 1.5,
    }),
    // Brake-cooling vent ahead of the front wheel.
    el('path', { d: 'M650 288L676 286L672 300L648 302Z', fill: '#0E1013' }),
  ].join('');
  const beam = el('path', {
    d: 'M728 286L800 262V330L728 298Z',
    fill: 'url(#hc-beam)',
  });
  const defs =
    layers.defs +
    linearGradient('hc-beam', { x1: 728, y1: 0, x2: 800, y2: 0 }, [
      [0, '#FFF3CF', 0.65],
      [1, '#FFF3CF', 0],
    ]);
  const scene = el('g', { transform: 'translate(-89 -120) scale(2.2)' }, [
    el('g', { id: 'hc-shadow' }, layers.shadow),
    el('g', { id: 'hc-chassis' }, layers.wells),
    el('g', { id: 'wheel-rear' }, layers.wheelRear),
    el('g', { id: 'wheel-front' }, layers.wheelFront),
    el('g', { id: 'body' }, layers.body + heroDetails),
    el('g', { id: 'headlights' }, layers.headlamp + beam + layers.glow),
  ]);
  const style = el(
    'style',
    {},
    '#wheel-rear,#wheel-front{transform-box:fill-box;transform-origin:center}',
  );
  return svgDocument(1600, 800, `${style}<defs>${defs}</defs>${scene}`);
}

/* ---------------------------------- brand --------------------------------- */

function strokeText(
  d: string,
  size: number,
  color: string,
  weight = 0.95,
  extra: Record<string, string | number> = {},
): string {
  return el('path', {
    d,
    fill: 'none',
    stroke: color,
    'stroke-width': n(strokeFor(size, weight)),
    'stroke-linecap': 'square',
    'stroke-linejoin': 'miter',
    ...extra,
  });
}

/** Racing monogram: the first letter of the short brand name, slanted, with speed lines. */
export function faviconSvg(brand: BrandText): { svg: string; missing: string[] } {
  const letter = [...brand.shortName.trim()][0] ?? 'H';
  const run = textRun(letter, { x: 35, y: 46, size: 29, anchor: 'middle', slant: 12 });
  const content = [
    el('rect', { width: 64, height: 64, rx: 14, fill: BRAND.ink }),
    el('path', {
      d: 'M8 24H18M5 32H16M8 40H15',
      stroke: '#FFFFFF',
      'stroke-opacity': 0.55,
      'stroke-width': 3,
      'stroke-linecap': 'round',
    }),
    strokeText(run.d, 29, BRAND.accent, 1.35),
    el('rect', { x: 14, y: 52, width: 38, height: 3.5, rx: 1.75, fill: BRAND.accent }),
  ].join('');
  return { svg: svgDocument(64, 64, content), missing: run.missing };
}

/** 1200×630 social card: garage floor, orange racing lines, chrome hero car, brand text. */
export function ogImageSvg(brand: BrandText): { svg: string; missing: string[] } {
  const W = 1200;
  const H = 630;
  const words = brand.tagline.trim().split(/\s+/);
  const line2 = words.length > 1 ? (words.pop() ?? '') : '';
  const line1 = words.join(' ');

  const logo = textRun(brand.logo, { x: 96, y: 118, size: 26, tracking: 2.1 });
  const tag1 = textRun(line1, { x: 72, y: 250, size: 64, tracking: 1.7, slant: 8 });
  const tag2 = textRun(line2, { x: 72, y: 340, size: 64, tracking: 1.7, slant: 8 });
  const sub = textRun("DIGITAL COLLECTOR'S GARAGE", { x: 74, y: 404, size: 17, tracking: 2.2 });
  const hud = textRun(`1:64 DIE-CAST · VAULT DROPS · ${brand.country}`, {
    x: 74,
    y: 566,
    size: 13,
    tracking: 2.2,
  });

  let grid = '';
  for (let x = 40; x < W; x += 40) grid += `M${x} 0V${H}`;
  for (let y = 30; y < H; y += 40) grid += `M0 ${y}H${W}`;

  const car = renderCar({
    id: 'og-car',
    body: 'supercar',
    ramp: CHROME_RAMP,
    style: 'hero',
    sideStripes: BRAND.accent,
    caliper: null,
  });
  const carStack = stackCar(car);

  const defs = [
    radialGradient('og-bg-vignette', { cx: 700, cy: 360, r: 760 }, [
      [0, BRAND.bg, 0],
      [0.65, BRAND.bg, 0.55],
      [1, BRAND.bg, 0.95],
    ]),
    radialGradient('og-bg-glow', { cx: 850, cy: 470, r: 420, squash: 0.55 }, [
      [0, BRAND.accent, 0.3],
      [0.5, BRAND.accent, 0.08],
      [1, BRAND.accent, 0],
    ]),
    linearGradient('og-bg-floor', { x1: 0, y1: 470, x2: 0, y2: H }, [
      [0, '#FFFFFF', 0],
      [1, '#FFFFFF', 0.05],
    ]),
    carStack.defs,
  ].join('');

  const content = [
    el('rect', { width: W, height: H, fill: BRAND.bg }),
    el('path', { d: grid, stroke: '#FFFFFF', 'stroke-opacity': 0.045, 'stroke-width': 1 }),
    el('rect', { y: 470, width: W, height: H - 470, fill: 'url(#og-bg-floor)' }),
    el('rect', { width: W, height: H, fill: 'url(#og-bg-glow)' }),
    // Racing lines sweeping under the car.
    el('path', { d: 'M560 600L1200 470V486L600 610Z', fill: BRAND.accent, opacity: 0.9 }),
    el('path', { d: 'M640 612L1200 500V506L668 616Z', fill: BRAND.accent, opacity: 0.55 }),
    el('path', {
      d: 'M0 612L420 612',
      stroke: '#FFFFFF',
      'stroke-opacity': 0.12,
      'stroke-width': 2,
      'stroke-dasharray': '26 18',
    }),
    el('rect', { width: W, height: H, fill: 'url(#og-bg-vignette)' }),
    el('g', { transform: 'translate(413 190) scale(1.05)' }, carStack.content),
    // Brand text.
    el('rect', { x: 72, y: 92, width: 12, height: 26, fill: BRAND.accent }),
    strokeText(logo.d, 26, '#FFFFFF', 1),
    strokeText(tag1.d, 64, '#FFFFFF', 1.05),
    strokeText(tag2.d, 64, BRAND.accent, 1.05),
    el('rect', { x: 74, y: 364, width: 132, height: 6, fill: BRAND.accent }),
    strokeText(sub.d, 17, '#B8BCC2', 0.9),
    strokeText(hud.d, 13, BRAND.accentLight, 0.9),
    el('rect', {
      x: 0.5,
      y: 0.5,
      width: W - 1,
      height: H - 1,
      fill: 'none',
      stroke: '#FFFFFF',
      'stroke-opacity': 0.08,
    }),
  ].join('');

  return {
    svg: svgDocument(W, H, `<defs>${defs}</defs>${content}`),
    missing: [logo, tag1, tag2, sub, hud].flatMap((run) => run.missing),
  };
}
