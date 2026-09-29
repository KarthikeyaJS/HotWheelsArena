import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { StarShape } from './StarShape';

export type StarRatingSize = 'sm' | 'md' | 'lg';

export interface StarRatingProps {
  /** 0–5; rendered to the nearest half star, announced to one decimal. */
  value: number;
  /** Number of ratings, shown as `(23)` and announced. */
  count?: number;
  size?: StarRatingSize;
  /** Show the numeric value (`4.5`) after the stars. */
  showValue?: boolean;
  className?: string;
}

const STAR_SIZES: Readonly<Record<StarRatingSize, string>> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const TEXT_SIZES: Readonly<Record<StarRatingSize, string>> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
};

const STARS = [0, 1, 2, 3, 4] as const;

/** Read-only star rating (`role="img"`, e.g. "Rated 4.5 out of 5, 23 ratings"). */
export function StarRating({ value, count, size = 'md', showValue = false, className }: StarRatingProps) {
  const safe = Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  const halves = Math.round(safe * 2) / 2;
  const display = safe.toFixed(1);
  const hasCount = count !== undefined && Number.isFinite(count);
  const label = `Rated ${display} out of 5${
    hasCount ? `, ${formatNumber(count)} ${count === 1 ? 'rating' : 'ratings'}` : ''
  }`;

  return (
    <span role="img" aria-label={label} className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex items-center gap-0.5">
        {STARS.map((index) => {
          const fill = Math.min(1, Math.max(0, halves - index));
          return (
            <span key={index} className={cn('relative inline-block', STAR_SIZES[size])}>
              <StarShape className={cn('absolute inset-0 text-fg/15', STAR_SIZES[size])} />
              {fill > 0 ? (
                <span
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <StarShape className={cn('max-w-none text-accent', STAR_SIZES[size])} />
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
      {showValue ? (
        <span className={cn('font-mono font-bold tabular-nums text-fg', TEXT_SIZES[size])}>
          {display}
        </span>
      ) : null}
      {hasCount ? (
        <span className={cn('font-mono tabular-nums text-muted', TEXT_SIZES[size])}>
          ({formatNumber(count)})
        </span>
      ) : null}
    </span>
  );
}
