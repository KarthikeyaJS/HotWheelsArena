/**
 * "Meet the Machine" stat model (pure). Themed readouts from `product.themedStats` and the
 * collector scores, scaled onto fixed ceilings so bars are comparable across the catalogue.
 */
import { formatNumber } from '@/lib/format';
import type { Product } from '@/types';

/** Bar ceilings. Values above a ceiling render a full bar; the readout keeps the real value. */
export const MACHINE_STAT_CEILINGS = {
  topSpeedKmh: 450,
  powerHp: 1600,
  score: 10,
} as const;

export type MachineStatId = 'top-speed' | 'power' | 'rarity' | 'collector';

export interface MachineStat {
  id: MachineStatId;
  /** HUD label, e.g. `TOP SPEED`. */
  label: string;
  /** Value clamped into `0..max` (what the bar fills to). */
  value: number;
  max: number;
  /** Mono readout, e.g. `296 KM/H`, `8/10`. */
  display: string;
  /** Fill percentage 0–100 (rounded to 1 decimal). */
  pct: number;
  /** `highlight` (yellow) is reserved for rarity. */
  tone: 'accent' | 'highlight';
}

/** Clamps `value` into `0..max` (non-finite → 0). */
export function clampStat(value: number, max: number): number {
  if (!Number.isFinite(value) || max <= 0) return 0;
  return Math.min(max, Math.max(0, value));
}

/** Percentage (0–100, 1 decimal) of `value` on a `max` ceiling. */
export function scaleStat(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((clampStat(value, max) / max) * 1000) / 10;
}

function scoreOutOfTen(score: number): number {
  return Math.round(clampStat(score, MACHINE_STAT_CEILINGS.score));
}

/** The four stat rows in display order: TOP SPEED, POWER, RARITY, COLLECTOR. */
export function buildMachineStats(
  product: Pick<Product, 'themedStats' | 'rarityScore' | 'collectorScore'>,
): MachineStat[] {
  const speed = Math.round(product.themedStats.topSpeedKmh);
  const power = Math.round(product.themedStats.powerHp);
  const rarity = scoreOutOfTen(product.rarityScore);
  const collector = scoreOutOfTen(product.collectorScore);

  return [
    {
      id: 'top-speed',
      label: 'TOP SPEED',
      value: clampStat(speed, MACHINE_STAT_CEILINGS.topSpeedKmh),
      max: MACHINE_STAT_CEILINGS.topSpeedKmh,
      display: `${formatNumber(Math.max(0, speed))} KM/H`,
      pct: scaleStat(speed, MACHINE_STAT_CEILINGS.topSpeedKmh),
      tone: 'accent',
    },
    {
      id: 'power',
      label: 'POWER',
      value: clampStat(power, MACHINE_STAT_CEILINGS.powerHp),
      max: MACHINE_STAT_CEILINGS.powerHp,
      display: `${formatNumber(Math.max(0, power))} HP`,
      pct: scaleStat(power, MACHINE_STAT_CEILINGS.powerHp),
      tone: 'accent',
    },
    {
      id: 'rarity',
      label: 'RARITY',
      value: rarity,
      max: MACHINE_STAT_CEILINGS.score,
      display: `${rarity}/10`,
      pct: scaleStat(rarity, MACHINE_STAT_CEILINGS.score),
      tone: 'highlight',
    },
    {
      id: 'collector',
      label: 'COLLECTOR',
      value: collector,
      max: MACHINE_STAT_CEILINGS.score,
      display: `${collector}/10`,
      pct: scaleStat(collector, MACHINE_STAT_CEILINGS.score),
      tone: 'accent',
    },
  ];
}

/** Exact disclaimer shown under the stat bars (spec §5.4). */
export const MACHINE_STATS_NOTE = 'Themed vehicle specifications — not claims about the toy itself.';
