import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type HudReadoutTone = 'default' | 'accent' | 'highlight';
export type HudReadoutSize = 'sm' | 'md' | 'lg';

export interface HudReadoutProps {
  /** Mono caption, e.g. `RPM`, `CARS OWNED`. */
  label: string;
  value: ReactNode;
  /** Small unit after the value, e.g. `KM/H`. */
  unit?: string;
  /** `accent` (orange ink) for live/interactive stats, `highlight` (yellow ink) for rare stats only. */
  tone?: HudReadoutTone;
  size?: HudReadoutSize;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const TONES: Readonly<Record<HudReadoutTone, string>> = {
  default: 'text-fg',
  accent: 'text-accent-ink',
  highlight: 'text-highlight-ink',
};

const VALUE_SIZES: Readonly<Record<HudReadoutSize, string>> = {
  sm: 'text-base',
  md: 'text-2xl',
  lg: 'text-3xl sm:text-4xl',
};

const ALIGN = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
} as const;

/** Racing-dashboard readout: small mono label over a big tabular number (`RPM 8,200`). */
export function HudReadout({
  label,
  value,
  unit,
  tone = 'default',
  size = 'md',
  align = 'left',
  className,
}: HudReadoutProps) {
  return (
    <div className={cn('flex flex-col gap-1', ALIGN[align], className)}>
      <span className="hud text-muted">{label}</span>
      <span
        className={cn(
          'font-mono font-bold leading-none tabular-nums tracking-tight',
          TONES[tone],
          VALUE_SIZES[size],
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1.5 align-baseline text-[0.45em] font-semibold uppercase tracking-hud text-muted">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}
