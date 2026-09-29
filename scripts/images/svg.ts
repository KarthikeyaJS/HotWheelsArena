/** Minimal SVG string helpers for the image generator (no dependencies). */

export type AttrValue = string | number | undefined | null | false;
export type Attrs = Readonly<Record<string, AttrValue>>;

/** Rounds to one decimal place and drops trailing zeros — keeps the SVGs small. */
export function n(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

const escapeAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function attrs(values: Attrs): string {
  return Object.entries(values)
    .filter((entry): entry is [string, string | number] => {
      const value = entry[1];
      return value !== undefined && value !== null && value !== false;
    })
    .map(([key, value]) => ` ${key}="${typeof value === 'number' ? n(value) : escapeAttr(value)}"`)
    .join('');
}

/** `<name …>children</name>`, or self-closing when there are no children. */
export function el(
  name: string,
  values: Attrs = {},
  children: string | readonly string[] = '',
): string {
  const content = typeof children === 'string' ? children : children.join('');
  return content ? `<${name}${attrs(values)}>${content}</${name}>` : `<${name}${attrs(values)}/>`;
}

/** Gradient stop: [offset 0–1, colour, opacity?]. */
export type Stop = readonly [offset: number, color: string, opacity?: number];

function stops(list: readonly Stop[]): string {
  return list
    .map(([offset, color, opacity]) =>
      el('stop', {
        offset: n(offset),
        'stop-color': color,
        'stop-opacity': opacity === undefined || opacity === 1 ? undefined : n(opacity),
      }),
    )
    .join('');
}

export interface LinearSpec {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Defaults to userSpaceOnUse (safe for strokes and zero-area shapes). */
  bbox?: boolean;
}

export function linearGradient(id: string, spec: LinearSpec, list: readonly Stop[]): string {
  return el(
    'linearGradient',
    {
      id,
      gradientUnits: spec.bbox ? undefined : 'userSpaceOnUse',
      x1: spec.x1,
      y1: spec.y1,
      x2: spec.x2,
      y2: spec.y2,
    },
    stops(list),
  );
}

export interface RadialSpec {
  cx: number;
  cy: number;
  r: number;
  /** Vertical squash for elliptical glows/shadows (ry / rx). */
  squash?: number;
}

export function radialGradient(id: string, spec: RadialSpec, list: readonly Stop[]): string {
  const squash = spec.squash ?? 1;
  return el(
    'radialGradient',
    {
      id,
      gradientUnits: 'userSpaceOnUse',
      cx: spec.cx,
      cy: spec.cy,
      r: spec.r,
      gradientTransform:
        squash === 1
          ? undefined
          : `translate(${n(spec.cx)} ${n(spec.cy)}) scale(1 ${Math.max(0.001, Math.round(squash * 1000) / 1000)}) translate(${n(-spec.cx)} ${n(-spec.cy)})`,
    },
    stops(list),
  );
}

/** Wraps content in a standalone SVG document. */
export function svgDocument(
  width: number,
  height: number,
  content: string,
  extra: Attrs = {},
): string {
  return `${el(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      ...extra,
    },
    content,
  )}\n`;
}
