import { Star } from 'lucide-react';
import { useMemo } from 'react';
import { DataState } from '@/components/common/DataState';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatINR, pluralize } from '@/lib/format';
import { GarageCarGrid } from './GarageCarGrid';
import { GarageGridSkeleton } from './GarageGridSkeleton';
import { collectionValue, filterCars, sortCars, type GarageCarView } from './garageModel';
import type { GarageDashboard } from './useGarageDashboard';

export interface FavoritesTabProps {
  dashboard: GarageDashboard;
  onRemove: (car: GarageCarView) => void;
  /** Switch to the collection tab (empty-state CTA). */
  onShowCollection: () => void;
}

/** FAVORITES: the garage cars marked with a star, newest first. */
export function FavoritesTab({ dashboard, onRemove, onShowCollection }: FavoritesTabProps) {
  const favorites = useMemo(
    () => sortCars(filterCars(dashboard.cars, 'favorites'), 'recent'),
    [dashboard.cars],
  );
  const value = useMemo(() => collectionValue(favorites), [favorites]);

  return (
    <DataState
      isLoading={dashboard.isLoading}
      isError={dashboard.isError}
      error={dashboard.error}
      onRetry={dashboard.refetch}
      isEmpty={favorites.length === 0}
      loadingLabel="Loading your favorites…"
      skeleton={<GarageGridSkeleton count={4} />}
      empty={
        <EmptyState
          size="lg"
          titleAs="h2"
          icon={<Star />}
          title="No favorites on the podium yet"
          description="Tap the star on any car in your collection to pin it here — your personal hall of fame."
          action={
            <Button onClick={onShowCollection} size="lg">
              Go to your collection
            </Button>
          }
        />
      }
    >
      {() => (
        <section aria-labelledby="garage-favorites-title" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2
              id="garage-favorites-title"
              className="font-display text-lg font-bold uppercase tracking-display text-fg"
            >
              Your podium
            </h2>
            <p className="hud text-muted">
              {pluralize(favorites.length, 'favorite')} · worth{' '}
              <span className="font-bold text-fg">{formatINR(value)}</span>
            </p>
          </div>
          <GarageCarGrid cars={favorites} onRemove={onRemove} label="Favorite cars" />
        </section>
      )}
    </DataState>
  );
}
