import { ArrowRight, Copy, Layers, Trophy, Warehouse, type LucideIcon } from 'lucide-react';
import { DataState } from '@/components/common/DataState';
import { HudPanel } from '@/components/effects/HudPanel';
import { Speedometer } from '@/components/effects/Speedometer';
import { Button } from '@/components/ui/Button';
import { HudReadout } from '@/components/ui/HudReadout';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { garagePath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useGarageCars } from '@/hooks/useGarage';
import { cn } from '@/lib/cn';
import { firstName, formatINR, formatNumber, padNumber } from '@/lib/format';
import {
  garageDialMax,
  garageTeaserStats,
  SAMPLE_GARAGE_STATS,
  type GarageTeaserStats,
} from './garageTeaser';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';
import { useGarageNavigation } from './useGarageNavigation';

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
}

const FEATURES: readonly Feature[] = [
  {
    icon: Warehouse,
    title: 'Park every casting',
    text: 'Add cars you own in one tap — purchases park themselves.',
  },
  {
    icon: Layers,
    title: 'Complete the series',
    text: 'See exactly which models are missing from each series.',
  },
  {
    icon: Copy,
    title: 'Track duplicates',
    text: 'Doubles, triples and trade bait, counted per car.',
  },
  { icon: Trophy, title: 'Level up', text: 'Earn XP and unlock badges as the garage grows.' },
];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

function StatsGrid({ stats }: { stats: GarageTeaserStats }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
      {[
        { label: 'Cars owned', value: formatNumber(stats.carsOwned) },
        { label: 'Series completed', value: formatNumber(stats.seriesCompleted) },
        {
          label: 'Collection value',
          value:
            stats.collectionValue === null ? (
              <Skeleton className="h-7 w-24 rounded-sm" />
            ) : (
              formatINR(stats.collectionValue)
            ),
        },
        { label: 'Level', value: padNumber(stats.level), tone: 'accent' as const },
      ].map((stat) => (
        <HudReadout
          key={stat.label}
          label={stat.label}
          value={stat.value}
          tone={stat.tone ?? 'default'}
          className="min-w-0"
        />
      ))}
    </div>
  );
}

/**
 * BUILD YOUR GARAGE — virtual-garage teaser. Visitors see a demo garage; signed-in collectors
 * see their real numbers (profile stats + live collection value). The CTA opens My Garage, via
 * the Google sign-in prompt when signed out.
 */
export function GarageTeaserSection() {
  const { status, profile, isProfileLoading } = useAuth();
  const { signedIn, openGarage } = useGarageNavigation();
  const garage = useGarageCars();
  const headingId = sectionHeadingId(HOME_SECTION_IDS.garage);

  const resolving = status === 'loading' || (signedIn && (isProfileLoading || !profile));
  const panelTitle =
    signedIn && profile ? `${firstName(profile.displayName)}'s garage` : 'Sample garage';
  const stats: GarageTeaserStats =
    signedIn && profile
      ? garageTeaserStats(profile, garage.isLoading || garage.isError ? null : garage.cars)
      : SAMPLE_GARAGE_STATS;

  return (
    <HomeSection id={HOME_SECTION_IDS.garage}>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-6">
          <SectionHeading
            id={headingId}
            index={6}
            eyebrow="Virtual garage"
            title="Build your garage"
            description="Your collection, digitised. Every car you own gets a bay, every series a progress bar, every milestone some XP."
          />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent-ink"
                >
                  <feature.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-fg">{feature.title}</span>
                  <span className="block text-sm text-muted">{feature.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
            {signedIn ? (
              <Button size="lg" to={garagePath()} rightIcon={<ArrowRight />}>
                Build your garage
              </Button>
            ) : (
              <Button
                size="lg"
                rightIcon={<ArrowRight />}
                onClick={() => openGarage(undefined, 'Sign in with Google to build your garage.')}
              >
                Build your garage
              </Button>
            )}
            <p className="hud text-muted">
              {signedIn ? 'Your garage is synced' : 'Free · sign in with Google'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-6">
          <HudPanel
            as="section"
            aria-label={signedIn ? 'Your garage status' : 'Sample garage status'}
            title={<span title={panelTitle}>{panelTitle}</span>}
            meta={
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 rounded-full', signedIn ? 'bg-success' : 'bg-metal')}
                />
                {signedIn ? 'Live' : 'Demo data'}
              </span>
            }
            padding="lg"
            // p-5 below 640px: at 320px the title and the meta fit on one line without truncating.
            className="overflow-hidden bg-surface/80 p-5 shadow-card sm:p-8"
          >
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
              <Speedometer
                value={resolving ? 0 : stats.carsOwned}
                max={garageDialMax(stats.carsOwned)}
                label="GARAGE"
                unit="CARS"
                size="md"
                className="shrink-0"
              />
              <div className="w-full min-w-0 flex-1">
                <DataState
                  isLoading={resolving}
                  isError={signedIn && garage.isError}
                  error={garage.error}
                  onRetry={garage.refetch}
                  errorTitle="Garage telemetry lost"
                  errorCompact
                  skeleton={<StatsSkeleton />}
                  loadingLabel="Reading garage telemetry…"
                >
                  <StatsGrid stats={stats} />
                </DataState>
              </div>
            </div>
            <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
              {signedIn
                ? 'Numbers update live as you park cars and complete series.'
                : 'This is a sample garage. Sign in to start tracking your own collection.'}
            </p>
          </HudPanel>
        </div>
      </div>
    </HomeSection>
  );
}
