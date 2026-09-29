import { motion, useInView } from 'framer-motion';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { EASE_OUT_EXPO, inViewOnce } from '@/lib/animations';
import { cn } from '@/lib/cn';

export type ProgressTone = 'accent' | 'highlight' | 'success' | 'danger' | 'metal';
export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  /** Current value (0–`max`, clamped). */
  value: number;
  /** Default 100 (so `value` is a percentage). */
  max?: number;
  /** Accessible name (`aria-label`); also the visible caption with `showLabel`. */
  label: string;
  /** `highlight` (yellow) only for limited / vault / achievements. */
  tone?: ProgressTone;
  size?: ProgressSize;
  /** Show the value on the right above the bar (mono). */
  showValue?: boolean;
  /** Custom visible value (default `72%`), e.g. `3/10`, `37 LEFT`. */
  valueLabel?: ReactNode;
  /** `aria-valuetext` (defaults to `valueLabel` when it is a string). */
  valueText?: string;
  /** Show `label` as a HUD caption above the bar. */
  showLabel?: boolean;
  /** Fill from 0 when scrolled into view (once). Instant for reduced-motion users. Default true. */
  animated?: boolean;
  /** Split the bar into N tachometer segments. */
  segments?: number;
  /** Diagonal racing-livery stripes on the fill. */
  striped?: boolean;
  className?: string;
  trackClassName?: string;
}

const TRACK_SIZES: Readonly<Record<ProgressSize, string>> = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

const FILL_TONES: Readonly<Record<ProgressTone, string>> = {
  accent: 'bg-accent shadow-[0_0_12px_rgb(var(--accent)/0.55)]',
  highlight: 'bg-highlight shadow-[0_0_12px_rgb(var(--highlight)/0.5)]',
  success: 'bg-success',
  danger: 'bg-danger',
  metal: 'bg-metal',
};

/** Mask that cuts the track into `segments` blocks with 3px gaps. */
function segmentMask(segments: number): CSSProperties {
  const image = 'linear-gradient(90deg, #000 calc(100% - 3px), transparent calc(100% - 3px))';
  const size = `calc(100% / ${segments}) 100%`;
  return {
    WebkitMaskImage: image,
    maskImage: image,
    WebkitMaskSize: size,
    maskSize: size,
    WebkitMaskRepeat: 'repeat-x',
    maskRepeat: 'repeat-x',
  };
}

/**
 * Accessible progress bar (`role="progressbar"`). The fill animates its width when the bar
 * scrolls into view (once); reduced-motion users get the final width immediately.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'accent',
  size = 'sm',
  showValue = false,
  valueLabel,
  valueText,
  showLabel = false,
  animated = true,
  segments,
  striped = false,
  className,
  trackClassName,
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const inView = useInView(trackRef, inViewOnce);

  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const clamped = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const pct = (clamped / safeMax) * 100;
  const width = `${pct}%`;
  const shouldAnimate = animated && !reduceMotion;
  const ariaValueText = valueText ?? (typeof valueLabel === 'string' ? valueLabel : undefined);
  const fillClasses = cn('relative h-full overflow-hidden rounded-full', FILL_TONES[tone]);

  const fillInner = (
    <>
      {striped ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(115deg,transparent_0_6px,rgb(0_0_0/0.18)_6px_10px)]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-0 w-3 bg-gradient-to-r from-transparent to-white/45"
      />
    </>
  );

  return (
    <div className={cn('w-full', className)}>
      {showLabel || showValue ? (
        <div aria-hidden="true" className="mb-1.5 flex items-baseline justify-between gap-3">
          {showLabel ? <span className="hud text-muted">{label}</span> : <span />}
          {showValue ? (
            <span className="font-mono text-xs font-bold tabular-nums text-fg">
              {valueLabel ?? `${Math.round(pct)}%`}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        ref={trackRef}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.round(clamped * 100) / 100}
        aria-valuetext={ariaValueText}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-fg/10',
          TRACK_SIZES[size],
          trackClassName,
        )}
        style={
          segments !== undefined && segments > 1 ? segmentMask(Math.floor(segments)) : undefined
        }
      >
        {shouldAnimate ? (
          <motion.div
            className={fillClasses}
            initial={{ width: '0%' }}
            animate={{ width: inView ? width : '0%' }}
            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.1 }}
          >
            {fillInner}
          </motion.div>
        ) : (
          <div className={fillClasses} style={{ width }}>
            {fillInner}
          </div>
        )}
      </div>
    </div>
  );
}
