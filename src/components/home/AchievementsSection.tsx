import { ArrowRight } from 'lucide-react';
import { DataState } from '@/components/common/DataState';
import { HudPanel } from '@/components/effects/HudPanel';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { XpBar } from '@/components/gamification/XpBar';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { BADGES, EMPTY_USER_STATS, levelForXp } from '@/config/gamification';
import { garagePath } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import type { BadgeId } from '@/types';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';
import { useGarageNavigation } from './useGarageNavigation';

/** Signed-out preview: LEVEL 07 · 1,240 XP. */
export const SAMPLE_XP = 1240;
const NO_BADGES: readonly BadgeId[] = [];

function AchievementsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-6 rounded-md border border-line bg-surface/70 p-6 sm:flex-row sm:items-center">
        <Skeleton variant="circle" className="h-20 w-20" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-40 rounded-sm" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {BADGES.map((badge) => (
          <Skeleton key={badge.id} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * COLLECTOR ACHIEVEMENTS — badge showcase + level / XP preview. Signed in: the collector's real
 * level, XP and badge progress (`badgeProgress(profile.stats)` inside BadgeGrid). Signed out:
 * every badge locked with its requirement, and a sample LEVEL 07 · 1,240 XP bar.
 */
export function AchievementsSection() {
  const { status, profile, isProfileLoading } = useAuth();
  const { signedIn, openGarage } = useGarageNavigation();
  const headingId = sectionHeadingId(HOME_SECTION_IDS.achievements);

  const resolving = status === 'loading' || (signedIn && (isProfileLoading || !profile));
  const live = signedIn && profile !== null;
  const xp = live ? profile.xp : SAMPLE_XP;
  const level = live ? profile.level : levelForXp(SAMPLE_XP);
  const unlocked = live ? profile.badges : NO_BADGES;
  const stats = live ? profile.stats : EMPTY_USER_STATS;

  const cta = signedIn ? (
    <Button variant="outline" to={garagePath('achievements')} rightIcon={<ArrowRight />}>
      View achievements
    </Button>
  ) : (
    <Button
      variant="outline"
      rightIcon={<ArrowRight />}
      onClick={() =>
        openGarage('achievements', 'Sign in with Google to start earning XP and badges.')
      }
    >
      Start earning XP
    </Button>
  );

  return (
    <HomeSection id={HOME_SECTION_IDS.achievements}>
      <SectionHeading
        id={headingId}
        index={7}
        eyebrow="Collector achievements"
        title="Earn your stripes"
        description="Every order and every parked car earns XP. Hit the milestones to unlock badges and climb from Rookie to Arena Champion."
        action={cta}
      />
      <div className="mt-8 lg:mt-10">
        <DataState
          isLoading={resolving}
          isError={false}
          skeleton={<AchievementsSkeleton />}
          loadingLabel="Loading your trophy cabinet…"
        >
          {() => (
            <div className="flex flex-col gap-6">
              <HudPanel
                as="section"
                aria-label={live ? 'Your collector level' : 'Collector level preview'}
                title={live ? 'Your collector level' : 'Level preview'}
                meta={live ? `${unlocked.length}/${BADGES.length} badges` : 'Sample progress'}
                padding="lg"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
                  <LevelBadge level={level} size="lg" showTitle />
                  <div className="min-w-0 flex-1">
                    <XpBar xp={xp} />
                    <p className="mt-3 text-sm text-muted">
                      {live
                        ? 'Keep parking cars and completing series to reach the next level.'
                        : 'Preview of a collector at LEVEL 07. Sign in and your own progress appears here.'}
                    </p>
                  </div>
                </div>
              </HudPanel>
              <BadgeGrid unlocked={unlocked} stats={stats} columns={5} />
            </div>
          )}
        </DataState>
      </div>
    </HomeSection>
  );
}
