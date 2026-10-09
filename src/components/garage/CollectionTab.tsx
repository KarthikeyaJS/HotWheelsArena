import { Car, Copy, Plus, Star, Warehouse } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { DataState } from '@/components/common/DataState';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { shopPath } from '@/config/routes';
import { pluralize } from '@/lib/format';
import type { Product } from '@/types';
import { DuplicatesPanel } from './DuplicatesPanel';
import { GarageCarGrid } from './GarageCarGrid';
import { GarageGridSkeleton } from './GarageGridSkeleton';
import {
  COLLECTION_FILTERS,
  COLLECTION_SORTS,
  filterCars,
  findDuplicates,
  isCollectionSort,
  seriesProgressList,
  sortCars,
  type CollectionFilter,
  type CollectionSort,
  type GarageCarView,
} from './garageModel';
import { MissingModelsPanel } from './MissingModelsPanel';
import type { GarageDashboard } from './useGarageDashboard';

export interface CollectionTabProps {
  dashboard: GarageDashboard;
  onRemove: (car: GarageCarView) => void;
  onAddCar: () => void;
  onHaveIt: (product: Product) => void;
}

const FILTER_ICONS: Readonly<Record<CollectionFilter, typeof Car>> = {
  all: Car,
  favorites: Star,
  duplicates: Copy,
};

/**
 * COLLECTION: filter (all / favorites / duplicates) + sort toolbar with ADD A CAR, the garage
 * grid, then the DUPLICATES TRACKER and MISSING MODELS PER SERIES panels.
 */
export function CollectionTab({ dashboard, onRemove, onAddCar, onHaveIt }: CollectionTabProps) {
  const [filter, setFilter] = useState<CollectionFilter>('all');
  const [sort, setSort] = useState<CollectionSort>('recent');
  const filterGroupRef = useRef<HTMLDivElement>(null);
  const { cars, ownedIds, seriesList, catalogueById } = dashboard;

  const counts = useMemo(
    () => ({
      all: cars.length,
      favorites: filterCars(cars, 'favorites').length,
      duplicates: filterCars(cars, 'duplicates').length,
    }),
    [cars],
  );
  const visible = useMemo(() => sortCars(filterCars(cars, filter), sort), [cars, filter, sort]);
  const duplicates = useMemo(() => findDuplicates(cars), [cars]);
  const seriesRows = useMemo(
    () => seriesProgressList(seriesList, ownedIds, catalogueById, { startedOnly: true }),
    [seriesList, ownedIds, catalogueById],
  );

  return (
    <DataState
      isLoading={dashboard.isLoading}
      isError={dashboard.isError}
      error={dashboard.error}
      onRetry={dashboard.refetch}
      isEmpty={cars.length === 0}
      loadingLabel="Rolling your cars out of the garage…"
      skeleton={<GarageGridSkeleton />}
      empty={
        <EmptyState
          size="lg"
          titleAs="h2"
          icon={<Warehouse />}
          title="Your garage is empty — every legend starts with one car"
          description="Park cars you already own, or grab your first ride from the shop. Purchases are parked here automatically."
          action={
            <>
              <Button to={shopPath()} size="lg">
                Explore the garage
              </Button>
              <Button variant="outline" size="lg" leftIcon={<Plus />} onClick={onAddCar}>
                Add a car
              </Button>
            </>
          }
        />
      }
    >
      {() => (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="garage-collection-title" className="flex flex-col gap-5">
            <h2 id="garage-collection-title" className="sr-only">
              Your collection
            </h2>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div
                ref={filterGroupRef}
                role="group"
                aria-label="Filter collection"
                className="flex flex-wrap gap-2"
              >
                {COLLECTION_FILTERS.map((option) => {
                  const Icon = FILTER_ICONS[option.id];
                  return (
                    <Chip
                      key={option.id}
                      size="lg"
                      icon={<Icon />}
                      selected={filter === option.id}
                      onClick={() => setFilter(option.id)}
                    >
                      {option.label} · {counts[option.id]}
                    </Chip>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <label htmlFor="garage-collection-sort" className="hud shrink-0 text-muted">
                    Sort
                  </label>
                  <Select
                    id="garage-collection-sort"
                    value={sort}
                    onChange={(event) => {
                      const next = event.currentTarget.value;
                      if (isCollectionSort(next)) setSort(next);
                    }}
                    options={COLLECTION_SORTS}
                    size="sm"
                    containerClassName="flex-1 sm:w-56"
                  />
                </div>
                <Button size="md" leftIcon={<Plus />} onClick={onAddCar}>
                  Add a car
                </Button>
              </div>
            </div>
            <p className="hud text-muted" aria-live="polite">
              Showing {pluralize(visible.length, 'car')}
              {filter !== 'all' ? ` · ${filter}` : ''}
            </p>

            {visible.length === 0 ? (
              <EmptyState
                icon={filter === 'favorites' ? <Star /> : <Copy />}
                title={filter === 'favorites' ? 'No favorites yet' : 'No duplicates yet'}
                description={
                  filter === 'favorites'
                    ? 'Tap the star on any car to pin it to your favorites.'
                    : 'Own a car twice? Use the copies stepper on its card to log the spare.'
                }
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilter('all');
                      // This button unmounts with the empty state — keep focus on the ALL chip.
                      filterGroupRef.current?.querySelector<HTMLElement>('button')?.focus();
                    }}
                  >
                    Show all cars
                  </Button>
                }
              />
            ) : (
              <GarageCarGrid
                cars={visible}
                onRemove={onRemove}
                label={`Garage cars, ${filter}`}
                priorityCount={4}
              />
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <ErrorBoundary label="Duplicates tracker">
              <DuplicatesPanel
                rows={duplicates}
                className="lg:sticky lg:top-24 lg:col-span-5 lg:self-start xl:col-span-4"
              />
            </ErrorBoundary>
            <ErrorBoundary label="Missing models">
              <MissingModelsPanel
                rows={seriesRows}
                isLoading={dashboard.seriesLoading}
                error={dashboard.seriesError}
                onRetry={dashboard.refetchSeries}
                onHaveIt={onHaveIt}
                className="lg:col-span-7 xl:col-span-8"
              />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </DataState>
  );
}
