import { levelTitle, MAX_LEVEL } from '@/config/gamification';
import { cn } from '@/lib/cn';
import { formatLevel, padNumber } from '@/lib/format';

export type LevelBadgeSize = 'sm' | 'md' | 'lg';

export interface LevelBadgeProps {
  level: number;
  size?: LevelBadgeSize;
  /** Show the rank title (`STREET RACER`) under the level. */
  showTitle?: boolean;
  /** Show the `LEVEL 07` text next to the hex (default true). */
  showLabel?: boolean;
  className?: string;
}

const HEX_SIZES: Readonly<Record<LevelBadgeSize, string>> = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
};

const LABEL_SIZES: Readonly<Record<LevelBadgeSize, string>> = {
  sm: 'font-mono text-xs tracking-hud',
  md: 'font-display text-sm tracking-display',
  lg: 'font-display text-xl tracking-display',
};

/** Hall-of-fame levels (20+) earn the rare yellow treatment; everything else is orange. */
const HALL_OF_FAME_LEVEL = 20;

/**
 * Collector level badge: an orange hex medallion with the level number plus `LEVEL 07` and
 * the optional rank title. Screen readers get "Level 7, Street Racer".
 */
export function LevelBadge({
  level,
  size = 'md',
  showTitle = false,
  showLabel = true,
  className,
}: LevelBadgeProps) {
  const safeLevel = Math.min(
    MAX_LEVEL,
    Math.max(1, Math.floor(Number.isFinite(level) ? level : 1)),
  );
  const title = levelTitle(safeLevel);
  const elite = safeLevel >= HALL_OF_FAME_LEVEL;

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span className="sr-only">
        Level {safeLevel}
        {showTitle ? `, ${title}` : ''}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative grid shrink-0 place-items-center',
          HEX_SIZES[size],
          size === 'lg' &&
            (elite
              ? 'drop-shadow-[0_0_18px_rgb(var(--highlight)/0.45)]'
              : 'drop-shadow-[0_0_18px_rgb(var(--accent)/0.4)]'),
        )}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <polygon
            points="50,3 93,27.5 93,72.5 50,97 7,72.5 7,27.5"
            strokeWidth="6"
            strokeLinejoin="round"
            className={cn('fill-surface', elite ? 'stroke-highlight' : 'stroke-accent')}
          />
          <polygon
            points="50,17 81,34.5 81,65.5 50,83 19,65.5 19,34.5"
            strokeWidth="1.5"
            className={
              elite ? 'fill-highlight/10 stroke-highlight/40' : 'fill-accent/10 stroke-accent/35'
            }
          />
          <path
            d="M30 78 L50 66 L70 78"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={elite ? 'stroke-highlight/60' : 'stroke-accent/60'}
          />
        </svg>
        <span className="relative -mt-[8%] font-display font-black tabular-nums leading-none text-fg">
          {padNumber(safeLevel)}
        </span>
      </span>
      {showLabel || showTitle ? (
        <span aria-hidden="true" className="flex min-w-0 flex-col gap-1 leading-none">
          {showLabel ? (
            <span className={cn('font-bold uppercase text-fg', LABEL_SIZES[size])}>
              {formatLevel(safeLevel)}
            </span>
          ) : null}
          {showTitle ? (
            <span className={cn('hud', elite ? 'text-highlight-ink' : 'text-accent-ink')}>
              {title}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
