/**
 * Colour palettes for the generated art. Car paints are four-stop metallic ramps
 * (highlight → base → shade → deep) so every colour gets the same studio lighting.
 */
import type { Paint } from '../data/placeholders.ts';

export interface PaintRamp {
  light: string;
  base: string;
  dark: string;
  deep: string;
}

export const PAINT_PALETTES: Readonly<Record<Paint, PaintRamp>> = {
  orange: { light: '#FFB47E', base: '#FF5A00', dark: '#B53D00', deep: '#521A00' },
  red: { light: '#FF8078', base: '#D81F1B', dark: '#8A0E0B', deep: '#3D0504' },
  blue: { light: '#94BCFF', base: '#1F5BD8', dark: '#0F3380', deep: '#06163A' },
  green: { light: '#B4F59A', base: '#3FB53B', dark: '#1B6A1E', deep: '#0A300D' },
  yellow: { light: '#FFF19E', base: '#FFC400', dark: '#B58500', deep: '#5A4200' },
  gold: { light: '#FFEBB0', base: '#D3A02A', dark: '#8A620F', deep: '#443005' },
  silver: { light: '#FFFFFF', base: '#BAC0C7', dark: '#6C727A', deep: '#32363B' },
  white: { light: '#FFFFFF', base: '#EDECE8', dark: '#B3B6BA', deep: '#6D7075' },
  black: { light: '#727884', base: '#26292E', dark: '#111316', deep: '#050506' },
  purple: { light: '#C7A0FF', base: '#5F2B99', dark: '#2F1353', deep: '#140626' },
};

/** Dark garage metal used for the "parked car" category silhouettes. */
export const METAL_RAMP: PaintRamp = {
  light: '#6A7079',
  base: '#4A4F55',
  dark: '#2A2D31',
  deep: '#15171A',
};

/** Neutral graphite for the generic fallback car. */
export const GRAPHITE_RAMP: PaintRamp = {
  light: '#E1E4E8',
  base: '#8D949C',
  dark: '#5A6068',
  deep: '#33373C',
};

/** Liquid chrome / gunmetal for the hero car and social card. */
export const CHROME_RAMP: PaintRamp = {
  light: '#FFFFFF',
  base: '#A3AAB3',
  dark: '#3B4047',
  deep: '#121417',
};

/** Brand + UI colours (mirror src/styles/tokens.css). */
export const BRAND = {
  accent: '#FF5A00',
  accentLight: '#FF8A3D',
  red: '#E10600',
  highlight: '#FFC400',
  ink: '#0B0B0B',
  bg: '#080808',
  surface: '#111111',
  white: '#FFFFFF',
  muted: '#8A8A8A',
  line: '#2A2D31',
} as const;

/** Livery accent colours that read well on each paint. */
export function liveryAccents(paint: Paint): { primary: string; secondary: string } {
  switch (paint) {
    case 'white':
    case 'silver':
      return { primary: BRAND.red, secondary: BRAND.ink };
    case 'yellow':
    case 'gold':
      return { primary: BRAND.ink, secondary: '#FFFFFF' };
    case 'red':
    case 'orange':
      return { primary: '#FFFFFF', secondary: BRAND.ink };
    case 'blue':
      return { primary: '#FFFFFF', secondary: '#FFFFFF' };
    default:
      return { primary: '#FFFFFF', secondary: BRAND.accent };
  }
}
