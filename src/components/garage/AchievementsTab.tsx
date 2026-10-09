import { ChevronsUp, Trophy, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { HudPanel } from '@/components/effects/HudPanel';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { HudReadout } from '@/components/ui/HudReadout';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  BADGES,
  badgeProgress,
  badgeXpTotal,
  levelTitle,
  normalizeStats,
  xpForLevel,
  xpProgress,
} from '@/config/gamification';
import { cn } from '@/lib/cn';
import { formatLevel, formatNumber, formatXp } from '@/lib/format';
import type { UserProfile } from '@/types';
import { buildXpRules, upcomingLevels } from './garageModel';

export interface AchievementsTabProps {
  profile: UserProfile | null;
  isLoading: boolean;
}

const XP_RULES = buildXpRules();

function perLabel(per: 'order' | 'car' | 'badge' | undefined): string {
  if (per === 'car') return 'per car';
  if (per === 'badge') return 'once';
  return 'per order';
}

function AchievementsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <span className="sr-only">Loading achievements…</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-xl" />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-4 lg:col-span-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * ACHIEVEMENTS: live badge progress (server-awarded badges + `badgeProgress(profile.stats)`),
 * the level ladder (current + next three thresholds) and "How to earn XP" from the shared rules.
 * XP and badges are written by Cloud Functions only — this view never writes them.
 */
export function AchievementsTab({ profile, isLoading }: AchievementsTabProps) {
  const xp = profile?.xp ?? 0;
  const stats = useMemo(() => normalizeStats(profile?.stats), [profile?.stats]);
  const unlocked = useMemo(() => profile?.badges ?? [], [profile?.badges]);
  const progress = useMemo(() => xpProgress(xp), [xp]);
  const ladder = useMemo(() => upcomingLevels(xp, 3), [xp]);
  const nextBadge = useMemo(
    () =>
      badgeProgress(stats)
        .filter((entry) => !unlocked.includes(entry.id) && !entry.unlocked)
        .sort((a, b) => b.pct - a.pct)[0] ?? null,
    [stats, unlocked],
  );

  if (isLoading) return <AchievementsSkeleton />;

  const nextBadgeDef = nextBadge ? BADGES.find((badge) => badge.id === nextBadge.id) : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section aria-labelledby="garage-badges-title" className="flex flex-col gap-5 lg:col-span-8">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="hud text-muted">Trophy cabinet</p>
            <h2
              id="garage-badges-title"
              className="mt-1 font-display text-lg font-bold uppercase tracking-display text-fg"
            >
              Collector badges
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-5 sm:gap-8">
            <HudReadout
              label="Unlocked"
              value={`${formatNumber(unlocked.length)}/${formatNumber(BADGES.length)}`}
              tone={unlocked.length > 0 ? 'highlight' : 'default'}
            />
            <HudReadout label="Badge XP" value={formatNumber(badgeXpTotal(unlocked))} unit="XP" />
            <HudReadout label="Total" value={formatNumber(xp)} unit="XP" tone="accent" />
          </div>
        </div>

        {nextBadge && nextBadgeDef ? (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Zap aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>
              Closest unlock:{' '}
              <span className="font-semibold text-fg">
                {nextBadgeDef.emoji} {nextBadgeDef.title}
              </span>{' '}
              — {nextBadgeDef.requirement.toLowerCase()} ({formatNumber(nextBadge.current)}/
              {formatNumber(nextBadge.target)}).
            </span>
          </p>
        ) : unlocked.length === BADGES.length ? (
          <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-hud text-highlight-ink">
            <Trophy aria-hidden="true" className="h-4 w-4" />
            Every badge unlocked — full trophy cabinet
          </p>
        ) : null}

        <BadgeGrid unlocked={unlocked} stats={stats} columns={2} />
      </section>

      <div className="flex flex-col gap-6 lg:col-span-4">
        <HudPanel as="section" aria-labelledby="garage-ladder-title" meta={formatXp(xp)}>
          <h2
            id="garage-ladder-title"
            className="mb-4 font-display text-base font-bold uppercase tracking-display text-fg"
          >
            Level ladder
          </h2>
          <div className="flex items-center justify-between gap-4">
            <LevelBadge level={progress.level} size="md" showTitle />
            <p className="hud text-right text-2xs text-muted">
              {progress.isMax ? 'Max level' : 'To next level'}
              <span className="mt-1 block font-mono text-lg font-bold tracking-normal text-fg">
                {progress.isMax ? '—' : formatNumber(progress.toNext)}
              </span>
            </p>
          </div>
          {ladder.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Maximum level reached — you are an {levelTitle(progress.level)}.
            </p>
          ) : (
            <ol aria-label="Next levels" className="mt-5 flex flex-col gap-2">
              <li className="flex flex-col gap-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2.5">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-xs font-bold uppercase tracking-display text-fg">
                    {formatLevel(progress.level)}
                    <span className="hud ml-2 text-2xs text-accent-ink">You are here</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {formatNumber(xpForLevel(progress.level))} XP
                  </span>
                </span>
                <ProgressBar
                  value={progress.pct}
                  label={`Progress to ${formatLevel(progress.level + 1)}`}
                  valueText={`${formatNumber(progress.current)} of ${formatNumber(progress.next)} XP`}
                  size="xs"
                />
              </li>
              {ladder.map((step, index) => (
                <li
                  key={step.level}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2',
                    index === 0 ? 'bg-card' : 'bg-transparent',
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-display text-fg">
                      <ChevronsUp aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
                      {formatLevel(step.level)}
                    </span>
                    <span className="hud mt-0.5 block text-xs text-muted">{step.title}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                    <span className="block text-fg">{formatNumber(step.threshold)} XP</span>
                    <span className="block text-xs text-muted">
                      {formatNumber(step.remaining)} to go
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </HudPanel>

        <HudPanel as="section" aria-labelledby="garage-earn-title" tone="default">
          <h2
            id="garage-earn-title"
            className="mb-1 font-display text-base font-bold uppercase tracking-display text-fg"
          >
            How to earn XP
          </h2>
          <p className="mb-4 text-xs text-muted">
            XP is awarded by the race officials (our servers) when orders clear and badges unlock.
          </p>
          <ul className="flex flex-col divide-y divide-line">
            {XP_RULES.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{rule.label}</span>
                  <span className="block text-xs text-muted">{rule.detail}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs font-bold tabular-nums text-accent-ink">
                  +{formatNumber(rule.xp)} XP
                  <span className="block text-2xs font-normal uppercase tracking-hud text-muted">
                    {perLabel(rule.per)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </HudPanel>
      </div>
    </div>
  );
}
