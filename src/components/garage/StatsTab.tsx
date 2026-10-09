import { Clock, Crown } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DataState } from '@/components/common/DataState';
import { HudPanel } from '@/components/effects/HudPanel';
import { CarImage } from '@/components/product/CarImage';
import { HudReadout } from '@/components/ui/HudReadout';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { productPath, seriesPath } from '@/config/routes';
import { isRareRarity } from '@/config/gamification';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatNumber, formatRelative } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import { BreakdownBars } from './BreakdownBars';
import {
  carName,
  carValue,
  categoryBreakdown,
  mostValuable,
  rarityBreakdown,
  recentlyAdded,
  seriesProgressList,
} from './garageModel';
import type { GarageDashboard } from './useGarageDashboard';

export interface StatsTabProps {
  dashboard: GarageDashboard;
}

const rarityTone = (key: string): string => (isRareRarity(key) ? 'bg-highlight' : 'bg-metal');

const TILE = 'rounded-lg border border-line bg-card p-4 shadow-card';

function StatsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-[76px] rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-xl lg:col-span-5" />
        <Skeleton className="h-80 rounded-xl lg:col-span-7" />
      </div>
    </div>
  );
}

/**
 * STATS: telemetry readouts, recently added (top 5), completion of every series, and pure-CSS
 * category / rarity breakdowns weighted by copies owned.
 */
export function StatsTab({ dashboard }: StatsTabProps) {
  const { cars, stats, seriesList, ownedIds, catalogueById } = dashboard;
  const recent = useMemo(() => recentlyAdded(cars, 5), [cars]);
  const series = useMemo(
    () => seriesProgressList(seriesList, ownedIds, catalogueById),
    [seriesList, ownedIds, catalogueById],
  );
  const categories = useMemo(() => categoryBreakdown(cars), [cars]);
  const rarities = useMemo(() => rarityBreakdown(cars), [cars]);
  const top = useMemo(() => mostValuable(cars), [cars]);
  const empty = cars.length === 0;

  return (
    <DataState
      isLoading={dashboard.isLoading}
      isError={dashboard.isError}
      error={dashboard.error}
      onRetry={dashboard.refetch}
      loadingLabel="Crunching your garage telemetry…"
      skeleton={<StatsSkeleton />}
    >
      {() => (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="garage-telemetry-title">
            <h2 id="garage-telemetry-title" className="sr-only">
              Collection telemetry
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <HudReadout
                label="Cars owned"
                value={formatNumber(stats.carsOwned)}
                className={TILE}
              />
              <HudReadout
                label="Unique models"
                value={formatNumber(stats.uniqueCars)}
                className={TILE}
              />
              <HudReadout
                label="Series completed"
                value={`${formatNumber(stats.seriesCompleted)}/${formatNumber(stats.seriesTotal)}`}
                className={TILE}
              />
              <HudReadout label="Wishlist" value={formatNumber(stats.wishlist)} className={TILE} />
              <HudReadout
                label="Favorites"
                value={formatNumber(stats.favorites)}
                className={TILE}
              />
              <HudReadout label="Spares" value={formatNumber(stats.spares)} className={TILE} />
              <HudReadout
                label="Total value"
                value={formatINR(stats.value)}
                tone="accent"
                className={TILE}
              />
              <div className={cn(TILE, 'flex min-w-0 flex-col gap-1')}>
                <span className="hud text-muted">Most valuable</span>
                {top && top.product ? (
                  <>
                    <span className="truncate text-sm font-semibold text-fg" title={carName(top)}>
                      {carName(top)}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {formatINR(carValue(top))}
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-lg font-bold text-muted">—</span>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <HudPanel
              as="section"
              aria-labelledby="garage-recent-title"
              className="lg:col-span-5"
              meta="TOP 5"
            >
              <h2
                id="garage-recent-title"
                className="mb-3 font-display text-base font-bold uppercase tracking-display text-fg"
              >
                Recently added
              </h2>
              {empty ? (
                <p className="flex items-center gap-2 py-6 text-sm text-muted">
                  <Clock aria-hidden="true" className="h-4 w-4" />
                  Nothing parked yet — your latest additions land here.
                </p>
              ) : (
                <ol className="flex flex-col divide-y divide-line">
                  {recent.map((car, index) => {
                    const image = car.product ? primaryImageOf(car.product) : null;
                    return (
                      <li key={car.entry.productId} className="flex items-center gap-3 py-2.5">
                        <span className="w-5 shrink-0 font-mono text-xs font-bold tabular-nums text-muted">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <CarImage
                          image={image}
                          src={image ? undefined : FALLBACK_CAR_IMAGE}
                          alt=""
                          width={80}
                          height={50}
                          className={cn('w-14 shrink-0', car.retired && 'opacity-60 grayscale')}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold text-fg"
                            title={carName(car)}
                          >
                            {car.product && !car.retired ? (
                              <Link
                                to={productPath(car.product.slug)}
                                className="rounded-sm transition-colors hover:text-accent-ink"
                              >
                                {carName(car)}
                              </Link>
                            ) : (
                              carName(car)
                            )}
                          </p>
                          <p className="hud mt-0.5 text-xs text-muted">
                            {car.entry.source === 'purchase' ? 'Purchased' : 'Manual'}
                            {car.entry.addedAt != null ? (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="sr-only">, </span>
                                <time
                                  dateTime={new Date(car.entry.addedAt).toISOString()}
                                  title={formatDate(car.entry.addedAt, true)}
                                >
                                  {formatRelative(car.entry.addedAt)}
                                </time>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </HudPanel>

            <HudPanel
              as="section"
              aria-labelledby="garage-series-title"
              className="lg:col-span-7"
              meta={`${formatNumber(stats.seriesCompleted)} COMPLETE`}
            >
              <h2
                id="garage-series-title"
                className="mb-3 font-display text-base font-bold uppercase tracking-display text-fg"
              >
                Series completion
              </h2>
              {dashboard.seriesLoading ? (
                <div aria-hidden="true" className="flex flex-col gap-4">
                  {[0, 1, 2].map((index) => (
                    <Skeleton key={index} className="h-9 rounded-md" />
                  ))}
                </div>
              ) : series.length === 0 ? (
                <p className="py-6 text-sm text-muted">No series in the catalogue yet.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {series.map((row) => (
                    <li key={row.series.id} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <Link
                          to={seriesPath(row.series.slug)}
                          title={row.series.name}
                          className="min-w-0 truncate rounded-sm text-sm font-semibold text-fg transition-colors hover:text-accent-ink"
                        >
                          {row.series.name}
                          <span className="hud ml-2 text-xs text-muted">{row.series.year}</span>
                        </Link>
                        <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-bold tabular-nums text-fg">
                          {row.complete ? (
                            <Crown
                              aria-label="Complete"
                              className="h-3.5 w-3.5 text-highlight-ink"
                            />
                          ) : null}
                          {formatNumber(row.owned)}/{formatNumber(row.total)}
                        </span>
                      </div>
                      <ProgressBar
                        value={row.owned}
                        max={Math.max(1, row.total)}
                        label={`${row.series.name} completion`}
                        valueText={`${row.owned} of ${row.total} cars`}
                        tone={row.complete ? 'success' : 'accent'}
                        size="xs"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </HudPanel>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <HudPanel as="section" aria-labelledby="garage-category-title" tone="default">
              <h2
                id="garage-category-title"
                className="mb-4 font-display text-base font-bold uppercase tracking-display text-fg"
              >
                By category
              </h2>
              <BreakdownBars rows={categories} label="Cars by category" />
            </HudPanel>
            <HudPanel as="section" aria-labelledby="garage-rarity-title" tone="default">
              <h2
                id="garage-rarity-title"
                className="mb-4 font-display text-base font-bold uppercase tracking-display text-fg"
              >
                By rarity
              </h2>
              <BreakdownBars rows={rarities} label="Cars by rarity" toneOf={rarityTone} />
            </HudPanel>
          </div>
        </div>
      )}
    </DataState>
  );
}
