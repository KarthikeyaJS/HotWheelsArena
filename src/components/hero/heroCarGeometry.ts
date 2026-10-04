/**
 * Geometry of the inline hero car SVG (`HeroCar`), in SVG user units. Shared by the component
 * and the scroll sequence (`carMotion`, `useHeroScrollSequence`).
 */

/** SVG user-space viewport (car drawn in the source file's inner coordinates). */
export const HERO_CAR_VIEWBOX = { x: 40, y: 170, width: 800, height: 270 } as const;
/** Rear-bumper x — the car's left edge. */
export const HERO_CAR_BODY_LEFT = 66;
/** Tyre radius — used to spin the wheels in proportion to the distance travelled. */
export const HERO_CAR_WHEEL_RADIUS = 52;
/** The wheel `<use>` is drawn at this multiple of the base tyre radius. */
export const HERO_CAR_WHEEL_SCALE = 1.04;
/** Wheel hub centres — rotation origins. */
export const HERO_CAR_WHEELS = {
  rear: { x: 210, y: 310 },
  front: { x: 590, y: 310 },
} as const;
/** Headlight lens centre — flare/glow origin. */
export const HERO_CAR_HEADLIGHT = { x: 733, y: 291 } as const;
/** Floor line — the reflection mirrors around it. */
export const HERO_CAR_FLOOR_Y = 362;

/** `"x y"` string for GSAP's `svgOrigin`. */
export const svgPoint = (point: { x: number; y: number }): string => `${point.x} ${point.y}`;
