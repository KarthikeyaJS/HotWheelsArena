import { Car, Heart, IndianRupee, Layers, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber, pluralize } from '@/lib/format';
import type { DashboardStats } from './garageModel';

export interface GarageStatsStripProps {
  stats: DashboardStats;
  isLoading: boolean;
  className?: string;
}

interface Tile {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent?: boolean;
}

/** Five headline numbers: cars owned, series completed, wishlist, favorites, collection value. */
export function GarageStatsStrip({ stats, isLoading, className }: GarageStatsStripProps) {
  const tiles: Tile[] = [
    {
      id: 'cars',
      label: 'Cars owned',
      value: formatNumber(stats.carsOwned),
      detail: `${pluralize(stats.uniqueCars, 'model')}${stats.spares > 0 ? ` · ${pluralize(stats.spares, 'spare')}` : ''}`,
      icon: <Car />,
    },
    {
      id: 'series',
      label: 'Series completed',
      value: formatNumber(stats.seriesCompleted),
      detail: `of ${pluralize(stats.seriesTotal, 'series', 'series')}`,
      icon: <Layers />,
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      value: formatNumber(stats.wishlist),
      detail: stats.wishlist === 1 ? 'car on the radar' : 'cars on the radar',
      icon: <Heart />,
    },
    {
      id: 'favorites',
      label: 'Favorites',
      value: formatNumber(stats.favorites),
      detail: 'on the podium',
      icon: <Star />,
    },
    {
      id: 'value',
      label: 'Collection value',
      value: formatINR(stats.value),
      detail: 'at current prices',
      icon: <IndianRupee />,
      accent: true,
    },
  ];

  return (
    <section
      aria-label="Garage stats"
      className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5', className)}
    >
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className={cn(
            'group relative flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-line bg-card p-4 shadow-card',
            tile.accent && 'col-span-2 md:col-span-1',
          )}
        >
          {tile.accent ? (
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <span className="hud text-muted">{tile.label}</span>
            <span
              aria-hidden="true"
              className={cn('[&_svg]:h-4 [&_svg]:w-4', tile.accent ? 'text-accent' : 'text-muted')}
            >
              {tile.icon}
            </span>
          </div>
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-16 rounded-sm" />
              <Skeleton className="h-2.5 w-20 rounded-sm" />
            </>
          ) : (
            <>
              <span
                className={cn(
                  'truncate font-mono text-2xl font-bold tabular-nums leading-none tracking-tight',
                  tile.accent ? 'text-accent-ink' : 'text-fg',
                )}
              >
                {tile.value}
              </span>
              <span className="truncate text-xs text-muted">{tile.detail}</span>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
