import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { ProgressBar, type ProgressTone } from './ProgressBar';

export interface StatBarProps {
  /** Stat name, e.g. `TOP SPEED`. */
  label: string;
  value: number;
  max: number;
  /** Readout on the right, e.g. `320 KM/H`, `8/10` (default `value/max`). */
  display?: string;
  tone?: ProgressTone;
  /** Fill when scrolled into view (default true; instant under reduced motion). */
  animateOnView?: boolean;
  icon?: ReactNode;
  /** Tachometer segments (default 10; pass 0 for a smooth bar). */
  segments?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/** "Meet the Machine" stat row: HUD label, mono readout and a segmented bar filling on view. */
export function StatBar({
  label,
  value,
  max,
  display,
  tone = 'accent',
  animateOnView = true,
  icon,
  segments = 10,
  size = 'md',
  className,
}: StatBarProps) {
  const readout = display ?? `${formatNumber(value)}/${formatNumber(max)}`;

  return (
    <div className={cn('w-full', className)}>
      <div aria-hidden="true" className="mb-2 flex items-baseline justify-between gap-4">
        <span className="hud flex items-center gap-2 text-muted [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-accent-ink">
          {icon}
          {label}
        </span>
        <span
          className={cn(
            'font-mono font-bold tabular-nums text-fg',
            size === 'md' ? 'text-sm' : 'text-xs',
          )}
        >
          {readout}
        </span>
      </div>
      <ProgressBar
        value={value}
        max={max}
        label={label}
        valueText={readout}
        tone={tone}
        size={size === 'md' ? 'md' : 'sm'}
        animated={animateOnView}
        segments={segments > 1 ? segments : undefined}
      />
    </div>
  );
}
