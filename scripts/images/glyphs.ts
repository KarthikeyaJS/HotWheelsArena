/**
 * A tiny geometric "racing HUD" stroke font, used for every piece of text in the generated art
 * (social card, favicon monogram, race numbers). Text is emitted as stroked paths, so the images
 * render identically everywhere — no font files, no system-font fallbacks.
 *
 * Glyphs live on a grid 6 units tall; `w` is the glyph width in units. Paths use absolute
 * M/L/H/V/Z commands in glyph units only.
 */
import { n } from './svg.ts';

interface Glyph {
  w: number;
  d: string;
}

const O = 'M1.2 0H2.8L4 1.2V4.8L2.8 6H1.2L0 4.8V1.2Z';

const GLYPHS: Readonly<Record<string, Glyph>> = {
  A: { w: 4, d: 'M0 6V1.4L1.4 0H2.6L4 1.4V6M0 3.7H4' },
  B: { w: 4, d: 'M0 0H2.8L4 1.2V1.9L2.9 3L4 4.1V4.8L2.8 6H0ZM0 3H2.9' },
  C: { w: 4, d: 'M4 0H1.2L0 1.2V4.8L1.2 6H4' },
  D: { w: 4, d: 'M0 0H2.8L4 1.2V4.8L2.8 6H0Z' },
  E: { w: 4, d: 'M4 0H0V6H4M0 3H3.2' },
  F: { w: 4, d: 'M4 0H0V6M0 3H3.2' },
  G: { w: 4, d: 'M4 0H1.2L0 1.2V4.8L1.2 6H4V3.4H2.2' },
  H: { w: 4, d: 'M0 0V6M4 0V6M0 3H4' },
  I: { w: 0, d: 'M0 0V6' },
  J: { w: 4, d: 'M4 0V4.8L2.8 6H1.2L0 4.8' },
  K: { w: 4, d: 'M0 0V6M0 3H1.6M4 0L1.6 3L4 6' },
  L: { w: 4, d: 'M0 0V6H4' },
  M: { w: 5, d: 'M0 6V0L2.5 3L5 0V6' },
  N: { w: 4, d: 'M0 6V0L4 6V0' },
  O: { w: 4, d: O },
  P: { w: 4, d: 'M0 6V0H2.8L4 1.2V2.2L2.8 3.4H0' },
  Q: { w: 4, d: `${O}M2.3 4.3L4 6` },
  R: { w: 4, d: 'M0 6V0H2.8L4 1.2V2.2L2.8 3.4H0M2.2 3.4L4 6' },
  S: { w: 4, d: 'M4 0H1.2L0 1.2V1.8L1.2 3H2.8L4 4.2V4.8L2.8 6H0' },
  T: { w: 4, d: 'M0 0H4M2 0V6' },
  U: { w: 4, d: 'M0 0V4.8L1.2 6H2.8L4 4.8V0' },
  V: { w: 4, d: 'M0 0L2 6L4 0' },
  W: { w: 5, d: 'M0 0V6L2.5 3.6L5 6V0' },
  X: { w: 4, d: 'M0 0L4 6M4 0L0 6' },
  Y: { w: 4, d: 'M0 0L2 3L4 0M2 3V6' },
  Z: { w: 4, d: 'M0 0H4L0 6H4' },
  '0': { w: 4, d: O },
  '1': { w: 1.4, d: 'M0 1.2L1.4 0V6' },
  '2': { w: 4, d: 'M0 1.2L1.2 0H2.8L4 1.2V2.2L0 6H4' },
  '3': { w: 4, d: 'M0 0H2.8L4 1.2V1.8L2.8 3H1.4M2.8 3L4 4.2V4.8L2.8 6H0' },
  '4': { w: 4, d: 'M3 6V0L0 4H4' },
  '5': { w: 4, d: 'M4 0H0V2.8H2.8L4 4V4.8L2.8 6H0' },
  '6': { w: 4, d: 'M3.8 0H1.2L0 1.2V4.8L1.2 6H2.8L4 4.8V4L2.8 2.8H0' },
  '7': { w: 4, d: 'M0 0H4L1.5 6' },
  '8': {
    w: 4,
    d: 'M1.2 0H2.8L4 1.2V1.8L2.8 3H1.2L0 4.2V4.8L1.2 6H2.8L4 4.8V4.2L2.8 3H1.2L0 1.8V1.2Z',
  },
  '9': { w: 4, d: 'M0.2 6H2.8L4 4.8V1.2L2.8 0H1.2L0 1.2V2L1.2 3.2H4' },
  ':': { w: 0, d: 'M0 1.5V2.1M0 4.5V5.1' },
  '·': { w: 0, d: 'M0 2.7V3.3' },
  '.': { w: 0, d: 'M0 5.4V6' },
  ',': { w: 0.6, d: 'M0.6 5.4L0 7' },
  "'": { w: 0, d: 'M0 0V1.6' },
  '’': { w: 0, d: 'M0 0V1.6' },
  '-': { w: 3, d: 'M0 3H3' },
  '/': { w: 3, d: 'M3 0L0 6' },
  '!': { w: 0, d: 'M0 0V4M0 5.4V6' },
  '+': { w: 4, d: 'M0 3H4M2 1V5' },
  '#': { w: 4, d: 'M1.3 0.4L0.8 5.6M3.2 0.4L2.7 5.6M0 2H4M0 4H4' },
};

const SPACE_UNITS = 2.6;

export interface TextOptions {
  /** Left edge in px. */
  x: number;
  /** Baseline (bottom of capitals) in px. */
  y: number;
  /** Cap height in px. */
  size: number;
  /** Extra gap between glyphs, in units (default 1.9). */
  tracking?: number;
  /** Italic slant in degrees (positive leans right). */
  slant?: number;
  /** `start` (default), `middle` or `end` alignment around `x`. */
  anchor?: 'start' | 'middle' | 'end';
}

export interface TextRun {
  /** Path data for stroking (`fill="none"`, round/miter joins at your choice). */
  d: string;
  /** Rendered width in px (without slant overhang). */
  width: number;
  /** Characters that had no glyph (rendered as spaces). */
  missing: string[];
}

const COMMAND = /([MLHVZ])([^MLHVZ]*)/g;

/** Measures a string in glyph units. */
function measure(text: string, tracking: number): number {
  let width = 0;
  const chars = [...text.toUpperCase()];
  chars.forEach((char, index) => {
    const glyph = GLYPHS[char];
    width += glyph ? glyph.w : SPACE_UNITS;
    if (index < chars.length - 1) width += tracking;
  });
  return width;
}

/** Lays out `text` as stroke path data. */
export function textRun(text: string, options: TextOptions): TextRun {
  const tracking = options.tracking ?? 1.9;
  const unit = options.size / 6;
  const slant = Math.tan(((options.slant ?? 0) * Math.PI) / 180);
  const totalUnits = measure(text, tracking);
  const width = totalUnits * unit;
  const startX =
    options.anchor === 'middle'
      ? options.x - width / 2
      : options.anchor === 'end'
        ? options.x - width
        : options.x;
  const top = options.y - options.size;
  const missing: string[] = [];
  const parts: string[] = [];
  let cursor = 0;

  const chars = [...text.toUpperCase()];
  chars.forEach((char, index) => {
    const glyph = GLYPHS[char];
    if (!glyph) {
      if (char !== ' ') missing.push(char);
      cursor += SPACE_UNITS + (index < chars.length - 1 ? tracking : 0);
      return;
    }
    let penX = 0;
    let penY = 0;
    const point = (gx: number, gy: number): string => {
      penX = gx;
      penY = gy;
      const py = top + gy * unit;
      const px = startX + (cursor + gx) * unit + (options.y - py) * slant;
      return `${n(px)} ${n(py)}`;
    };
    for (const match of glyph.d.matchAll(COMMAND)) {
      const command = match[1] ?? '';
      const nums = (match[2] ?? '')
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (command === 'Z') parts.push('Z');
      else if (command === 'H') for (const value of nums) parts.push(`L${point(value, penY)}`);
      else if (command === 'V') for (const value of nums) parts.push(`L${point(penX, value)}`);
      else {
        for (let i = 0; i + 1 < nums.length; i += 2) {
          const gx = nums[i] ?? 0;
          const gy = nums[i + 1] ?? 0;
          parts.push(`${command === 'M' && i === 0 ? 'M' : 'L'}${point(gx, gy)}`);
        }
      }
    }
    cursor += glyph.w + (index < chars.length - 1 ? tracking : 0);
  });

  return { d: parts.join(''), width, missing };
}

/** Stroke width that suits a cap height (≈ 0.9 grid units). */
export function strokeFor(size: number, weight = 0.9): number {
  return (size / 6) * weight;
}
