import { HudPanel } from '@/components/effects/HudPanel';
import { HudReadout } from '@/components/ui/HudReadout';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber } from '@/lib/format';
import { isRare } from '@/lib/product';
import type { Product, Series } from '@/types';
import { seriesTotalCars } from './seriesProgress';

export interface SeriesFactsPanelProps {
  series: Series;
  cars: readonly Product[];
  className?: string;
}

/** Series HUD: year, car count, rare castings and the entry price. */
export function SeriesFactsPanel({ series, cars, className }: SeriesFactsPanelProps) {
  const rareCount = cars.filter((car) => isRare(car)).length;
  const fromPrice = cars.length > 0 ? Math.min(...cars.map((car) => car.price)) : null;

  return (
    <HudPanel
      title="Series spec"
      meta={`${formatNumber(cars.length)} in shop`}
      className={cn('bg-card', className)}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <HudReadout label="Year" value={series.year} />
        <HudReadout label="Cars" value={formatNumber(seriesTotalCars(series))} />
        <HudReadout
          label="Rare+"
          value={formatNumber(rareCount)}
          tone={rareCount > 0 ? 'highlight' : 'default'}
        />
        <HudReadout label="From" value={fromPrice === null ? '—' : formatINR(fromPrice)} />
      </div>
    </HudPanel>
  );
}
