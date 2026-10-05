import { Link } from 'react-router-dom';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { AddToGarageButton } from '@/components/product/AddToGarageButton';
import { CarImage } from '@/components/product/CarImage';
import { PriceTag } from '@/components/ui/PriceTag';
import { RarityChip } from '@/components/ui/RarityChip';
import { productPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatSeriesLabel } from '@/lib/format';
import { primaryImageOf } from '@/lib/product';
import type { Product } from '@/types';

export interface MissingCarListProps {
  cars: readonly Product[];
  /** Accessible name of the list. */
  label: string;
  className?: string;
}

/**
 * The cars a collector still needs to complete a series: thumbnail, series position, name (link),
 * rarity, price, "+ CART" and "ADD TO GARAGE" (for cars already on their shelf).
 */
export function MissingCarList({ cars, label, className }: MissingCarListProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-col gap-3', className)}>
      {cars.map((car) => (
        <li
          key={car.id}
          className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-dashed border-line bg-bg/40 p-3 transition-colors duration-200 hover:border-fg/25 hover:bg-card-hover sm:flex-row sm:items-center sm:p-4"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link
              to={productPath(car.slug)}
              tabIndex={-1}
              aria-hidden="true"
              className="relative block w-24 shrink-0 rounded-lg border border-line bg-surface sm:w-28"
            >
              <CarImage
                image={primaryImageOf(car)}
                alt=""
                width={224}
                height={140}
                className="w-full"
                imgClassName="opacity-80 grayscale-[35%] transition-[filter,opacity] duration-300 group-hover:opacity-100 group-hover:grayscale-0"
              />
            </Link>
            <div className="min-w-0">
              <p className="hud text-muted">{formatSeriesLabel(car.seriesNumber)}</p>
              <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold uppercase tracking-display text-fg sm:text-base">
                <Link
                  to={productPath(car.slug)}
                  className="rounded-sm transition-colors hover:text-accent-ink active:opacity-80"
                >
                  {car.name}
                </Link>
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RarityChip rarity={car.rarity} />
                <PriceTag price={car.price} compareAtPrice={car.compareAtPrice} size="sm" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <AddToGarageButton product={car} size="sm" variant="outline" />
            <AddToCartButton product={car} size="sm" />
          </div>
        </li>
      ))}
    </ul>
  );
}
