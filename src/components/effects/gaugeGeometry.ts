/**
 * Pure SVG geometry for the dial gauges (Speedometer / Tachometer). Angles are in degrees,
 * measured clockwise from 12 o'clock; the dial sweeps from `GAUGE_START` to `GAUGE_END`.
 */

export const GAUGE_VIEWBOX = 200;
export const GAUGE_CENTER = GAUGE_VIEWBOX / 2;
export const GAUGE_START = -125;
export const GAUGE_END = 125;

export interface Point {
  x: number;
  y: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export function polarToCartesian(radius: number, angle: number, center = GAUGE_CENTER): Point {
  const radians = (angle * Math.PI) / 180;
  return {
    x: round(center + radius * Math.sin(radians)),
    y: round(center - radius * Math.cos(radians)),
  };
}

/** Clockwise arc path between two angles. */
export function describeArc(radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(radius, startAngle);
  const end = polarToCartesian(radius, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Dial angle for `value` in [min, max] (clamped). */
export function valueToAngle(value: number, min: number, max: number): number {
  if (max <= min) return GAUGE_START;
  const ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return GAUGE_START + ratio * (GAUGE_END - GAUGE_START);
}

export interface GaugeTick {
  value: number;
  angle: number;
  major: boolean;
}

/** Major ticks every `majorStep`, with `minorPerMajor - 1` minor ticks between them. */
export function gaugeTicks(
  min: number,
  max: number,
  majorStep: number,
  minorPerMajor = 4,
): GaugeTick[] {
  if (majorStep <= 0 || max <= min) return [];
  const minorStep = majorStep / Math.max(1, minorPerMajor);
  const ticks: GaugeTick[] = [];
  const count = Math.round((max - min) / minorStep);
  for (let index = 0; index <= count; index += 1) {
    const value = min + index * minorStep;
    ticks.push({
      value,
      angle: valueToAngle(value, min, max),
      major: index % Math.max(1, minorPerMajor) === 0,
    });
  }
  return ticks;
}
