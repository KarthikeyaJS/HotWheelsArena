import { memo, useId, type CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/**
 * The hero car: a static inline React SVG adapted from `public/placeholders/hero-car.svg`
 * (inline rather than an `<img>` so it can follow the theme tokens). Nothing in it animates.
 *
 * Colours are derived from the theme tokens (`--metal`, `--on-accent` as a constant ink,
 * `--accent`, `--accent-2`) with `color-mix()`, so the car reads as brushed silver in both the
 * night garage and the bright showroom. The only literal colour is `white`, used for emitted
 * light (headlights) and specular sheen, which are physically white in either theme.
 */

const INK = 'rgb(var(--on-accent))';
const METAL = 'rgb(var(--metal))';
const ACCENT = 'rgb(var(--accent))';
const LIGHT = 'white';
/** Metal mixed towards ink: `shade(72)` = 72% metal. */
const shade = (metalPercent: number): string =>
  `color-mix(in srgb, ${METAL} ${metalPercent}%, ${INK})`;
const SPECULAR = `color-mix(in srgb, ${METAL} 45%, ${LIGHT})`;

/** SVG user-space viewport (the car is drawn in the source file's inner coordinates). */
export const HERO_CAR_VIEWBOX = { x: 40, y: 170, width: 800, height: 270 } as const;
/** Floor line — the showroom reflection mirrors around it. */
const FLOOR_Y = 362;

const stop = (color: string, opacity = 1): CSSProperties => ({
  stopColor: color,
  stopOpacity: opacity,
});

const SHELL_PATH =
  'M72 328L68 276Q68 256 90 252L178 246C240 240 300 230 346 212C382 198 430 194 470 196C506 198 530 206 556 222L660 268C696 276 722 282 732 292Q738 300 736 310L734 320Q732 328 722 328L648.3 328A61 61 0 1 0 531.7 328L268.3 328A61 61 0 1 0 151.7 328Z';
const OUTLINE_PATH =
  'M72 328L68 276Q68 256 90 252L178 246C240 240 300 230 346 212C382 198 430 194 470 196C506 198 530 206 556 222L660 268C696 276 722 282 732 292Q738 300 736 310L734 320Q732 328 722 328';
const SPOKES_PATH =
  'M0 0L0 -33M0 0L19.4 -26.7M0 0L31.4 -10.2M0 0L31.4 10.2M0 0L19.4 26.7M0 0L0 33M0 0L-19.4 26.7M0 0L-31.4 10.2M0 0L-31.4 -10.2M0 0L-19.4 -26.7';

export interface HeroCarProps {
  className?: string;
  /** Mirrored floor reflection (showroom gloss). Default true. */
  reflection?: boolean;
}

/**
 * Decorative (aria-hidden); the hero headline carries the meaning. Memoized: it never re-renders.
 * Sized by its container's width (the viewBox fixes the aspect ratio, 800:270).
 */
export const HeroCar = memo(function HeroCar({ className, reflection = true }: HeroCarProps) {
  const uid = useId().replace(/:/g, '');
  const ids = {
    paint: `hc-paint-${uid}`,
    sheen: `hc-sheen-${uid}`,
    glass: `hc-glass-${uid}`,
    rim: `hc-rim-${uid}`,
    shadow: `hc-shadow-${uid}`,
    glow: `hc-glow-${uid}`,
    beam: `hc-beam-${uid}`,
    clip: `hc-clip-${uid}`,
    wheel: `hc-wheel-${uid}`,
    floor: `hc-floor-${uid}`,
    car: `hc-car-${uid}`,
    reflectionFade: `hc-refl-fade-${uid}`,
    reflectionMask: `hc-refl-mask-${uid}`,
  };
  const { x, y, width, height } = HERO_CAR_VIEWBOX;

  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      className={cn('block overflow-visible', className)}
    >
      <defs>
        <linearGradient
          id={ids.paint}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="194"
          x2="0"
          y2="330"
        >
          <stop offset="0" style={stop(SPECULAR)} />
          <stop offset="0.3" style={stop(METAL)} />
          <stop offset="0.5" style={stop(METAL)} />
          <stop offset="0.6" style={stop(shade(34))} />
          <stop offset="1" style={stop(shade(8))} />
        </linearGradient>
        <linearGradient
          id={ids.sheen}
          gradientUnits="userSpaceOnUse"
          x1="60"
          y1="0"
          x2="760"
          y2="0"
        >
          <stop offset="0" style={stop(LIGHT, 0)} />
          <stop offset="0.3" style={stop(LIGHT, 0.2)} />
          <stop offset="0.5" style={stop(LIGHT, 0)} />
          <stop offset="0.8" style={stop(LIGHT, 0.1)} />
          <stop offset="1" style={stop(LIGHT, 0)} />
        </linearGradient>
        <linearGradient
          id={ids.glass}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="200"
          x2="0"
          y2="270"
        >
          <stop offset="0" style={stop(shade(32))} />
          <stop offset="1" style={stop(shade(4))} />
        </linearGradient>
        <linearGradient
          id={ids.rim}
          gradientUnits="userSpaceOnUse"
          x1="-36"
          y1="-36"
          x2="36"
          y2="36"
        >
          <stop offset="0" style={stop(shade(74))} />
          <stop offset="0.5" style={stop(shade(28))} />
          <stop offset="1" style={stop(shade(14))} />
        </linearGradient>
        <radialGradient
          id={ids.shadow}
          gradientUnits="userSpaceOnUse"
          cx="400"
          cy="365"
          r="340"
          gradientTransform="translate(400 365) scale(1 0.05) translate(-400 -365)"
        >
          <stop offset="0" style={stop(INK, 0.6)} />
          <stop offset="0.7" style={stop(INK, 0.2)} />
          <stop offset="1" style={stop(INK, 0)} />
        </radialGradient>
        <radialGradient
          id={ids.glow}
          gradientUnits="userSpaceOnUse"
          cx="736"
          cy="292"
          r="80"
          gradientTransform="translate(736 292) scale(1 0.4) translate(-736 -292)"
        >
          <stop offset="0" style={stop(LIGHT, 0.95)} />
          <stop offset="0.35" style={stop(LIGHT, 0.45)} />
          <stop offset="0.65" style={stop(ACCENT, 0.16)} />
          <stop offset="1" style={stop(ACCENT, 0)} />
        </radialGradient>
        <linearGradient
          id={ids.beam}
          gradientUnits="userSpaceOnUse"
          x1="728"
          y1="0"
          x2="846"
          y2="0"
        >
          <stop offset="0" style={stop(LIGHT, 0.7)} />
          <stop offset="0.55" style={stop(LIGHT, 0.18)} />
          <stop offset="1" style={stop(LIGHT, 0)} />
        </linearGradient>
        <linearGradient
          id={ids.reflectionFade}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={FLOOR_Y}
          x2="0"
          y2={FLOOR_Y + 78}
        >
          <stop offset="0" style={stop(LIGHT, 1)} />
          <stop offset="1" style={stop(LIGHT, 0)} />
        </linearGradient>
        <mask
          id={ids.reflectionMask}
          maskUnits="userSpaceOnUse"
          x={x}
          y={FLOOR_Y}
          width={width}
          height={80}
        >
          <rect x={x} y={FLOOR_Y} width={width} height={80} fill={`url(#${ids.reflectionFade})`} />
        </mask>
        <linearGradient
          id={ids.floor}
          gradientUnits="userSpaceOnUse"
          x1={x}
          y1="0"
          x2={x + width}
          y2="0"
        >
          <stop offset="0" style={stop(METAL, 0)} />
          <stop offset="0.5" style={stop(METAL, 0.45)} />
          <stop offset="1" style={stop(METAL, 0)} />
        </linearGradient>
        <clipPath id={ids.clip}>
          <path d={SHELL_PATH} />
        </clipPath>
        <g id={ids.wheel}>
          <circle r="50" style={{ fill: INK }} />
          <circle r="46" fill="none" strokeWidth="2.5" style={{ stroke: shade(16) }} />
          <circle r="37" style={{ fill: shade(6) }} />
          <circle r="27" fill="none" strokeWidth="9" style={{ stroke: shade(74) }} />
          <circle
            r="27"
            fill="none"
            strokeWidth="1"
            strokeDasharray="2 5"
            style={{ stroke: shade(46) }}
          />
          <path
            d={SPOKES_PATH}
            stroke={`url(#${ids.rim})`}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle r="36" fill="none" stroke={`url(#${ids.rim})`} strokeWidth="3.5" />
          <circle r="37.8" fill="none" strokeWidth="1.4" className="stroke-accent" />
          <circle r="9" fill={`url(#${ids.rim})`} />
          <circle r="3.5" className="fill-accent" />
        </g>
      </defs>

      {/* Showroom floor line, fading out at both ends. */}
      <rect x={x} y={FLOOR_Y} width={width} height="1.2" fill={`url(#${ids.floor})`} />

      {/* Contact shadow — soft in the showroom, deep in the garage. */}
      <g data-car="shadow">
        <ellipse cx="400" cy="365" rx="340" ry="17" fill={`url(#${ids.shadow})`} />
        <ellipse cx="210" cy="363" rx="54.6" ry="5" style={{ fill: INK }} opacity="0.5" />
        <ellipse cx="590" cy="363" rx="54.6" ry="5" style={{ fill: INK }} opacity="0.5" />
      </g>

      {reflection ? (
        <g mask={`url(#${ids.reflectionMask})`} data-car="reflection">
          <use
            href={`#${ids.car}`}
            transform={`translate(0 ${FLOOR_Y * 2}) scale(1 -1)`}
            className="opacity-20 dark:opacity-[0.09]"
          />
        </g>
      ) : null}

      <g id={ids.car}>
        <g data-car="chassis">
          <path d="M268.3 328A61 61 0 1 0 151.7 328Z" style={{ fill: INK }} />
          <path d="M648.3 328A61 61 0 1 0 531.7 328Z" style={{ fill: INK }} />
        </g>

        <g data-car="wheel-rear">
          <use href={`#${ids.wheel}`} transform="translate(210 310) scale(1.04)" />
        </g>
        <g data-car="wheel-front">
          <use href={`#${ids.wheel}`} transform="translate(590 310) scale(1.04)" />
        </g>
        <g data-car="body">
          <path d={SHELL_PATH} fill={`url(#${ids.paint})`} />
          <path d={SHELL_PATH} fill={`url(#${ids.sheen})`} />
          <path
            d="M572 240Q584 230 602 234L600 244Q584 248 574 246Z"
            fill={`url(#${ids.paint})`}
            strokeOpacity="0.5"
            strokeWidth="1.5"
            style={{ stroke: INK }}
          />
          <g clipPath={`url(#${ids.clip})`}>
            <rect x="0" y="264" width="800" height="7" className="fill-accent" />
            <rect x="0" y="275" width="800" height="3" className="fill-accent" />
            <path
              d="M100 272C230 264 440 262 706 288"
              fill="none"
              strokeOpacity="0.4"
              strokeWidth="2.5"
              style={{ stroke: LIGHT }}
            />
          </g>
          <path
            d="M362 216C394 204 432 200 468 202C500 204 522 212 544 226L592 252L384 250C368 248 356 236 362 216Z"
            fill={`url(#${ids.glass})`}
            strokeOpacity="0.6"
            strokeWidth="1.5"
            style={{ stroke: INK }}
          />
          <path d="M452 204L478 206L436 249L410 249Z" opacity="0.2" style={{ fill: LIGHT }} />
          <path
            d="M304 262C334 254 368 252 400 256L394 282C364 281 336 285 307 292ZM272 314L530 314L527 328L275 328ZM692 322L736 316L740 326L694 330ZM78 314L150 316L150 328L80 328Z"
            style={{ fill: shade(10) }}
          />
          <path
            d="M418 254L410 314M430 268L456 266"
            fill="none"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ stroke: INK }}
          />
          {/* Tail light */}
          <path
            d="M69 262L96 256L97 266L70 272Z"
            strokeOpacity="0.5"
            className="fill-accent-2"
            style={{ stroke: INK }}
          />
          <path
            d={OUTLINE_PATH}
            fill="none"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ stroke: LIGHT }}
          />
          <path
            d={SHELL_PATH}
            fill="none"
            strokeOpacity="0.6"
            strokeWidth="1.6"
            style={{ stroke: INK }}
          />
          {/* Rear wing */}
          <path
            d="M86 238L182 232L184 241L88 247Z"
            strokeOpacity="0.4"
            strokeWidth="1"
            style={{ fill: shade(10), stroke: LIGHT }}
          />
          <path
            d="M132 244L138 254M160 242L166 252"
            strokeWidth="4"
            style={{ stroke: shade(10) }}
          />
          <path
            d="M212 252L232 244M226 254L246 246M240 256L260 248M254 258L274 250"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ stroke: shade(6) }}
          />
          <path d="M494 207L506 208L468 249L456 249Z" opacity="0.1" style={{ fill: LIGHT }} />
          <circle
            cx="330"
            cy="244"
            r="5"
            fill="none"
            strokeOpacity="0.6"
            strokeWidth="1.5"
            style={{ stroke: shade(6) }}
          />
          <path d="M650 288L676 286L672 300L648 302Z" style={{ fill: shade(6) }} />
        </g>
      </g>

      {/* Headlights: a static beam and glow (no animation). */}
      <g data-car="headlights">
        <path
          data-car="beam"
          d="M728 286L846 246V344L728 298Z"
          fill={`url(#${ids.beam})`}
          opacity="0.55"
        />
        <ellipse
          data-car="glow"
          cx="736"
          cy="292"
          rx="80"
          ry="32"
          fill={`url(#${ids.glow})`}
          opacity="0.7"
        />
        <path
          d="M706 280L733 289L731 297L703 289Z"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          style={{ fill: LIGHT, stroke: INK }}
        />
      </g>
    </svg>
  );
});
