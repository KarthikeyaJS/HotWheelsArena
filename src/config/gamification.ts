/**
 * Gamification config for the UI: re-exports the shared rules (single source of truth with
 * Cloud Functions) plus presentation metadata (icons, tones, Tailwind class sets).
 */
import { Crown, Flag, Flame, Gem, Warehouse, type LucideIcon } from 'lucide-react';
import type { BadgeId } from '@shared/types';

export * from '@shared/gamification';

/**
 * Badge colour tone. `highlight` (yellow) is reserved for rare achievements, `danger` for
 * "hot" ones, `accent` for speed, `metal` for neutral milestones.
 */
export type BadgeTone = 'danger' | 'accent' | 'highlight' | 'metal';

export interface BadgeUi {
  icon: LucideIcon;
  tone: BadgeTone;
}

export const BADGE_UI: Readonly<Record<BadgeId, BadgeUi>> = {
  'first-ride': { icon: Flame, tone: 'danger' },
  'speed-demon': { icon: Flag, tone: 'accent' },
  'treasure-hunter': { icon: Gem, tone: 'highlight' },
  'garage-builder': { icon: Warehouse, tone: 'metal' },
  'master-collector': { icon: Crown, tone: 'highlight' },
};

export interface ToneClasses {
  /** AA-safe text colour for the tone. */
  text: string;
  /** Tinted background. */
  bg: string;
  border: string;
  /** Glow shadow for unlocked state. */
  glow: string;
  /** Solid fill (e.g. progress bars). */
  fill: string;
}

/** Complete class strings (kept literal so Tailwind's JIT picks them up). */
export const BADGE_TONE_CLASSES: Readonly<Record<BadgeTone, ToneClasses>> = {
  danger: {
    text: 'text-danger-ink',
    bg: 'bg-danger/10',
    border: 'border-danger/40',
    glow: 'shadow-[0_0_28px_-8px_rgb(var(--accent-2)/0.65)]',
    fill: 'bg-danger',
  },
  accent: {
    text: 'text-accent-ink',
    bg: 'bg-accent/10',
    border: 'border-accent/40',
    glow: 'shadow-glow-accent',
    fill: 'bg-accent',
  },
  highlight: {
    text: 'text-highlight-ink',
    bg: 'bg-highlight/10',
    border: 'border-highlight/50',
    glow: 'shadow-glow-highlight',
    fill: 'bg-highlight',
  },
  metal: {
    text: 'text-fg',
    bg: 'bg-metal/15',
    border: 'border-metal/40',
    glow: 'shadow-card-hover',
    fill: 'bg-metal',
  },
};
