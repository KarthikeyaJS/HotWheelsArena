/**
 * Pure geometry for the hero sequence: how far the car must travel to leave the stage and how
 * many degrees its wheels turn over that distance (rolling without slipping).
 */
import {
  HERO_CAR_BODY_LEFT,
  HERO_CAR_VIEWBOX,
  HERO_CAR_WHEEL_RADIUS,
  HERO_CAR_WHEEL_SCALE as WHEEL_SCALE,
} from './heroCarGeometry';

/** Extra px past the right edge so the tail light fully clears the stage. */
const EXIT_MARGIN = 48;

export interface CarBox {
  /** Left of the car SVG's layout box, relative to the stage (px, transforms excluded). */
  left: number;
  width: number;
  height: number;
  /** Stage (viewport-wide) width in px. */
  stageWidth: number;
}

export interface CarMotion {
  /** px per SVG user unit (`preserveAspectRatio="xMidYMax meet"`). */
  scale: number;
  /** Stage x of the car's rear bumper at rest. */
  carLeft: number;
  /** translateX (px) that takes the whole car past the right edge. */
  travel: number;
  /** Wheel rotation (deg) that matches `travel`. */
  wheelDegrees: number;
}

export function computeCarMotion({ left, width, height, stageWidth }: CarBox): CarMotion {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const scale = Math.min(safeWidth / HERO_CAR_VIEWBOX.width, safeHeight / HERO_CAR_VIEWBOX.height);
  const renderedWidth = HERO_CAR_VIEWBOX.width * scale;
  const offsetX = (safeWidth - renderedWidth) / 2;
  const carLeft = left + offsetX + (HERO_CAR_BODY_LEFT - HERO_CAR_VIEWBOX.x) * scale;
  const travel = Math.max(0, Math.max(stageWidth, safeWidth) - carLeft + EXIT_MARGIN);
  const radiusPx = HERO_CAR_WHEEL_RADIUS * WHEEL_SCALE * scale;
  const wheelDegrees = radiusPx > 0 ? (travel / radiusPx) * (180 / Math.PI) : 0;
  return { scale, carLeft, travel, wheelDegrees };
}
