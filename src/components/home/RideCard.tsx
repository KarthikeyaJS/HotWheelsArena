import { ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CarImage } from '@/components/product/CarImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { shopPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { padNumber } from '@/lib/format';
import type { HeadlightPosition, RideCard as RideCardData } from './rideCards';
import type { RevPhase } from './useRevSequence';

export interface RideCardProps {
  card: RideCardData;
  phase: RevPhase;
  /** Desktop row: tagline + "EXPLORE" are revealed only when the card expands. */
  collapsible: boolean;
  /** Product counts are still loading (shimmer in the count slot). */
  countLoading: boolean;
  onEngage: (slug: string) => void;
  onRelease: (slug: string) => void;
}

/** Orange "headlights on" glow + short beam at the silhouette's headlight position. */
function HeadlightGlow({ on, position }: { on: boolean; position: HeadlightPosition }) {
  const anchor = { left: `${position.x}%`, top: `${position.y}%` };
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className={cn(
          'absolute h-[34%] w-[62%] origin-left -translate-y-1/2 transition-opacity duration-300',
          on ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          ...anchor,
          backgroundImage: 'linear-gradient(90deg, rgb(var(--accent) / 0.42), transparent 85%)',
          clipPath: 'polygon(0 44%, 100% 0, 100% 100%, 0 56%)',
        }}
      />
      <span
        className={cn(
          'absolute h-[42%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[opacity,transform] duration-300 ease-race',
          on ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
        )}
        style={{
          ...anchor,
          backgroundImage:
            'radial-gradient(closest-side, rgb(var(--accent) / 0.95), rgb(var(--accent) / 0.4) 45%, transparent 100%)',
        }}
      />
      <span
        className={cn(
          'absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface transition-opacity duration-200 dark:bg-fg',
          on ? 'opacity-100' : 'opacity-0',
        )}
        style={anchor}
      />
    </span>
  );
}

/**
 * A "parked car" category card. Pointer hover and keyboard focus run the rev sequence (driven by
 * the parent's `useRevSequence`): engine shake → headlights on → expand. The whole card is one
 * link to the category's shop view (Enter / click).
 */
export const RideCard = memo(function RideCard({
  card,
  phase,
  collapsible,
  countLoading,
  onEngage,
  onRelease,
}: RideCardProps) {
  const Icon = card.icon;
  const engaged = phase !== 'idle';
  const lit = phase === 'lights' || phase === 'expanded';
  const expanded = phase === 'expanded';
  const revealDetails = !collapsible || expanded;
  const bay = padNumber(card.bay);

  return (
    <li
      className="min-w-0 lg:basis-0 lg:transition-[flex-grow] lg:duration-500 lg:ease-race"
      style={{ flexGrow: expanded ? 2.6 : 1 }}
      onMouseEnter={() => onEngage(card.slug)}
      onMouseLeave={() => onRelease(card.slug)}
    >
      <Link
        to={shopPath({ category: card.slug })}
        data-phase={phase}
        data-category={card.slug}
        onFocus={() => onEngage(card.slug)}
        onBlur={() => onRelease(card.slug)}
        className={cn(
          'group relative flex h-full min-h-[15.5rem] flex-col overflow-hidden rounded-xl border bg-card shadow-card transition-[background-color,border-color,box-shadow] duration-300 active:bg-card-hover sm:min-h-[17rem]',
          engaged
            ? 'border-accent/50 bg-card-hover shadow-card-hover'
            : 'border-line hover:border-metal/50',
        )}
      >
        <span aria-hidden="true" className={cn('racing-stripe', engaged && 'is-active')} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-1 top-11 select-none font-display text-6xl font-black leading-none text-fg/[0.035]"
        >
          {bay}
        </span>

        <div className="relative flex items-center justify-between gap-2 px-4 pt-4">
          <span aria-hidden="true" className="hud text-[10px] text-muted">
            Bay {bay}
          </span>
          <span
            aria-hidden="true"
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md border transition-colors duration-300',
              engaged
                ? 'border-accent bg-accent text-on-accent'
                : 'border-line bg-surface text-muted',
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>

        {/* Parking bay with the car. */}
        <div className="relative flex flex-1 items-end px-3 pb-3 pt-4">
          <span aria-hidden="true" className="absolute inset-x-3 bottom-3 h-px bg-line" />
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-3 h-10 w-px bg-gradient-to-t from-fg/25 to-transparent"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-3 h-10 w-px bg-gradient-to-t from-fg/25 to-transparent"
          />
          <span
            className={cn(
              'relative mx-auto block w-full max-w-[22rem] origin-bottom-right transition-transform duration-500 ease-race',
              // Collapsed desktop bays show the car nose-first, cropped like a parked car; it rolls fully into view as the card expands.
              collapsible && !expanded && 'scale-[1.4]',
            )}
          >
            <span className={cn('block', phase === 'rev' && 'engine-shake')}>
              <span className="relative block">
                <CarImage
                  src={card.silhouette}
                  alt=""
                  width={800}
                  height={450}
                  imgClassName={cn(
                    'transition-[filter] duration-300',
                    lit ? 'brightness-110 dark:brightness-150' : 'brightness-100 dark:brightness-125',
                  )}
                />
                <HeadlightGlow on={lit} position={card.headlight} />
              </span>
            </span>
          </span>
        </div>

        <div className="relative px-4 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="truncate text-base text-fg sm:text-lg">{card.name}</h3>
            {card.count !== null ? (
              <span className="hud text-muted">
                {padNumber(card.count)} {card.count === 1 ? 'car' : 'cars'}
              </span>
            ) : countLoading ? (
              <Skeleton className="h-3 w-14 rounded-sm" />
            ) : null}
          </div>
          <div
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-300 ease-race',
              revealDetails ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <p className="mt-1.5 line-clamp-2 text-sm text-muted">{card.tagline}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-hud text-accent-ink">
                Explore
                <ArrowRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
});
