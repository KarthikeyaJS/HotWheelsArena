import { CarFront, Factory, Gem, Layers, Shapes } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { DataState } from '@/components/common/DataState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useSeries } from '@/hooks/useSeries';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

interface StatTile {
  id: string;
  label: string;
  value: number;
  caption: string;
  icon: ReactNode;
  rare?: boolean;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5">
          <Skeleton variant="text" className="w-20" />
          <Skeleton className="h-9 w-16 rounded-md" />
          <Skeleton variant="text" className="w-28" />
        </div>
      ))}
    </div>
  );
}

/** Live catalogue numbers (cars, series, categories, vault editions, makes) from the data hooks. */
export function CatalogueStats() {
  const products = useProducts();
  const series = useSeries();
  const categories = useCategories();

  const tiles = useMemo<StatTile[]>(() => {
    const list = products.data ?? [];
    return [
      {
        id: 'cars',
        label: 'Cars on the grid',
        value: list.length,
        caption: 'Active castings in the shop',
        icon: <CarFront />,
      },
      {
        id: 'series',
        label: 'Series',
        value: series.data?.length ?? 0,
        caption: 'Collectible sets to complete',
        icon: <Layers />,
      },
      {
        id: 'categories',
        label: 'Categories',
        value: categories.data?.length ?? 0,
        caption: 'From sports to rescue',
        icon: <Shapes />,
      },
      {
        id: 'vault',
        label: 'Vault editions',
        value: list.filter((product) => product.isVault).length,
        caption: 'Numbered limited runs',
        icon: <Gem />,
        rare: true,
      },
      {
        id: 'makes',
        label: 'Makes',
        value: new Set(list.map((product) => product.make.trim().toLowerCase())).size,
        caption: 'Manufacturers represented',
        icon: <Factory />,
      },
    ];
  }, [products.data, series.data, categories.data]);

  const isLoading = products.isLoading || series.isLoading || categories.isLoading;
  const failed = [products, series, categories].find((query) => query.isError);

  return (
    <DataState
      isLoading={isLoading}
      isError={Boolean(failed)}
      error={failed?.error}
      onRetry={() => {
        if (products.isError) void products.refetch();
        if (series.isError) void series.refetch();
        if (categories.isError) void categories.refetch();
      }}
      errorTitle="TELEMETRY OFFLINE"
      errorCompact
      skeleton={<StatsSkeleton />}
      loadingLabel="Loading catalogue stats…"
    >
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="group relative flex flex-col gap-2 overflow-hidden rounded-xl border border-line bg-card p-4 shadow-card transition-colors duration-200 hover:bg-card-hover sm:p-5"
          >
            <span aria-hidden="true" className="racing-stripe" />
            <dt className="hud flex items-center gap-2 text-muted">
              <span
                aria-hidden="true"
                className={cn(
                  '[&_svg]:h-4 [&_svg]:w-4',
                  tile.rare ? 'text-highlight-ink' : 'text-accent-ink',
                )}
              >
                {tile.icon}
              </span>
              {tile.label}
            </dt>
            <dd className="font-mono text-3xl font-bold tabular-nums leading-none text-fg sm:text-4xl">
              {formatNumber(tile.value)}
            </dd>
            <dd className="text-xs leading-5 text-muted sm:text-sm">{tile.caption}</dd>
          </div>
        ))}
      </dl>
    </DataState>
  );
}
