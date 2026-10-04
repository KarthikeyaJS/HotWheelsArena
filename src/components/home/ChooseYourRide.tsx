import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { Button } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { CATEGORY_ORDER } from '@/config/site';
import { shopPath } from '@/config/routes';
import { useCategories } from '@/hooks/useCategories';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useProducts } from '@/hooks/useProducts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSound } from '@/hooks/useSound';
import { HomeSection } from './HomeSection';
import { HOME_SECTION_IDS, sectionHeadingId } from './homeSections';
import { RideCard } from './RideCard';
import { buildRideCards } from './rideCards';
import { useRevSequence } from './useRevSequence';

const LIST_CLASSES = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:flex lg:h-[24rem] lg:gap-3';

function RideSkeleton() {
  return (
    <ul className={LIST_CLASSES} aria-hidden="true">
      {CATEGORY_ORDER.map((slug) => (
        <li key={slug} className="min-w-0 lg:flex-1">
          <div className="flex h-full min-h-[15.5rem] flex-col gap-4 rounded-xl border border-line bg-card p-4 sm:min-h-[17rem]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12 rounded-sm" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="mt-auto aspect-[16/9] w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-sm" />
            <Skeleton className="h-3 w-1/3 rounded-sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * CHOOSE YOUR RIDE — the six classes as parked cars. Hover or keyboard focus: engine rev
 * (1–2px shake + optional rev sound) → headlights glow → the card expands (desktop row).
 * Click / Enter opens the class in the shop. Categories come from Firestore (ordered by
 * `order`) with `CATEGORY_DISPLAY` as the fallback; counts are live from the catalogue.
 */
export function ChooseYourRide() {
  const categories = useCategories();
  const products = useProducts();
  const isDesktop = useIsDesktop();
  const reducedMotion = useReducedMotion();
  const play = useSound();
  const expand = isDesktop && !reducedMotion;

  const cards = useMemo(
    () => buildRideCards(categories.data, products.data),
    [categories.data, products.data],
  );
  const rev = useRevSequence({ expand, reducedMotion, onRev: () => play('rev') });
  const headingId = sectionHeadingId(HOME_SECTION_IDS.collection);

  return (
    <HomeSection id={HOME_SECTION_IDS.collection}>
      <SectionHeading
        id={headingId}
        index={2}
        eyebrow="The line-up"
        title="Choose your ride"
        description="Six classes, parked and fuelled. Hover a bay to fire up the engine, then pick a class to see every car in it."
        action={
          <Button variant="outline" to={shopPath()} rightIcon={<ArrowRight />}>
            All cars
          </Button>
        }
      />
      <div className="mt-10 lg:mt-12">
        {/* Category errors fall back to the built-in classes, so only loading is surfaced. */}
        <DataState
          isLoading={categories.isLoading}
          isError={false}
          skeleton={<RideSkeleton />}
          loadingLabel="Rolling the cars out…"
        >
          {() => (
            <ul className={LIST_CLASSES} aria-label="Car classes">
              {cards.map((card) => (
                <RideCard
                  key={card.slug}
                  card={card}
                  phase={rev.phaseOf(card.slug)}
                  collapsible={expand}
                  countLoading={products.isLoading}
                  onEngage={rev.engage}
                  onRelease={rev.release}
                />
              ))}
            </ul>
          )}
        </DataState>
      </div>
    </HomeSection>
  );
}
