import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

export type SkeletonVariant = 'block' | 'text' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Number of text lines (`variant="text"`); the last line is shorter. Default 1. */
  lines?: number;
  /** Size / shape overrides (e.g. `h-40 rounded-xl`, `h-12 w-12`). */
  className?: string;
  style?: CSSProperties;
}

/**
 * Two thin orange speed stripes that sweep diagonally across the `.shimmer` base, like a car
 * passing the pit wall. Hidden for reduced-motion users (the base shimmer turns static too).
 */
function SpeedStripes() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(105deg,transparent_0%,transparent_43%,rgb(var(--accent)/0.16)_43.5%,rgb(var(--accent)/0.16)_45%,transparent_45.5%,transparent_46.5%,rgb(var(--accent)/0.1)_47%,rgb(var(--accent)/0.1)_47.8%,transparent_48.3%,transparent_100%)] bg-[length:200%_100%] motion-reduce:hidden"
    />
  );
}

const TEXT_WIDTHS = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-5/6'] as const;

/**
 * Racing skeleton placeholder (decorative, `aria-hidden`). Match the final layout's shape;
 * wrap groups in `DataState` (or a `role="status"` element) for the "loading" announcement.
 */
export function Skeleton({ variant = 'block', lines = 1, className, style }: SkeletonProps) {
  if (variant === 'text') {
    const count = Math.max(1, Math.floor(lines));
    return (
      <span aria-hidden="true" className={cn('flex w-full flex-col gap-2.5', className)} style={style}>
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className={cn(
              'shimmer relative block h-3 overflow-hidden rounded-sm',
              count > 1 && index === count - 1 ? 'w-3/5' : TEXT_WIDTHS[index % TEXT_WIDTHS.length],
            )}
          >
            <SpeedStripes />
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        'shimmer relative block overflow-hidden',
        variant === 'circle' ? 'h-10 w-10 shrink-0 rounded-full' : 'h-24 w-full rounded-lg',
        className,
      )}
    >
      <SpeedStripes />
    </span>
  );
}
