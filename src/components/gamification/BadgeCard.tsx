import { Check, Lock } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BADGE_TONE_CLASSES, BADGE_UI, getBadge } from '@/config/gamification';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { BadgeId, BadgeProgress } from '@/types';

export interface BadgeCardProps {
  badgeId: BadgeId;
  unlocked: boolean;
  /** Progress towards the badge (from `badgeProgress(stats)`), shown while locked. */
  progress?: BadgeProgress;
  /** `md` = full card (default); `sm` = compact row. */
  size?: 'sm' | 'md';
  /** Show the progress bar on locked badges (default true when `progress` is given). */
  showProgress?: boolean;
  /** Heading level of the badge title (default `h3`). */
  headingAs?: 'h3' | 'h4';
  className?: string;
}

/**
 * Achievement badge. Locked: muted medallion, lock mark and a progress bar. Unlocked: the
 * badge's tone colours (`BADGE_UI`) with a glow and an "UNLOCKED" status. In the full card the
 * XP line and progress bar sit at the bottom (`mt-auto`), so they line up across a grid row even
 * when one requirement wraps to two lines.
 */
export function BadgeCard({
  badgeId,
  unlocked,
  progress,
  size = 'md',
  showProgress = true,
  headingAs: Heading = 'h3',
  className,
}: BadgeCardProps) {
  const badge = getBadge(badgeId);
  const ui = BADGE_UI[badgeId];
  const tone = BADGE_TONE_CLASSES[ui.tone];
  const Icon = ui.icon;
  const compact = size === 'sm';
  const showBar = !unlocked && showProgress && progress !== undefined;

  return (
    <article
      className={cn(
        'relative flex h-full overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,background-color] duration-200 ease-race',
        compact ? 'items-center gap-3 p-3' : 'flex-col gap-4 p-5',
        unlocked ? cn(tone.border, tone.glow) : 'border-line',
        className,
      )}
    >
      {unlocked ? (
        <span aria-hidden="true" className={cn('absolute inset-x-0 top-0 h-1', tone.fill)} />
      ) : null}

      <div className={cn('flex items-start', compact ? 'shrink-0' : 'justify-between gap-3')}>
        <div
          aria-hidden="true"
          className={cn(
            'relative grid shrink-0 place-items-center rounded-full border-2',
            compact ? 'h-11 w-11 text-xl' : 'h-16 w-16 text-3xl',
            unlocked ? cn(tone.border, tone.bg) : 'border-line bg-fg/[0.04]',
          )}
        >
          {/* Locked emoji: desaturated and dimmed, not fully grey at half opacity (dark glyphs such
              as 🏎️ vanished on the dark card); a faint light outline keeps them legible there. */}
          <span
            className={cn(
              'leading-none',
              !unlocked &&
                'opacity-75 grayscale-[0.85] dark:drop-shadow-[0_0_1px_rgb(var(--text)/0.75)]',
            )}
          >
            {badge.emoji}
          </span>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 grid place-items-center rounded-full border bg-surface',
              compact ? 'h-5 w-5' : 'h-6 w-6',
              unlocked ? cn(tone.border, tone.text) : 'border-line text-muted',
            )}
          >
            {unlocked ? (
              <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            ) : (
              <Lock className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            )}
          </span>
        </div>
        {!compact ? (
          <span
            className={cn(
              'hud inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
              unlocked ? cn(tone.border, tone.text) : 'border-line text-muted',
            )}
          >
            {unlocked ? (
              <Check aria-hidden="true" className="h-3 w-3" />
            ) : (
              <Lock aria-hidden="true" className="h-3 w-3" />
            )}
            {unlocked ? 'Unlocked' : 'Locked'}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <Heading
            className={cn(
              'font-display font-bold uppercase leading-tight tracking-display',
              compact ? 'text-xs' : 'text-sm',
              unlocked ? 'text-fg' : 'text-fg/80',
            )}
          >
            {badge.title}
          </Heading>
          {compact ? (
            <span className={cn('hud shrink-0', unlocked ? tone.text : 'text-muted')}>
              {unlocked ? 'Unlocked' : 'Locked'}
            </span>
          ) : null}
        </div>
        <p className={cn('text-muted', compact ? 'mt-0.5 text-xs' : 'mt-1.5 text-sm')}>
          {badge.requirement}
        </p>
        {!compact && unlocked ? (
          <p className="mt-2 text-sm text-fg/80">{badge.description}</p>
        ) : null}
        {!compact ? (
          <p
            className={cn(
              'mt-auto pt-3 font-mono text-xs font-bold tabular-nums',
              unlocked ? tone.text : 'text-muted',
            )}
          >
            +{formatNumber(badge.xpReward)} XP
          </p>
        ) : null}
        {showBar ? (
          <ProgressBar
            value={progress.current}
            max={progress.target}
            label={`${badge.title} progress`}
            valueText={`${formatNumber(progress.current)} of ${formatNumber(progress.target)}`}
            showValue
            valueLabel={`${formatNumber(progress.current)}/${formatNumber(progress.target)}`}
            size="xs"
            tone="accent"
            className={compact ? 'mt-2' : 'mt-3'}
          />
        ) : null}
      </div>
    </article>
  );
}
