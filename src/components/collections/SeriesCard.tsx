import { ArrowRight, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CarImage } from '@/components/product/CarImage';
import { Skeleton } from '@/components/ui/Skeleton';
import { seriesPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { padNumber, pluralize } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import type { SeriesCardData } from './seriesProgress';
import { SeriesProgressMeter } from './SeriesProgressMeter';

export interface SeriesCardProps {
  data: SeriesCardData;
  /** Garage still loading for a signed-in collector → progress skeleton. */
  progressLoading?: boolean;
  /** Above the fold: eager cover image. */
  priority?: boolean;
  headingAs?: 'h2' | 'h3';
  className?: string;
}

/**
 * Collection card: cover car on a showroom stage, year, name, car count and — for signed-in
 * collectors — "x/y in your garage". The whole card links to the series page (stretched link).
 */
export function SeriesCard({
  data,
  progressLoading = false,
  priority = false,
  headingAs: Heading = 'h2',
  className,
}: SeriesCardProps) {
  const { series, cover, totalCars, progress } = data;
  const href = seriesPath(series.slug);

  return (
    <article
      className={cn(
        'group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card',
        'transition-[background-color,border-color,box-shadow] duration-300 ease-race focus-within:bg-card-hover hover:border-fg/20 hover:bg-card-hover hover:shadow-card-hover',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe z-10" />

      {/* Showroom stage */}
      <div className="relative aspect-[16/9] overflow-hidden border-b border-line bg-surface">
        <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 opacity-80" />
        <span
          aria-hidden="true"
          className="absolute inset-x-[15%] bottom-[8%] top-[20%] rounded-full bg-[radial-gradient(ellipse_at_50%_60%,rgb(var(--accent)/0.14),transparent_70%)] blur-xl transition-opacity duration-500 group-hover:opacity-100"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-[14%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-md dark:bg-black/60"
        />
        {cover ? (
          <CarImage
            image={primaryImageOf(cover)}
            alt=""
            width={640}
            height={360}
            sizes="(min-width: 1280px) 400px, (min-width: 768px) 46vw, 92vw"
            priority={priority}
            aspectBox={false}
            className="absolute inset-[6%_10%]"
            imgClassName="transition-transform duration-700 ease-race group-hover:-translate-x-1 group-hover:scale-[1.05] group-focus-within:scale-[1.05]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center text-muted [&_svg]:h-10 [&_svg]:w-10"
          >
            <Layers />
          </span>
        )}
        <span className="absolute left-4 top-4 rounded border border-line bg-bg/80 px-2 py-1 font-mono text-xs font-bold tabular-nums tracking-[0.12em] text-fg backdrop-blur-sm">
          {series.year}
        </span>
        <span className="absolute right-4 top-4 rounded border border-line bg-bg/80 px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-fg backdrop-blur-sm">
          {padNumber(totalCars)} cars
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="hud text-muted">
          {series.year} series · {pluralize(totalCars, 'car')}
        </p>
        <Heading className="font-display text-lg font-bold uppercase leading-tight tracking-display text-fg sm:text-xl">
          <Link
            to={href}
            className="rounded-sm outline-none after:absolute after:inset-0 after:z-0 after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
          >
            {series.name}
          </Link>
        </Heading>
        {series.description ? (
          <p className="line-clamp-2 text-sm leading-6 text-muted">{series.description}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-4 pt-2">
          {progressLoading ? (
            <div aria-hidden="true" className="flex flex-col gap-2">
              <Skeleton variant="text" className="w-32" />
              <Skeleton className="h-1.5 rounded-full" />
            </div>
          ) : progress && progress.total > 0 ? (
            <SeriesProgressMeter progress={progress} seriesName={series.name} />
          ) : null}
          <p
            aria-hidden="true"
            className="hud flex items-center gap-2 text-fg transition-colors duration-200 group-hover:text-accent-ink"
          >
            View series
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </p>
        </div>
      </div>
    </article>
  );
}
