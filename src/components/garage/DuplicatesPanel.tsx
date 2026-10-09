import { Copy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HudPanel } from '@/components/effects/HudPanel';
import { CarImage } from '@/components/product/CarImage';
import { productPath } from '@/config/routes';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber, pluralize } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import { carName, duplicateLabel, type DuplicateRow } from './garageModel';

export interface DuplicatesPanelProps {
  rows: readonly DuplicateRow[];
  className?: string;
}

/** DUPLICATES TRACKER: every car owned more than once, with spare counts and their value. */
export function DuplicatesPanel({ rows, className }: DuplicatesPanelProps) {
  const spares = rows.reduce((sum, row) => sum + row.spares, 0);
  const spareValue = rows.reduce((sum, row) => sum + row.spareValue, 0);

  return (
    <HudPanel
      as="section"
      aria-labelledby="garage-duplicates-title"
      tone="default"
      className={cn('flex flex-col', className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="hud text-muted">Trade bait</p>
          <h2
            id="garage-duplicates-title"
            className="mt-1 font-display text-lg font-bold uppercase tracking-display text-fg"
          >
            Duplicates tracker
          </h2>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold tabular-nums leading-none text-fg">
            {formatNumber(spares)}
          </p>
          <p className="hud mt-1 text-2xs text-muted">{spares === 1 ? 'Spare' : 'Spares'}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <Copy aria-hidden="true" className="h-6 w-6 text-muted" />
          <p className="font-display text-sm font-bold uppercase tracking-display text-fg">
            No doubles yet
          </p>
          <p className="max-w-xs text-sm text-muted">
            Own a car twice? Bump its copies on the card and it shows up here as trade bait.
          </p>
        </div>
      ) : (
        <>
          <ul aria-label="Duplicate cars" className="flex flex-col divide-y divide-line">
            {rows.map(({ car, copies, spareValue: value }) => {
              const name = carName(car);
              const image = car.product ? primaryImageOf(car.product) : null;
              return (
                <li key={car.entry.productId} className="flex items-center gap-3 py-2.5">
                  <CarImage
                    image={image}
                    src={image ? undefined : FALLBACK_CAR_IMAGE}
                    alt=""
                    width={80}
                    height={50}
                    className={cn('w-14 shrink-0', car.retired && 'opacity-60 grayscale')}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg" title={name}>
                      {car.product && !car.retired ? (
                        <Link
                          to={productPath(car.product.slug)}
                          className="rounded-sm transition-colors hover:text-accent-ink"
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-bold tabular-nums text-accent-ink">
                      {duplicateLabel(copies)}
                    </p>
                  </div>
                  {car.product ? (
                    <p className="shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                      {formatINR(value)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="hud mt-3 border-t border-line pt-3 text-xs text-muted">
            {pluralize(rows.length, 'model')} doubled up · spares worth{' '}
            <span className="font-bold text-fg">{formatINR(spareValue)}</span>
          </p>
        </>
      )}
    </HudPanel>
  );
}
