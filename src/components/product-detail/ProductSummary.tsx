import { Award, MessageSquarePlus, RotateCcw, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AddToCartButton,
  AddToGarageButton,
  COLLECTOR_EDITION_MIN_SCORE,
  StockStatus,
  WishlistButton,
} from '@/components/product';
import { Chip, PriceTag, RarityChip, StarRating } from '@/components/ui';
import { ROUTES } from '@/config/routes';
import { useSettings } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber } from '@/lib/format';
import { isSoldOut, productHudLine, productMetaLine } from '@/lib/product';
import type { Product } from '@/types';
import { BuyNowButton } from './BuyNowButton';
import { LimitedEditionPanel } from './LimitedEditionPanel';
import { ProductSpecTable } from './ProductSpecTable';

export interface ProductSummaryProps {
  product: Product;
  /** Scrolls to (and focuses) the reviews section. */
  onReviewsClick: () => void;
  className?: string;
}

/**
 * Right column of the product page: meta line, name (the page's h1), rating, collector HUD
 * line, price + stock, vault edition block, the purchase / collection actions, the
 * free-shipping hint and the metallic spec sheet.
 */
export function ProductSummary({ product, onReviewsClick, className }: ProductSummaryProps) {
  const settings = useSettings();
  const hud = productHudLine(product);
  const soldOut = isSoldOut(product.stock);
  const hasReviews = product.ratingCount > 0;
  const collectorEdition = product.collectorScore >= COLLECTOR_EDITION_MIN_SCORE;
  const description = product.description.trim();

  return (
    <div className={cn('flex min-w-0 flex-col gap-6', className)}>
      <header className="flex flex-col gap-3">
        <p className="eyebrow">{productMetaLine(product)}</p>
        <h1 className="text-balance break-words font-display text-3xl font-bold uppercase leading-[1.08] tracking-display text-fg sm:text-4xl xl:text-[2.75rem]">
          {product.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {hasReviews ? (
            <button
              type="button"
              onClick={onReviewsClick}
              className="group/rating inline-flex items-center gap-2 rounded-sm transition-opacity duration-150 active:opacity-70"
              aria-label={`Rated ${product.ratingAvg.toFixed(1)} out of 5 from ${formatNumber(product.ratingCount)} ${product.ratingCount === 1 ? 'review' : 'reviews'} — jump to reviews`}
            >
              <StarRating value={product.ratingAvg} size="sm" showValue />
              <span className="font-mono text-xs text-muted underline decoration-line underline-offset-4 transition-colors group-hover/rating:text-accent-ink group-hover/rating:decoration-accent">
                {formatNumber(product.ratingCount)}{' '}
                {product.ratingCount === 1 ? 'review' : 'reviews'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onReviewsClick}
              className="inline-flex items-center gap-2 rounded-sm font-mono text-xs text-muted underline decoration-line underline-offset-4 transition-colors duration-150 hover:text-accent-ink hover:decoration-accent active:opacity-70"
            >
              <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />
              No reviews yet — be the first
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <p className="hud text-[11px] text-muted">
            {hud.series}
            <span aria-hidden="true" className="mx-1.5 text-fg/30">
              ·
            </span>
            <span className="text-fg">{hud.collection}</span>
          </p>
          <RarityChip rarity={product.rarity} size="sm" />
          {collectorEdition ? (
            <Chip tone="metal" size="sm" icon={<Award />}>
              Collector edition
            </Chip>
          ) : null}
        </div>

        {description ? (
          <p className="max-w-prose text-pretty text-[15px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 border-y border-line py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-1.5">
            <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="xl" />
            <p className="hud text-[10px] text-muted">
              {settings.taxInclusive ? 'Incl. GST' : '+ GST at checkout'}
            </p>
          </div>
          <StockStatus stock={product.stock} />
        </div>
      </div>

      <LimitedEditionPanel product={product} />

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AddToGarageButton product={product} size="lg" fullWidth variant="secondary" />
          <BuyNowButton product={product} size="lg" fullWidth />
        </div>
        <div className="flex items-stretch gap-3">
          <AddToCartButton
            product={product}
            size="lg"
            variant="outline"
            label="Add to cart"
            fullWidth
            className="min-w-0 flex-1"
          />
          <WishlistButton product={product} size="lg" iconVariant="outline" />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          <span className="font-semibold text-fg">Add to garage</span> logs a car you already own in
          your collection — it doesn&apos;t add it to your cart.
          {soldOut ? ' Sold out cars can still be parked in your garage or wishlisted.' : ''}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5 rounded-xl border border-line bg-card p-4 text-sm shadow-card">
        <li className="flex items-start gap-3">
          <Truck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
          <span className="text-fg">
            Free shipping over{' '}
            <span className="font-mono font-semibold">{formatINR(settings.shippingThreshold)}</span>
            {settings.shippingFee > 0 ? (
              <span className="text-muted">
                {' '}
                — otherwise a flat{' '}
                <span className="font-mono">{formatINR(settings.shippingFee)}</span> pit-lane fee.
              </span>
            ) : null}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <RotateCcw aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
          <span className="text-muted">
            Delivery or return questions? Read the{' '}
            <Link
              to={ROUTES.shippingReturns}
              className="rounded-sm text-fg underline decoration-line underline-offset-4 transition-colors hover:text-accent-ink hover:decoration-accent"
            >
              shipping &amp; returns policy
            </Link>
            .
          </span>
        </li>
      </ul>

      <ProductSpecTable product={product} />
    </div>
  );
}
