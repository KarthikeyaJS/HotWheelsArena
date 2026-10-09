import { ArrowRight, Gem, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Chip, PriceTag, ProgressBar } from '@/components/ui';
import { productPath } from '@/config/routes';
import { cn } from '@/lib/cn';
import { formatNumber, formatPercent } from '@/lib/format';
import { limitedEditionInfo, primaryImageOf, productMetaLine } from '@/lib/product';
import type { Product } from '@/types';
import { CarImage } from './CarImage';
import { StockStatus } from './StockStatus';
import { WishlistButton } from './WishlistButton';

export type VaultCardLayout = 'vertical' | 'horizontal';

export interface VaultCardProps {
  product: Product;
  /** `horizontal` puts the car left and the details right from `md` up. Default `vertical`. */
  layout?: VaultCardLayout;
  /** LCP card: eager image with high fetch priority. */
  priority?: boolean;
  /** Heading level of the car name (default `h3`). */
  headingAs?: 'h2' | 'h3' | 'h4';
  className?: string;
}

const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 400;

/** Yellow L-shaped corner brackets: the vault's display-case frame. */
function VaultCorners() {
  const base =
    'pointer-events-none absolute h-4 w-4 border-highlight/70 transition-all duration-300 ease-race group-hover:h-6 group-hover:w-6 group-hover:border-highlight group-focus-within:h-6 group-focus-within:w-6';
  return (
    <>
      <span aria-hidden="true" className={cn(base, 'left-0 top-0 border-l-2 border-t-2')} />
      <span aria-hidden="true" className={cn(base, 'right-0 top-0 border-r-2 border-t-2')} />
      <span aria-hidden="true" className={cn(base, 'bottom-0 left-0 border-b-2 border-l-2')} />
      <span aria-hidden="true" className={cn(base, 'bottom-0 right-0 border-b-2 border-r-2')} />
    </>
  );
}

/**
 * The Collector's Vault card (spec §5.5): large, yellow display-case frame and glow,
 * LIMITED EDITION label, edition number (`#001/500`), "Only N remaining" with an animated
 * highlight ProgressBar (edition claimed; static values from the product document), price and a
 * CTA to the product. Sold-out editions switch to a locked, desaturated state.
 */
export function VaultCard({
  product,
  layout = 'vertical',
  priority = false,
  headingAs: Heading = 'h3',
  className,
}: VaultCardProps) {
  const info = limitedEditionInfo(product);
  const image = primaryImageOf(product);
  const href = productPath(product.slug);
  const horizontal = layout === 'horizontal';
  const remaining = info ? info.remaining : Math.max(0, Math.floor(product.stock));
  const soldOut = remaining <= 0;
  const claimed = info ? info.editionSize - info.remaining : 0;

  const header = (
    <div className="flex items-start justify-between gap-3">
      <Chip tone="highlight" variant="solid" size="sm" icon={<Gem />}>
        {info ? 'Limited edition' : 'Vault exclusive'}
      </Chip>
      {info ? (
        <p className="text-right font-mono text-xl font-bold tabular-nums leading-none text-highlight-ink sm:text-2xl">
          <span className="sr-only">
            Edition number {info.editionNumber} of {info.editionSize}:{' '}
          </span>
          <span aria-hidden="true">{info.label}</span>
        </p>
      ) : null}
    </div>
  );

  return (
    <article
      className={cn(
        'group relative isolate flex flex-col overflow-hidden rounded-2xl border border-highlight/35 bg-card text-fg shadow-card',
        'transition-[border-color,box-shadow,background-color] duration-300 ease-race',
        'focus-within:border-highlight/70 focus-within:shadow-glow-highlight hover:border-highlight/70 hover:bg-card-hover hover:shadow-glow-highlight',
        horizontal && 'md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
        className,
      )}
      data-sold-out={soldOut || undefined}
    >
      {/* Brushed-metal texture + diagonal sheen */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[repeating-linear-gradient(90deg,rgb(var(--text)/0.022)_0_1px,transparent_1px_4px)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(125deg,transparent_0%,rgb(var(--metal-to)/0.25)_30%,transparent_48%,transparent_70%,rgb(var(--highlight)/0.08)_100%)]"
      />

      {/* Display case */}
      <div
        className={cn(
          'relative px-5 pt-5',
          horizontal && 'md:flex md:flex-col md:justify-center md:pb-5',
        )}
      >
        {horizontal ? <div className="md:hidden">{header}</div> : header}

        <Link
          to={href}
          tabIndex={-1}
          aria-hidden="true"
          className="relative mt-3 block aspect-[16/10] focus:outline-none"
        >
          <VaultCorners />
          <span className="absolute inset-[8%] rounded-full bg-[radial-gradient(ellipse_at_50%_55%,rgb(var(--highlight)/0.28),transparent_68%)] blur-xl transition-opacity duration-500 group-hover:opacity-100 motion-safe:animate-glow-pulse" />
          <span className="absolute bottom-[10%] left-1/2 h-[8%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-md dark:bg-black/70" />
          <CarImage
            image={image}
            alt=""
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            sizes={horizontal ? '(min-width: 768px) 40vw, 92vw' : '(min-width: 1024px) 400px, 92vw'}
            priority={priority}
            aspectBox={false}
            className="absolute inset-0"
            imgClassName={cn(
              'transition-[transform,filter] duration-700 ease-race group-focus-within:-rotate-2 group-focus-within:scale-[1.05] group-hover:-rotate-2 group-hover:scale-[1.05]',
              soldOut && 'opacity-55 grayscale',
            )}
          />
          {soldOut ? (
            <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 -rotate-6 items-center gap-2 whitespace-nowrap rounded border-2 border-highlight bg-bg/75 px-3 py-2 font-display text-xs font-bold tracking-hud text-highlight-ink backdrop-blur-sm sm:px-4 sm:text-sm">
              <Lock className="h-4 w-4" />
              Edition sold out
            </span>
          ) : null}
        </Link>
      </div>

      {/* Details */}
      <div
        className={cn('flex flex-1 flex-col gap-4 p-5', horizontal && 'md:justify-center md:pl-2')}
      >
        {horizontal ? <div className="hidden md:block">{header}</div> : null}
        <div className="flex flex-col gap-1.5">
          <p className="hud text-[10px] text-muted">{productMetaLine(product)}</p>
          <Heading className="font-display text-lg font-bold uppercase leading-tight tracking-display text-fg sm:text-xl">
            {product.name}
          </Heading>
        </div>

        {info ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-[0.12em]">
              <p className="font-bold text-fg">
                {soldOut ? (
                  'Edition fully claimed'
                ) : (
                  <>
                    Only{' '}
                    <span className="tabular-nums text-highlight-ink">
                      {formatNumber(remaining)}
                    </span>{' '}
                    remaining
                  </>
                )}
              </p>
              {/* Below 360px the card is too narrow for both labels on one line (some cards wrapped,
                  some did not); the bar below still shows the claimed share. */}
              <p aria-hidden="true" className="tabular-nums text-muted max-[359px]:hidden">
                {formatPercent(info.claimedPct)} claimed
              </p>
            </div>
            <ProgressBar
              value={claimed}
              max={info.editionSize}
              label="Edition claimed"
              valueText={`${formatNumber(claimed)} of ${formatNumber(info.editionSize)} claimed, ${formatNumber(remaining)} remaining`}
              tone="highlight"
              size="md"
              striped
            />
          </div>
        ) : (
          <StockStatus stock={product.stock} />
        )}

        {/* mt-auto: price + CTAs line up across a grid row even when a name wraps. */}
        <div
          className={cn(
            'mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4',
            horizontal && 'md:mt-0',
          )}
        >
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
          <div className="flex items-center gap-2">
            <WishlistButton product={product} size="md" />
            <Button
              to={href}
              variant={soldOut ? 'outline' : 'primary'}
              size="md"
              rightIcon={<ArrowRight />}
              aria-label={`${soldOut ? 'View details' : 'View edition'} – ${product.name}`}
            >
              {soldOut ? 'View details' : 'View edition'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
