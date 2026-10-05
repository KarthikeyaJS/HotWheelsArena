import { ArrowRight, Package, Plus, Sparkles, Trophy } from 'lucide-react';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { Button } from '@/components/ui/Button';
import {
  BADGES,
  BADGE_TONE_CLASSES,
  BADGE_UI,
  LEVEL_TITLES,
  MAX_LEVEL,
  ORDER_BASE_XP,
  RARITY_XP_BONUS,
  XP_PER_CAR,
  xpForLevel,
} from '@/config/gamification';
import { garagePath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { firstName, formatXp } from '@/lib/format';
import { rarityLabel } from '@/lib/product';
import { RARITIES } from '@shared/types';

/** Worked example: one order with a common, a rare and a limited car. */
const EXAMPLE_ITEMS = ['common', 'rare', 'limited'] as const;
const EXAMPLE_XP =
  ORDER_BASE_XP +
  EXAMPLE_ITEMS.reduce((total, rarity) => total + XP_PER_CAR + RARITY_XP_BONUS[rarity], 0);

/**
 * "How collector levels work": XP sources, the rank ladder (from the shared level thresholds),
 * badge rewards and — for signed-in collectors — their own XP bar.
 */
export function CollectorLevels() {
  const { profile, status } = useAuth();

  return (
    <div className="flex flex-col gap-10">
      {/* XP sources */}
      <div className="grid gap-4 md:grid-cols-3">
        <article className="group relative overflow-hidden rounded-xl border border-line bg-card p-5 shadow-card">
          <span aria-hidden="true" className="racing-stripe" />
          <p className="hud flex items-center gap-2 text-muted">
            <Package aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            Every order
          </p>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-fg">
            +{ORDER_BASE_XP}
            <span className="ml-1.5 text-sm text-muted">XP</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Base reward for each completed order, on top of the per-car XP.
          </p>
        </article>
        <article className="group relative overflow-hidden rounded-xl border border-line bg-card p-5 shadow-card">
          <span aria-hidden="true" className="racing-stripe" />
          <p className="hud flex items-center gap-2 text-muted">
            <Plus aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            Every car
          </p>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-fg">
            +{XP_PER_CAR}
            <span className="ml-1.5 text-sm text-muted">XP</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-[0.12em]">
            {RARITIES.map((rarity) => (
              <div key={rarity} className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">{rarityLabel(rarity)}</dt>
                <dd
                  className={cn(
                    'font-bold tabular-nums',
                    rarity === 'common' ? 'text-fg' : 'text-highlight-ink',
                  )}
                >
                  +{RARITY_XP_BONUS[rarity]}
                </dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="group relative overflow-hidden rounded-xl border border-line bg-card p-5 shadow-card">
          <span aria-hidden="true" className="racing-stripe" />
          <p className="hud flex items-center gap-2 text-muted">
            <Sparkles aria-hidden="true" className="h-4 w-4 text-accent-ink" />
            Worked example
          </p>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-fg">
            {formatXp(EXAMPLE_XP)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            One order with a common, a rare and a limited car: {ORDER_BASE_XP} + 3 × {XP_PER_CAR} +{' '}
            {RARITY_XP_BONUS.rare} + {RARITY_XP_BONUS.limited}.
          </p>
        </article>
      </div>

      {/* Rank ladder */}
      <div>
        <h3 className="text-base text-fg sm:text-lg">The rank ladder</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          {MAX_LEVEL} levels, each needing a little more XP than the last. Every few levels earns a
          new rank title.
        </p>
        <ol className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {LEVEL_TITLES.map((rank) => (
            <li
              key={rank.title}
              className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-card lg:flex-col lg:items-start"
            >
              <LevelBadge level={rank.minLevel} size="sm" showLabel={false} />
              <div className="min-w-0">
                <p className="font-display text-xs font-bold tracking-display text-fg">
                  {rank.title}
                </p>
                <p className="hud mt-1 text-muted">
                  Lvl {rank.minLevel} · {formatXp(xpForLevel(rank.minLevel))}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Badges */}
      <div>
        <h3 className="flex items-center gap-2 text-base text-fg sm:text-lg">
          <Trophy aria-hidden="true" className="h-5 w-5 text-accent-ink" />
          Badges = bonus XP
        </h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {BADGES.map((badge) => {
            const ui = BADGE_UI[badge.id];
            const tone = BADGE_TONE_CLASSES[ui.tone];
            const Icon = ui.icon;
            return (
              <li
                key={badge.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4 shadow-card"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-10 w-10 place-items-center rounded-full border-2',
                    tone.border,
                    tone.bg,
                    tone.text,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-xs font-bold tracking-display text-fg">
                    {badge.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted">{badge.requirement}</p>
                </div>
                <p className="hud mt-auto text-fg">+{badge.xpReward} XP</p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Personal status */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        {status === 'signed-in' && profile ? (
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <div className="flex items-center gap-4">
              <LevelBadge level={profile.level} size="md" showTitle />
            </div>
            <div className="min-w-0 flex-1">
              <p className="hud mb-2 text-muted">Your progress, {firstName(profile.displayName)}</p>
              <XpBar xp={profile.xp} />
            </div>
            <Button to={garagePath('achievements')} variant="secondary" rightIcon={<ArrowRight />}>
              My achievements
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted sm:text-base">
              <strong className="font-semibold text-fg">Start at LEVEL 01.</strong> Sign in, park
              the cars you already own and your first order unlocks FIRST RIDE.
            </p>
            <Button to={garagePath()} rightIcon={<ArrowRight />} className="shrink-0">
              Open My Garage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
