import { useMemo } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { levelTitle, xpProgress } from '@/config/gamification';
import { cn } from '@/lib/cn';
import { formatLevel, formatNumber, formatXp } from '@/lib/format';

export interface XpBarProps {
  /** Total XP (from the profile). */
  xp: number;
  /** `LEVEL 07` / `1,240 XP` above and `160 XP TO LEVEL 08` below the bar (default true). */
  showLabels?: boolean;
  size?: 'sm' | 'md';
  /** Fill on scroll into view (default true; instant for reduced motion). */
  animated?: boolean;
  className?: string;
}

/** XP progress through the current level (shared `xpProgress` rules). */
export function XpBar({
  xp,
  showLabels = true,
  size = 'md',
  animated = true,
  className,
}: XpBarProps) {
  const progress = useMemo(() => xpProgress(xp), [xp]);
  const nextLevel = progress.level + 1;
  const barLabel = progress.isMax
    ? `${formatLevel(progress.level)} — max level reached`
    : `Progress to ${formatLevel(nextLevel)}`;
  const valueText = progress.isMax
    ? `${formatXp(progress.xp)}, max level`
    : `${formatNumber(progress.current)} of ${formatNumber(progress.next)} XP, ${formatNumber(progress.toNext)} XP to ${formatLevel(nextLevel)}`;

  return (
    <div className={cn('w-full', className)}>
      {showLabels ? (
        <div className="mb-2 flex items-end justify-between gap-3">
          <span
            className={cn(
              'font-display font-bold uppercase tracking-display text-fg',
              size === 'md' ? 'text-sm' : 'text-xs',
            )}
          >
            {formatLevel(progress.level)}
          </span>
          <span
            className={cn(
              'font-mono font-bold tabular-nums text-accent-ink',
              size === 'md' ? 'text-sm' : 'text-xs',
            )}
          >
            {formatXp(progress.xp)}
          </span>
        </div>
      ) : null}
      <ProgressBar
        value={progress.pct}
        label={barLabel}
        valueText={valueText}
        tone="accent"
        size={size === 'md' ? 'md' : 'sm'}
        striped={size === 'md'}
        animated={animated}
      />
      {showLabels ? (
        <p className="hud mt-2 text-muted">
          {progress.isMax
            ? `MAX LEVEL — ${levelTitle(progress.level)}`
            : `${formatNumber(progress.toNext)} XP TO ${formatLevel(nextLevel)}`}
        </p>
      ) : null}
    </div>
  );
}
