/**
 * Pure geometry for the page scroll-track: a serpentine Hot Wheels track sampled as points,
 * smoothed into an SVG path (Catmull-Rom → cubic Bézier), plus the scroll ↔ track mappings used
 * to place the station markers and pick the active station.
 */

export interface TrackPoint {
  x: number;
  y: number;
}

/** Rail width in CSS px (the SVG uses a 1:1 viewBox). */
export const TRACK_WIDTH = 48;
/** Scroll-track is shown from this width (the page gutter can hold the rail). */
export const SCROLL_TRACK_MIN_WIDTH = 1360;
export const SCROLL_TRACK_QUERY = `(min-width: ${SCROLL_TRACK_MIN_WIDTH}px)`;

export interface TrackShapeOptions {
  /** Distance between samples (px). */
  step?: number;
  /** Length of one full S-bend (px). */
  period?: number;
  /** Keep the track this far from the rail edges (px). */
  margin?: number;
  /** Straight run-in / run-out at both ends (px). */
  easeLength?: number;
}

const round = (value: number): number => Math.round(value * 100) / 100;

export const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Serpentine centre-line from (width/2, 0) to (width/2, height), straight at both ends. */
export function sampleTrackPoints(
  width: number,
  height: number,
  { step = 8, period = 240, margin = 10, easeLength = 56 }: TrackShapeOptions = {},
): TrackPoint[] {
  const safeHeight = Math.max(0, height);
  const cx = width / 2;
  const amplitude = Math.max(0, width / 2 - margin);
  const count = Math.max(1, Math.ceil(safeHeight / Math.max(1, step)));
  const points: TrackPoint[] = [];
  for (let index = 0; index <= count; index += 1) {
    const y = Math.min(safeHeight, index * step);
    const envelope =
      easeLength > 0 ? Math.min(1, y / easeLength, (safeHeight - y) / easeLength) : 1;
    const eased = Math.sin((Math.max(0, envelope) * Math.PI) / 2);
    points.push({
      x: round(cx + amplitude * eased * Math.sin((2 * Math.PI * y) / period)),
      y: round(y),
    });
  }
  return points;
}

/** Smooth SVG path through the points (uniform Catmull-Rom as cubic Béziers). */
export function toSmoothPath(points: readonly TrackPoint[]): string {
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M${first.x} ${first.y}`;
  const commands = [`M${first.x} ${first.y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index] ?? first;
    const p0 = points[index - 1] ?? p1;
    const p2 = points[index + 1] ?? p1;
    const p3 = points[index + 2] ?? p2;
    const c1 = { x: round(p1.x + (p2.x - p0.x) / 6), y: round(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: round(p2.x - (p3.x - p1.x) / 6), y: round(p2.y - (p3.y - p1.y) / 6) };
    commands.push(`C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`);
  }
  return commands.join(' ');
}

/** Point at `fraction` (0–1) of the polyline's arc length — where a station marker sits. */
export function pointAtFraction(points: readonly TrackPoint[], fraction: number): TrackPoint {
  const first = points[0];
  if (!first) return { x: 0, y: 0 };
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1] ?? first;
    const b = points[index] ?? a;
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  if (total === 0) return { ...first };
  const target = clamp01(fraction) * total;
  for (let index = 1; index < points.length; index += 1) {
    const end = lengths[index] ?? total;
    if (end >= target) {
      const start = lengths[index - 1] ?? 0;
      const a = points[index - 1] ?? first;
      const b = points[index] ?? a;
      const t = end > start ? (target - start) / (end - start) : 0;
      return { x: round(a.x + (b.x - a.x) * t), y: round(a.y + (b.y - a.y) * t) };
    }
  }
  const last = points[points.length - 1] ?? first;
  return { ...last };
}

/**
 * Page-scroll fraction at which a section reaches the top of the viewport (below the sticky
 * header's scroll padding). The car rides the track in step with page scroll, so this is also
 * the section's station position on the track.
 */
export function sectionScrollFraction(
  sectionDocumentTop: number,
  scrollPaddingTop: number,
  maxScroll: number,
): number {
  if (maxScroll <= 0) return 0;
  return clamp01((sectionDocumentTop - scrollPaddingTop) / maxScroll);
}

/**
 * Active station: the last section whose top has passed `threshold` (px from the viewport top);
 * the first one before that; the last existing one once the page is scrolled to the bottom.
 * `tops` are viewport-relative (`getBoundingClientRect().top`); missing sections are `Infinity`.
 */
export function pickActiveIndex(
  tops: readonly number[],
  threshold: number,
  atBottom: boolean,
): number {
  if (tops.length === 0) return 0;
  if (atBottom) {
    for (let index = tops.length - 1; index >= 0; index -= 1) {
      if (Number.isFinite(tops[index])) return index;
    }
  }
  let active = 0;
  tops.forEach((top, index) => {
    if (Number.isFinite(top) && top <= threshold) active = index;
  });
  return active;
}
