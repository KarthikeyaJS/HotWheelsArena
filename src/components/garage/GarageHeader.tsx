import { Plus, ReceiptText } from 'lucide-react';
import { useMemo } from 'react';
import { GridBackground } from '@/components/effects/GridBackground';
import { HudPanel } from '@/components/effects/HudPanel';
import { RacingLines } from '@/components/effects/RacingLines';
import { Tachometer } from '@/components/effects/Tachometer';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';
import { levelTitle, xpProgress } from '@/config/gamification';
import { ROUTES } from '@/config/routes';
import { formatDate, formatLevel, formatNumber, firstName } from '@/lib/format';
import { progressToRpm, type DashboardStats } from './garageModel';

export interface GarageHeaderProps {
  displayName: string | null;
  photoURL: string | null;
  xp: number;
  memberSince: number | null;
  stats: DashboardStats;
  /** Profile (XP / level) still loading. */
  profileLoading: boolean;
  /** Garage numbers still loading. */
  statsLoading: boolean;
  onAddCar: () => void;
}

/**
 * Collector dashboard header: avatar, "WELCOME BACK, {FIRSTNAME}" (the page's h1), level badge,
 * XP bar, mono readouts (`CARS 12 · SERIES 1 · XP 1,240`) and a decorative tachometer that
 * revs with level progress.
 */
export function GarageHeader({
  displayName,
  photoURL,
  xp,
  memberSince,
  stats,
  profileLoading,
  statsLoading,
  onAddCar,
}: GarageHeaderProps) {
  const progress = useMemo(() => xpProgress(xp), [xp]);
  const name = firstName(displayName);
  const readouts = [
    { label: 'Cars', value: formatNumber(stats.carsOwned), loading: statsLoading },
    { label: 'Series', value: formatNumber(stats.seriesCompleted), loading: statsLoading },
    { label: 'XP', value: formatNumber(progress.xp), loading: profileLoading },
  ];

  return (
    <section
      aria-labelledby="garage-title"
      className="relative isolate overflow-hidden border-b border-line bg-surface/60"
    >
      <GridBackground className="-z-10 opacity-70" />
      <RacingLines count={2} className="-z-10 opacity-60" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--accent)/0.12),transparent_70%)]"
      />

      <Container className="py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
            <div className="flex items-center gap-4 sm:gap-5">
              <span className="relative shrink-0">
                <UserAvatar
                  name={displayName}
                  photoURL={photoURL}
                  size="lg"
                  className="h-16 w-16 text-base ring-2 ring-accent/70 ring-offset-2 ring-offset-bg sm:h-20 sm:w-20 sm:text-xl"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-bg bg-success"
                />
              </span>
              <div className="min-w-0">
                <p className="eyebrow">Collector dashboard // pit lane</p>
                <h1
                  id="garage-title"
                  className="mt-2 break-words font-display text-2xl font-black uppercase leading-[1.05] tracking-display text-fg sm:text-4xl lg:text-5xl"
                >
                  Welcome back, <span className="text-accent-ink">{name}</span>
                </h1>
                <p className="hud mt-2 text-muted">
                  {profileLoading ? 'Syncing profile…' : levelTitle(progress.level)}
                  {memberSince != null ? (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="sr-only">, </span>
                      Member since {formatDate(memberSince)}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-line bg-card/80 p-4 shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:gap-6 sm:p-5">
              {profileLoading ? (
                <>
                  <Skeleton variant="circle" className="h-20 w-20 shrink-0" />
                  <div className="flex flex-1 flex-col gap-3">
                    <Skeleton className="h-4 w-1/3 rounded-sm" />
                    <Skeleton className="h-2.5 w-full rounded-full" />
                    <Skeleton className="h-3 w-1/4 rounded-sm" />
                  </div>
                </>
              ) : (
                <>
                  <LevelBadge level={progress.level} size="lg" showLabel={false} />
                  <XpBar xp={progress.xp} className="min-w-0 flex-1" />
                </>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm font-bold uppercase tracking-hud text-fg">
                {readouts.map((item, index) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-fg/25">
                        ·
                      </span>
                    ) : null}
                    <dt className="text-muted">{item.label}</dt>
                    <dd className="tabular-nums">
                      {item.loading ? (
                        <Skeleton className="inline-block h-3 w-8 rounded-sm align-middle" />
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button size="sm" leftIcon={<Plus />} onClick={onAddCar}>
                  Add a car
                </Button>
                <Button size="sm" variant="outline" leftIcon={<ReceiptText />} to={ROUTES.orders}>
                  Your orders
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden sm:block lg:col-span-4">
            <HudPanel
              title="Telemetry"
              meta={
                progress.isMax
                  ? 'MAX LEVEL'
                  : `${formatLevel(progress.level)} → ${formatLevel(progress.level + 1)}`
              }
              className="mx-auto max-w-sm"
            >
              <div className="flex flex-col items-center gap-3">
                <Tachometer rpm={progressToRpm(progress.pct)} size="md" />
                <div className="grid w-full grid-cols-2 gap-3 border-t border-line pt-3 text-center">
                  <p className="hud text-[10px] text-muted">
                    To next level
                    <span className="mt-1 block font-mono text-base font-bold tracking-normal text-fg">
                      {progress.isMax ? '—' : formatNumber(progress.toNext)}
                    </span>
                  </p>
                  <p className="hud text-[10px] text-muted">
                    Unique models
                    <span className="mt-1 block font-mono text-base font-bold tracking-normal text-fg">
                      {formatNumber(stats.uniqueCars)}
                    </span>
                  </p>
                </div>
              </div>
            </HudPanel>
          </div>
        </div>
      </Container>
    </section>
  );
}
