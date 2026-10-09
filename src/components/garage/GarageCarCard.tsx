import { Archive, PenLine, ShoppingBag, Star } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CarImage } from '@/components/product/CarImage';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { RarityChip } from '@/components/ui/RarityChip';
import { MAX_GARAGE_QUANTITY } from '@/config/gamification';
import { productPath } from '@/config/routes';
import { FALLBACK_CAR_IMAGE } from '@/config/site';
import { useGarageActions } from '@/hooks/useGarageActions';
import { cn } from '@/lib/cn';
import { formatDate, formatINR, formatRelative } from '@/lib/format';
import { primaryImageOf, productHudLine } from '@/lib/product';
import { carName, carValue, copiesOf, type GarageCarView } from './garageModel';
import { RemoveCarButton } from './RemoveCarButton';

export interface GarageCarCardProps {
  car: GarageCarView;
  /** Called on the confirmed remove press (the page hides the car and offers undo). */
  onRemove: (car: GarageCarView) => void;
  headingAs?: 'h2' | 'h3' | 'h4';
  /** Eager image for the first row. */
  priority?: boolean;
  className?: string;
}

const IMAGE_WIDTH = 480;
const IMAGE_HEIGHT = 300;

/**
 * One parked car: HUD line, showroom stage, name, PURCHASED / MANUAL source, added date,
 * favourite toggle, copies stepper (duplicates tracker), value and a two-step remove.
 * Retired cars (no longer in the catalogue, or deleted) keep every garage control but show a
 * RETIRED stamp and no product link.
 */
function GarageCarCardImpl({
  car,
  onRemove,
  headingAs: Heading = 'h3',
  priority = false,
  className,
}: GarageCarCardProps) {
  const { toggleFavorite, setQuantity } = useGarageActions();
  const { entry, product, retired } = car;
  const name = carName(car);
  const copies = copiesOf(car);
  const value = carValue(car);
  const ref = { id: entry.productId, name };
  const hud = product ? productHudLine(product) : null;
  const image = product ? primaryImageOf(product) : null;
  const linkable = Boolean(product && !retired);

  return (
    <article
      data-retired={retired || undefined}
      className={cn(
        'group relative isolate flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card text-fg shadow-card',
        'transition-[background-color,border-color,box-shadow] duration-300 ease-race',
        'focus-within:border-metal/40 focus-within:bg-card-hover hover:border-metal/40 hover:bg-card-hover hover:shadow-card-hover',
        retired && 'border-dashed',
        className,
      )}
    >
      <span aria-hidden="true" className="racing-stripe z-20" />

      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <p className="hud min-w-0 truncate text-xs text-muted">
          {hud ? (
            <>
              {hud.series}
              <span aria-hidden="true" className="mx-1.5 text-fg/25">
                //
              </span>
              <span className="text-fg">{hud.collection}</span>
            </>
          ) : (
            <span title={entry.productId}>ID {entry.productId}</span>
          )}
        </p>
        {product ? <RarityChip rarity={product.rarity} size="sm" /> : null}
      </div>

      <div className="relative px-4 pt-2">
        <div className="relative aspect-[16/10]">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_50%_38%,rgb(var(--text)/0.07),transparent_68%)]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[9%] left-1/2 h-[9%] w-[72%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-md dark:bg-black/70"
          />
          <CarImage
            image={image}
            src={image ? undefined : FALLBACK_CAR_IMAGE}
            alt={image?.alt || name}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            sizes="(min-width: 1280px) 300px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            priority={priority}
            aspectBox={false}
            className="absolute inset-0"
            imgClassName={cn(
              'transition-[transform,filter] duration-500 ease-race',
              retired
                ? 'opacity-60 grayscale'
                : 'group-focus-within:-rotate-2 group-focus-within:scale-[1.05] group-hover:-rotate-2 group-hover:scale-[1.05]',
            )}
          />
          {copies > 1 ? (
            <span className="absolute bottom-1 left-0 rounded-sm border border-line bg-surface/90 px-1.5 py-1 font-mono text-xs font-bold tabular-nums leading-none text-fg backdrop-blur-sm">
              ×{copies}
              <span className="sr-only"> copies</span>
            </span>
          ) : null}
          {retired ? (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded border-2 border-fg/70 bg-bg/75 px-3 py-1.5 font-display text-xs font-bold tracking-hud text-fg backdrop-blur-sm"
            >
              Retired
            </span>
          ) : null}
        </div>
        <IconButton
          label={`Favorite ${name}`}
          title={entry.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
          pressed={entry.isFavorite}
          size="sm"
          variant="outline"
          icon={<Star className={entry.isFavorite ? 'fill-current' : undefined} />}
          onClick={() => toggleFavorite(ref)}
          className="absolute right-4 top-2 z-10 bg-surface/85 backdrop-blur-sm"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <Heading className="line-clamp-2 h-[2.5em] font-display text-[15px] font-bold uppercase leading-[1.25] tracking-display text-fg">
          {linkable && product ? (
            <Link
              to={productPath(product.slug)}
              className="rounded-sm transition-colors hover:text-accent-ink"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </Heading>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {entry.source === 'purchase' ? (
            <Chip tone="success" size="sm" icon={<ShoppingBag />}>
              Purchased
            </Chip>
          ) : (
            <Chip tone="neutral" variant="outline" size="sm" icon={<PenLine />}>
              Manual
            </Chip>
          )}
          {retired ? (
            <Chip tone="metal" variant="outline" size="sm" icon={<Archive />}>
              Retired
            </Chip>
          ) : null}
          {entry.addedAt != null ? (
            <time
              dateTime={new Date(entry.addedAt).toISOString()}
              title={formatDate(entry.addedAt, true)}
              className="hud text-xs text-muted"
            >
              Added {formatRelative(entry.addedAt)}
            </time>
          ) : null}
        </div>

        {retired ? (
          <p className="text-xs text-muted">
            {product
              ? 'Retired from the catalogue — still parked in your garage.'
              : 'This model is no longer listed. It stays in your garage until you remove it.'}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-3">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="hud text-2xs text-muted">Value</p>
              <p className="font-mono text-lg font-bold tabular-nums text-fg">
                {product ? formatINR(value) : '—'}
              </p>
            </div>
            {copies > 1 && product ? (
              <p className="pb-0.5 text-right font-mono text-xs tabular-nums text-muted">
                {formatINR(product.price)} × {copies}
                <span className="block text-fg">
                  {copies - 1} {copies - 1 === 1 ? 'spare' : 'spares'}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <QuantityStepper
              value={copies}
              min={1}
              max={MAX_GARAGE_QUANTITY}
              onChange={(next) => setQuantity(ref, next)}
              label={`Copies of ${name}`}
              decrementLabel={`Remove one copy of ${name}`}
              incrementLabel={`Add a copy of ${name}`}
              size="sm"
            />
            <RemoveCarButton name={name} onConfirm={() => onRemove(car)} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Memoized: re-renders only when the car view / handlers change. */
export const GarageCarCard = memo(GarageCarCardImpl);
GarageCarCard.displayName = 'GarageCarCard';
