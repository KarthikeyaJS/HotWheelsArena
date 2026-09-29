/**
 * Renders a stylised die-cast car (side profile, facing right) as layered SVG fragments in the
 * 800×450 coordinate space defined by bodies.ts. Callers compose the layers into a document:
 * product placeholders stack them directly, the hero wraps wheels / headlights in groups with ids
 * so they can be animated, and category silhouettes tag the headlights with class="headlight".
 *
 * No filters are used (only gradients), so hundreds of thumbnails stay cheap to paint.
 */
import type { CarBody, Livery, Paint } from '../data/placeholders.ts';
import {
  BODIES,
  flarePath,
  GROUND_Y,
  shellPath,
  wellPath,
  type BodyGeometry,
  type WheelSpec,
} from './bodies.ts';
import { strokeFor, textRun } from './glyphs.ts';
import { BRAND, liveryAccents, type PaintRamp } from './palette.ts';
import { el, linearGradient, n, radialGradient } from './svg.ts';

export type CarStyle = 'product' | 'silhouette' | 'hero';

export interface CarOptions {
  /** Unique id prefix for gradients/clip paths (keeps ids unique when SVGs are inlined together). */
  id: string;
  body: CarBody;
  ramp: PaintRamp;
  /** Paint name — picks livery accent colours. */
  paint?: Paint;
  livery?: Livery;
  /** Race number for race / rally liveries. */
  number?: string;
  style?: CarStyle;
  /** Pinstripe colour along the character line (e.g. vault gold on the Limited silhouette). */
  accentLine?: string;
  /** Brake caliper colour (product style only); `null` hides it. */
  caliper?: string | null;
  /** Racing stripes along the flank (hero). */
  sideStripes?: string;
}

export interface CarLayers {
  defs: string;
  shadow: string;
  underlay: string;
  wells: string;
  wheelRear: string;
  wheelFront: string;
  body: string;
  /** Headlamp lens (kept apart so it can be grouped with the glow). */
  headlamp: string;
  /** Light spill in front of the car. */
  glow: string;
  geometry: BodyGeometry;
}

const TRIM = '#16181B';
const INK = BRAND.ink;
const LIGHTBAR_RED = '#FF2A1F';
const LIGHTBAR_BLUE = '#2F6BFF';
const LIGHTBAR_AMBER = '#FFB000';

function spokes(count: number, radius: number, offsetDeg = -90): string {
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const angle = ((offsetDeg + (360 / count) * i) * Math.PI) / 180;
    d += `M0 0L${n(Math.cos(angle) * radius)} ${n(Math.sin(angle) * radius)}`;
  }
  return d;
}

function wheelDef(id: string, style: CarStyle, caliper: string | null): string {
  const rim = `url(#${id}-rim)`;
  if (style === 'hero') {
    return el('g', { id: `${id}-w` }, [
      el('circle', { r: 50, fill: '#101010' }),
      el('circle', { r: 46, fill: 'none', stroke: '#2B2B2B', 'stroke-width': 2.5 }),
      el('circle', { r: 37, fill: '#141619' }),
      el('circle', { r: 27, fill: 'none', stroke: '#8E949B', 'stroke-width': 9 }),
      el('circle', {
        r: 27,
        fill: 'none',
        stroke: '#5E646B',
        'stroke-width': 1,
        'stroke-dasharray': '2 5',
      }),
      el('path', {
        d: spokes(10, 33),
        stroke: rim,
        'stroke-width': 4.5,
        'stroke-linecap': 'round',
      }),
      el('circle', { r: 36, fill: 'none', stroke: rim, 'stroke-width': 3.5 }),
      el('circle', { r: 37.8, fill: 'none', stroke: BRAND.accent, 'stroke-width': 1.4 }),
      el('circle', { r: 9, fill: rim }),
      el('circle', { r: 3.5, fill: BRAND.accent }),
    ]);
  }
  const dark = style === 'silhouette';
  return el('g', { id: `${id}-w` }, [
    el('circle', { r: 50, fill: dark ? '#0C0D0E' : '#131313' }),
    el('circle', {
      r: 45.5,
      fill: 'none',
      stroke: dark ? '#222428' : '#2E2E2E',
      'stroke-width': 3,
    }),
    el('circle', { r: 36, fill: dark ? '#101113' : '#191B1E' }),
    caliper && !dark
      ? el('path', { d: 'M13 -29A32 32 0 0 1 29 -13L21 -9A23 23 0 0 0 9 -21Z', fill: caliper })
      : '',
    el('path', { d: spokes(5, 31), stroke: rim, 'stroke-width': 8, 'stroke-linecap': 'round' }),
    el('circle', { r: 35, fill: 'none', stroke: rim, 'stroke-width': 4 }),
    el('circle', { r: 10, fill: rim }),
    el('circle', { r: 4, fill: dark ? '#1A1C1F' : '#2A2D31' }),
  ]);
}

function placeWheel(id: string, wheel: WheelSpec): string {
  return el('use', {
    href: `#${id}-w`,
    transform: `translate(${n(wheel.cx)} ${n(wheel.cy)}) scale(${Math.round((wheel.r / 50) * 1000) / 1000})`,
  });
}

function roundel(center: { cx: number; cy: number }, number: string): string {
  const size = number.length > 1 ? 17 : 19;
  const run = textRun(number, {
    x: center.cx,
    y: center.cy + size / 2,
    size,
    anchor: 'middle',
    tracking: 1.6,
  });
  return el('g', {}, [
    el('circle', {
      cx: center.cx,
      cy: center.cy,
      r: 23,
      fill: '#FFFFFF',
      stroke: INK,
      'stroke-width': 3,
    }),
    el('path', {
      d: run.d,
      fill: 'none',
      stroke: INK,
      'stroke-width': strokeFor(size, 1.05),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  ]);
}

function lightbar(geometry: BodyGeometry, left: string, right: string, className?: string): string {
  const cx = (geometry.roof.x1 + geometry.roof.x2) / 2;
  const y = geometry.roof.y;
  return el('g', { class: className, opacity: className ? 0.45 : undefined }, [
    el('rect', { x: cx - 30, y: y - 7, width: 60, height: 7, rx: 2, fill: TRIM }),
    el('rect', { x: cx - 28, y: y - 15, width: 27, height: 9, rx: 3, fill: left }),
    el('rect', { x: cx + 1, y: y - 15, width: 27, height: 9, rx: 3, fill: right }),
  ]);
}

function pushBar(geometry: BodyGeometry): string {
  const { x, y } = geometry.front;
  return el('path', {
    d: `M${n(x - 4)} ${n(y - 26)}H${n(x + 11)}V${n(y + 16)}H${n(x - 4)}M${n(x + 11)} ${n(y - 5)}H${n(x - 4)}`,
    fill: 'none',
    stroke: TRIM,
    'stroke-width': 5,
    'stroke-linejoin': 'round',
  });
}

function mudFlaps(geometry: BodyGeometry): string {
  const { rear, front } = geometry.wheels;
  const flap = (wheel: WheelSpec): string => {
    const x = wheel.cx - wheel.archR - 2;
    return el('rect', {
      x: x - 3,
      y: geometry.sill - 6,
      width: 8,
      height: GROUND_Y - 10 - geometry.sill,
      rx: 2,
      fill: TRIM,
    });
  };
  return flap(rear) + flap(front);
}

function spotLamps(geometry: BodyGeometry): string {
  const { x, y } = geometry.front;
  return [x - 14, x - 34]
    .map((cx) =>
      el('circle', { cx, cy: y + 2, r: 7.5, fill: '#FFF4CF', stroke: TRIM, 'stroke-width': 3 }),
    )
    .join('');
}

/** Livery artwork, clipped to the body shell. */
function liveryArt(
  options: Required<Pick<CarOptions, 'id' | 'livery'>> & CarOptions,
  g: BodyGeometry,
  silhouette: boolean,
): {
  clipped: string;
  over: string;
} {
  const [b0, b1] = g.stripeBand;
  const accents = liveryAccents(options.paint ?? 'white');
  const d = g.door;
  const beacon = silhouette ? 'beacon' : undefined;
  switch (options.livery) {
    case 'race':
      return {
        clipped: [
          el('rect', { x: 0, y: b1 - 15, width: 800, height: 9, fill: accents.primary }),
          el('rect', { x: 0, y: b1 - 3, width: 800, height: 4, fill: accents.secondary }),
          el('path', {
            d: `M${n(d.cx + 150)} 120L${n(d.cx + 192)} 120L${n(d.cx + 92)} 380L${n(d.cx + 50)} 380Z`,
            fill: accents.primary,
          }),
        ].join(''),
        over: options.number ? roundel(d, options.number) : '',
      };
    case 'rally':
      return {
        clipped: [
          el('path', {
            d: `M0 ${n(b1 - 4)}L${n(d.cx - 70)} ${n(b1 - 4)}L${n(d.cx + 40)} ${n(b0 - 60)}L${n(d.cx + 70)} ${n(b0 - 60)}L${n(d.cx - 40)} ${n(b1 + 8)}L0 ${n(b1 + 8)}Z`,
            fill: accents.primary,
          }),
          el('rect', {
            x: d.cx + 90,
            y: 100,
            width: 14,
            height: 300,
            transform: `skewX(-24)`,
            fill: accents.secondary,
            opacity: 0.9,
          }),
        ].join(''),
        over: [
          options.number ? roundel(d, options.number) : '',
          spotLamps(g),
          mudFlaps(g),
          options.body === 'coupe'
            ? el('path', {
                d: `M${n(g.roof.x1 + 10)} ${n(g.roof.y - 12)}L${n(g.roof.x2 - 6)} ${n(g.roof.y - 8)}M${n(g.roof.x1 + 22)} ${n(g.roof.y - 12)}V${n(g.roof.y + 2)}M${n(g.roof.x2 - 20)} ${n(g.roof.y - 9)}V${n(g.roof.y + 4)}`,
                fill: 'none',
                stroke: TRIM,
                'stroke-width': 5,
                'stroke-linecap': 'round',
              })
            : el('path', {
                d: `M${n(g.roof.x1 + 40)} ${n(g.roof.y + 1)}L${n(g.roof.x1 + 52)} ${n(g.roof.y - 9)}H${n(g.roof.x1 + 92)}L${n(g.roof.x1 + 100)} ${n(g.roof.y + 1)}Z`,
                fill: TRIM,
              }),
        ].join(''),
      };
    case 'police':
      return {
        clipped: [
          el('rect', { x: d.cx - 118, y: 0, width: 236, height: 450, fill: '#F3F3F1' }),
          el('rect', { x: d.cx - 118, y: b0 + 6, width: 236, height: 7, fill: '#1F4FD1' }),
        ].join(''),
        over: lightbar(g, LIGHTBAR_RED, LIGHTBAR_BLUE, beacon) + pushBar(g),
      };
    case 'patrol':
      return {
        clipped: [
          el('rect', { x: 0, y: b0, width: 800, height: b1 - b0, fill: '#1F4FD1' }),
          el('rect', { x: 0, y: b1 + 3, width: 800, height: 4, fill: BRAND.red }),
        ].join(''),
        over: lightbar(g, LIGHTBAR_RED, LIGHTBAR_BLUE, beacon) + pushBar(g),
      };
    case 'fire': {
      let rungs = '';
      for (let x = 100; x <= 500; x += 25) rungs += `M${x} 132V144`;
      const ladder = `M84 134H516M84 142H516${rungs}M120 144V146M480 144V146`;
      return {
        clipped: [
          el('rect', { x: 0, y: b1 + 8, width: 800, height: 10, fill: '#FFD34D' }),
          el('rect', { x: 0, y: b1 + 20, width: 800, height: 3, fill: '#FFFFFF' }),
        ].join(''),
        over: [
          el('path', {
            d: ladder,
            fill: 'none',
            stroke: TRIM,
            'stroke-width': 5.5,
            'stroke-linecap': 'round',
          }),
          el('path', {
            d: ladder,
            fill: 'none',
            stroke: '#D7DBE0',
            'stroke-width': 2.8,
            'stroke-linecap': 'round',
          }),
          lightbar(g, LIGHTBAR_RED, LIGHTBAR_RED, beacon),
        ].join(''),
      };
    }
    case 'ambulance':
      return {
        clipped: [
          el('rect', { x: 0, y: b0, width: 800, height: b1 - b0, fill: BRAND.red }),
          el('rect', { x: 0, y: b1 + 3, width: 800, height: 4, fill: '#1F4FD1' }),
          el('path', {
            d: 'M163 200H177V210H187V224H177V234H163V224H153V210H163Z',
            fill: BRAND.red,
          }),
        ].join(''),
        over: lightbar(g, LIGHTBAR_RED, LIGHTBAR_BLUE, beacon),
      };
    case 'crash':
      return {
        clipped: [
          el('rect', { x: 0, y: b0, width: 800, height: 12, fill: BRAND.red }),
          el('rect', { x: 0, y: b0 + 14, width: 800, height: b1 - b0 - 14, fill: '#F4F4F2' }),
        ].join(''),
        over: [
          el('path', { d: 'M448 146L456 131L492 126L496 135L470 139L466 146Z', fill: TRIM }),
          el('path', { d: 'M492 126L512 122L513 128L494 133Z', fill: '#C9CED4' }),
          lightbar(g, LIGHTBAR_AMBER, LIGHTBAR_AMBER, beacon),
        ].join(''),
      };
    case 'flames':
      return {
        clipped: el('path', {
          d: 'M742 244C690 240 640 240 580 250C620 254 640 258 660 262C600 262 530 256 450 262C510 270 560 274 600 277C520 283 440 287 356 280C430 293 520 299 610 297C660 297 710 300 742 300Z',
          fill: `url(#${options.id}-flame)`,
        }),
        over: '',
      };
    default:
      return { clipped: '', over: '' };
  }
}

/** Body-specific extras drawn under / over the shell. */
function bodyExtras(id: string, body: CarBody, style: CarStyle): { under: string; over: string } {
  const chrome = `url(#${id}-chrome)`;
  switch (body) {
    case 'offroad':
      return {
        under: [
          el('rect', { x: 57, y: 196, width: 25, height: 76, rx: 9, fill: '#141414' }),
          el('rect', {
            x: 63,
            y: 222,
            width: 13,
            height: 24,
            rx: 3,
            fill: style === 'silhouette' ? '#2A2D31' : '#4A4F55',
          }),
        ].join(''),
        over: el('path', {
          d: 'M118 168L462 164M126 176L126 166M454 172L454 162',
          fill: 'none',
          stroke: TRIM,
          'stroke-width': 5,
          'stroke-linecap': 'round',
        }),
      };
    case 'prototype':
      return {
        under: '',
        over: el('path', {
          d: 'M36 230L148 226L150 238L38 242ZM40 218L58 216L62 288L44 290Z',
          fill: '#17191C',
        }),
      };
    case 'fantasy':
      return {
        under: '',
        over: [
          el('path', {
            d: 'M430 240C420 268 404 288 370 300M462 244C454 272 438 292 404 304M494 246C488 276 470 296 438 306M292 306L560 306',
            fill: 'none',
            stroke: chrome,
            'stroke-width': 8,
            'stroke-linecap': 'round',
          }),
          el('path', {
            d: 'M404 229V206Q404 198 412 198H532Q540 198 540 206V242Z',
            fill: chrome,
            stroke: TRIM,
            'stroke-width': 2,
          }),
          el('path', {
            d: 'M424 198V164Q424 156 432 156H512Q520 156 520 164V198Z',
            fill: chrome,
            stroke: TRIM,
            'stroke-width': 2,
          }),
          el('path', {
            d: 'M440 160V196M456 160V196M472 160V196M488 160V196M504 160V196',
            stroke: '#5A6068',
            'stroke-width': 1.5,
          }),
          el('path', {
            d: 'M434 156L441 124H503L510 156Z',
            fill: TRIM,
            stroke: '#5A6068',
            'stroke-width': 1.5,
          }),
          el('path', { d: 'M441 124H503', stroke: chrome, 'stroke-width': 3 }),
        ].join(''),
      };
    default:
      return { under: '', over: '' };
  }
}

export function renderCar(options: CarOptions): CarLayers {
  const style = options.style ?? 'product';
  const livery = options.livery ?? 'none';
  const { id, ramp } = options;
  const g = BODIES[options.body];
  const shell = shellPath(g);
  const [top, bottom] = g.paintRange;
  const silhouette = style === 'silhouette';
  const caliper = options.caliper === undefined ? BRAND.accent : options.caliper;
  const { rear, front } = g.wheels;

  const defs = [
    linearGradient(`${id}-paint`, { x1: 0, y1: top, x2: 0, y2: bottom }, [
      [0, ramp.light],
      [0.3, ramp.base],
      [0.54, ramp.base],
      [0.6, ramp.dark],
      [1, ramp.deep],
    ]),
    linearGradient(`${id}-sheen`, { x1: 60, y1: 0, x2: 760, y2: 0 }, [
      [0, '#FFFFFF', 0],
      [0.32, '#FFFFFF', silhouette ? 0.08 : 0.22],
      [0.46, '#FFFFFF', 0],
      [0.76, '#FFFFFF', silhouette ? 0.04 : 0.1],
      [1, '#FFFFFF', 0],
    ]),
    linearGradient(
      `${id}-glass`,
      { x1: 0, y1: top + 6, x2: 0, y2: top + 76 },
      silhouette
        ? [
            [0, '#23272D'],
            [1, '#08090A'],
          ]
        : [
            [0, '#3B4C5D'],
            [1, '#0A0E12'],
          ],
    ),
    linearGradient(
      `${id}-rim`,
      { x1: -36, y1: -36, x2: 36, y2: 36 },
      style === 'hero'
        ? [
            [0, '#8A9098'],
            [0.5, '#3A3F46'],
            [1, '#1C1F23'],
          ]
        : silhouette
          ? [
              [0, '#6A7079'],
              [1, '#2A2D31'],
            ]
          : [
              [0, '#F6F8FA'],
              [0.5, '#A9B0B8'],
              [1, '#5C636B'],
            ],
    ),
    radialGradient(`${id}-shadow`, { cx: 400, cy: GROUND_Y + 3, r: 340, squash: 0.05 }, [
      [0, '#000000', 0.55],
      [0.7, '#000000', 0.22],
      [1, '#000000', 0],
    ]),
    radialGradient(
      `${id}-glow`,
      { cx: g.headlightGlow.cx, cy: g.headlightGlow.cy, r: 80, squash: 0.4 },
      [
        [0, '#FFF8DC', 0.9],
        [0.35, '#FFE7A6', 0.35],
        [1, '#FFE7A6', 0],
      ],
    ),
    options.body === 'fantasy' || style === 'hero'
      ? linearGradient(`${id}-chrome`, { x1: 0, y1: 120, x2: 0, y2: 310 }, [
          [0, '#FFFFFF'],
          [0.45, '#B8BEC6'],
          [0.55, '#6B7178'],
          [1, '#E4E8EC'],
        ])
      : '',
    livery === 'flames'
      ? linearGradient(`${id}-flame`, { x1: 740, y1: 0, x2: 390, y2: 0 }, [
          [0, '#FFE14D'],
          [0.45, BRAND.accent],
          [1, BRAND.red],
        ])
      : '',
    silhouette
      ? linearGradient(`${id}-beam`, { x1: g.headlightGlow.cx - 8, y1: 0, x2: 800, y2: 0 }, [
          [0, '#FFE9B3', 0.75],
          [1, '#FFE9B3', 0],
        ])
      : '',
    el('clipPath', { id: `${id}-clip` }, el('path', { d: shell })),
    el('path', { id: `${id}-shell`, d: shell }),
    wheelDef(id, style, style === 'product' ? caliper : null),
  ].join('');

  const shadow = [
    el('ellipse', { cx: 400, cy: GROUND_Y + 3, rx: 340, ry: 17, fill: `url(#${id}-shadow)` }),
    ...[rear, front].map((wheel) =>
      el('ellipse', {
        cx: wheel.cx,
        cy: GROUND_Y + 1,
        rx: wheel.r * 1.05,
        ry: 5,
        fill: '#000000',
        opacity: 0.45,
      }),
    ),
  ].join('');

  const extras = bodyExtras(id, options.body, style);
  const wells = [wellPath(rear, g.sill), wellPath(front, g.sill)]
    .map((d) => el('path', { d, fill: '#0B0C0D' }))
    .join('');
  const paint = `url(#${id}-paint)`;
  const fullArt = liveryArt({ ...options, id, livery }, g, silhouette);
  // Silhouettes keep structural extras (ladder, light bar, rack) but drop colour bands.
  const art = silhouette ? { clipped: '', over: fullArt.over } : fullArt;
  const clip = `url(#${id}-clip)`;

  const characterStroke = options.accentLine
    ? el('path', { d: g.character, fill: 'none', stroke: options.accentLine, 'stroke-width': 3 })
    : el('path', {
        d: g.character,
        fill: 'none',
        stroke: '#FFFFFF',
        'stroke-opacity': silhouette ? 0.16 : 0.35,
        'stroke-width': 2.5,
      });

  const stripes = options.sideStripes
    ? [
        el('rect', {
          x: 0,
          y: g.stripeBand[0] + 2,
          width: 800,
          height: 7,
          fill: options.sideStripes,
        }),
        el('rect', {
          x: 0,
          y: g.stripeBand[0] + 13,
          width: 800,
          height: 3,
          fill: options.sideStripes,
        }),
      ].join('')
    : '';

  const body = [
    el('use', { href: `#${id}-shell`, fill: paint }),
    el('use', { href: `#${id}-shell`, fill: `url(#${id}-sheen)` }),
    g.bodyParts
      ? el('path', {
          d: g.bodyParts,
          fill: paint,
          stroke: INK,
          'stroke-opacity': 0.5,
          'stroke-width': 1.5,
        })
      : '',
    el('g', { 'clip-path': clip }, [art.clipped, stripes, characterStroke].join('')),
    el('path', {
      d: g.glass,
      fill: `url(#${id}-glass)`,
      stroke: INK,
      'stroke-opacity': 0.6,
      'stroke-width': 1.5,
    }),
    el('path', { d: g.glint, fill: '#FFFFFF', opacity: silhouette ? 0.07 : 0.16 }),
    g.pillars ? el('path', { d: g.pillars, stroke: '#0E1013', 'stroke-width': 7 }) : '',
    el('path', { d: g.trim, fill: TRIM }),
    el('path', {
      d: g.lines,
      fill: 'none',
      stroke: INK,
      'stroke-opacity': 0.55,
      'stroke-width': 2,
      'stroke-linecap': 'round',
    }),
    g.flares
      ? el('path', {
          d: flarePath(rear, g.sill) + flarePath(front, g.sill),
          fill: 'none',
          stroke: '#1A1C1F',
          'stroke-width': 10,
        })
      : '',
    el('path', {
      d: g.taillight,
      fill: silhouette ? '#7A0F0B' : '#E5261F',
      class: silhouette ? 'taillight' : undefined,
      stroke: INK,
      'stroke-opacity': 0.5,
    }),
    extras.over,
    art.over,
    el('path', {
      d: g.top,
      fill: 'none',
      stroke: '#FFFFFF',
      'stroke-opacity': silhouette ? 0.4 : 0.55,
      'stroke-width': 2,
      'stroke-linejoin': 'round',
    }),
    el('use', {
      href: `#${id}-shell`,
      fill: 'none',
      stroke: INK,
      'stroke-opacity': 0.55,
      'stroke-width': 1.6,
    }),
  ].join('');

  const headlamp = el('path', {
    d: g.headlight,
    fill: '#FFF6DA',
    stroke: INK,
    'stroke-opacity': 0.6,
    'stroke-width': 1.5,
  });
  const { cx, cy } = g.headlightGlow;
  const glow = [
    silhouette
      ? el('path', {
          d: `M${n(cx - 8)} ${n(cy - 6)}L800 ${n(cy - 48)}V${n(cy + 46)}L${n(cx - 8)} ${n(cy + 8)}Z`,
          fill: `url(#${id}-beam)`,
        })
      : '',
    el('ellipse', { cx, cy, rx: 80, ry: 32, fill: `url(#${id}-glow)` }),
  ].join('');

  return {
    defs,
    shadow,
    underlay: extras.under,
    wells,
    wheelRear: placeWheel(id, rear),
    wheelFront: placeWheel(id, front),
    body,
    headlamp,
    glow,
    geometry: g,
  };
}

/** All layers stacked in paint order (product placeholders). */
export function stackCar(layers: CarLayers): { defs: string; content: string } {
  return {
    defs: layers.defs,
    content: [
      layers.shadow,
      layers.underlay,
      layers.wells,
      layers.wheelRear,
      layers.wheelFront,
      layers.body,
      layers.headlamp,
      layers.glow,
    ].join(''),
  };
}
