import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { SPRING_SNAPPY } from '@/lib/animations';

export type CountBadgeTone = 'accent' | 'danger' | 'highlight' | 'neutral';

export interface CountBadgeProps {
  count: number;
  /** Counts above this render as `99+` (default 99). */
  max?: number;
  /** Screen-reader context appended to the number, e.g. "items in your pit stop". */
  label?: string;
  /** Render when the count is 0 (hidden by default). */
  showZero?: boolean;
  tone?: CountBadgeTone;
  size?: 'sm' | 'md';
  /** Hide from assistive tech (when the parent's accessible name already includes the count). */
  decorative?: boolean;
  className?: string;
}

const TONES: Readonly<Record<CountBadgeTone, string>> = {
  accent: 'bg-accent text-on-accent',
  danger: 'bg-danger text-white',
  highlight: 'bg-highlight text-on-highlight',
  neutral: 'bg-fg text-bg',
};

const SIZES = {
  sm: 'h-4 min-w-4 px-1 text-2xs leading-none',
  md: 'h-5 min-w-5 px-1.5 text-2xs leading-none',
} as const;

/** Formats a badge count: `7`, `99+`. */
function formatCount(count: number, max: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return safe > max ? `${max}+` : String(safe);
}

/**
 * Small mono count pill (cart, wishlist, tab badges). Pops when the number changes
 * (transform only — disabled for reduced-motion users by the global MotionConfig).
 */
export function CountBadge({
  count,
  max = 99,
  label,
  showZero = false,
  tone = 'accent',
  size = 'md',
  decorative = false,
  className,
}: CountBadgeProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (safeCount === 0 && !showZero) return null;
  const display = formatCount(safeCount, max);

  return (
    <motion.span
      key={display}
      initial={{ scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={SPRING_SNAPPY}
      aria-hidden={decorative || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-mono font-bold tabular-nums leading-none ring-2 ring-bg',
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      {display}
      {label && !decorative ? <span className="sr-only"> {label}</span> : null}
    </motion.span>
  );
}
