import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Award } from 'lucide-react';
import { memo, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { Chip, PriceTag, RarityChip, StarRating } from '@/components/ui';
import { productPath } from '@/config/routes';
import { useCanHover } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TILT_MAX_DEG } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { isSoldOut, primaryImageOf, productHudLine } from '@/lib/product';
import type { Product } from '@/types';
import { AddToCartButton } from './AddToCartButton';
import { CarImage } from './CarImage';
import { CollectorMeta } from './CollectorMeta';
import { StockStatus } from './StockStatus';
import { WishlistButton } from './WishlistButton';

export type ProductCardVariant = 'default' | 'compact';

export interface ProductCardProps {
  product: Product;
  /** LCP card (first row above the fold): eager image with high fetch priority. */
  priority?: boolean;
  /** `compact` = tighter spacing for horizontal rails. Default `default`. */
  variant?: ProductCardVariant;
  /** Heading level of the car name (default `h3`, inside an `h2` section). */
  headingAs?: 'h2' | 'h3' | 'h4';
  /** `sizes` for the responsive image (sensible grid/rail defaults). */
  imageSizes?: string;
  className?: string;
}

/** Collector score at/above which the card shows the COLLECTOR EDITION tag. */
export const COLLECTOR_EDITION_MIN_SCORE = 8;

/** "Slight" tilt: a bit under the global max so the image never looks warped. */
const TILT_DEG = TILT_MAX_DEG * 0.75;
const TILT_SPRING = { stiffness: 210, damping: 20, mass: 0.6 } as const;

const IMAGE_WIDTH = 480;
const IMAGE_HEIGHT = 300;

const DEFAULT_SIZES: Readonly<Record<ProductCardVariant, string>> = {
  default: '(min-width: 1280px) 296px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw',
  compact: '(min-width: 640px) 288px, 76vw',
};

/**
 * The Collectible Product Card (spec §5.2), used everywhere. The whole card navigates to the
 * product page through a stretched link on the name, while the + CART and ♡ buttons sit above
 * that overlay (no nested interactive elements; tab order: name → cart → wishlist).
 * Hover / focus-within: metallic card-hover surface, orange racing stripe, car rotates −3° and
 * scales slightly, and (fine pointers only, no reduced motion) a spring 3D tilt + glare follow
 * the cursor.
 */
function ProductCardImpl({
  product,
  priority = false,
  variant = 'default',
  headingAs: Heading = 'h3',
  imageSizes,
  className,
}: ProductCardProps) {
  const canHover = useCanHover();
  const reduceMotion = useReducedMotion();
  const tiltEnabled = canHover && !reduceMotion;

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const springX = useSpring(pointerX, TILT_SPRING);
  const springY = useSpring(pointerY, TILT_SPRING);
  const rotateY = useTransform(springX, [0, 1], [-TILT_DEG, TILT_DEG]);
  const rotateX = useTransform(springY, [0, 1], [TILT_DEG, -TILT_DEG]);
  const glareX = useTransform(springX, [0, 1], ['15%', '85%']);
  const glareY = useTransform(springY, [0, 1], ['10%', '70%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.16), transparent 58%)`;

  const handlePointerMove = (event: PointerEvent<HTMLElement>): void => {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
  };

  const handlePointerLeave = (): void => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  const compact = variant === 'compact';
  const soldOut = isSoldOut(product.stock);
  const hud = productHudLine(product);
  const image = primaryImageOf(product);
  const collectorEdition = product.collectorScore >= COLLECTOR_EDITION_MIN_SCORE;
  const hasReviews = product.ratingCount > 0;

  return (
    <article
      className={cn(
        'group relative isolate flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card text-fg shadow-card',
        'transition-[background-color,border-color,box-shadow] duration-300 ease-race',
        'focus-within:border-metal/40 focus-within:bg-card-hover hover:border-metal/40 hover:bg-card-hover hover:shadow-card-hover',
        className,
      )}
      data-variant={variant}
      onPointerMove={tiltEnabled ? handlePointerMove : undefined}
      onPointerLeave={tiltEnabled ? handlePointerLeave : undefined}
    >
      {/* Metallic sheen that fades in with the hover surface. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,transparent_0%,rgb(var(--metal-to)/0.22)_38%,transparent_52%,rgb(var(--metal-from)/0.35)_100%)] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
      />
      <span aria-hidden="true" className="racing-stripe z-20" />

      {/* Top HUD row */}
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          compact ? 'px-3 pt-3' : 'px-4 pt-4',
        )}
      >
        <p className="hud truncate text-[10px] text-muted">
          {hud.series}
          <span aria-hidden="true" className="mx-1.5 text-fg/25">
            //
          </span>
          <span className="text-fg">{hud.collection}</span>
        </p>
        <RarityChip rarity={product.rarity} size="sm" />
      </div>

      {/* Media stage */}
      <div className={cn('relative', compact ? 'px-3 pt-1' : 'px-4 pt-2')}>
        <motion.div
          className="relative aspect-[16/10] [transform-style:preserve-3d]"
          style={tiltEnabled ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
        >
          {/* Showroom spotlight + floor shadow */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg bg-[radial-gradient(ellipse_at_50%_38%,rgb(var(--text)/0.07),transparent_68%)]"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-[9%] left-1/2 h-[9%] w-[72%] -translate-x-1/2 rounded-[50%] bg-black/25 blur-md transition-transform duration-500 ease-race group-hover:scale-x-110 dark:bg-black/70"
          />
          <CarImage
            image={image}
            alt={image.alt || product.name}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            sizes={imageSizes ?? DEFAULT_SIZES[variant]}
            priority={priority}
            aspectBox={false}
            className="absolute inset-0"
            imgClassName={cn(
              'transition-[transform,filter] duration-500 ease-race will-change-transform group-focus-within:-rotate-3 group-focus-within:scale-[1.06] group-hover:-rotate-3 group-hover:scale-[1.06]',
              soldOut && 'opacity-60 grayscale',
            )}
          />
          {tiltEnabled ? (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ backgroundImage: glare }}
            />
          ) : null}
          {product.isNew && !soldOut ? (
            <span className="absolute left-0 top-1 rounded-sm bg-danger px-1.5 py-1 font-mono text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-white">
              New
            </span>
          ) : null}
          {soldOut ? (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded border-2 border-fg/70 bg-bg/70 px-3 py-1.5 font-display text-xs font-bold tracking-hud text-fg backdrop-blur-sm"
            >
              Sold out
            </span>
          ) : null}
        </motion.div>
      </div>

      {/* Body */}
      <div className={cn('flex flex-1 flex-col', compact ? 'gap-2.5 p-3 pt-2' : 'gap-3 p-4 pt-3')}>
        <Heading
          className={cn(
            'font-display font-bold uppercase tracking-display text-fg',
            compact ? 'text-[13px]' : 'text-[15px]',
            // Exactly two 1.25 lines tall: names align across the grid and never peek a 3rd line.
            'line-clamp-2 h-[2.5em] leading-[1.25]',
          )}
        >
          <Link
            to={productPath(product.slug)}
            className={cn(
              'rounded-sm focus-visible:outline-none',
              // Stretched link: the whole card is the click target; the ring is drawn on the card.
              "after:absolute after:inset-0 after:z-[1] after:rounded-xl after:content-['']",
              'focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring',
            )}
          >
            {product.name}
          </Link>
        </Heading>

        <div className="flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          {hasReviews ? (
            <StarRating value={product.ratingAvg} count={product.ratingCount} size="sm" />
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              No reviews yet
            </span>
          )}
          {collectorEdition ? (
            <Chip tone="metal" variant="solid" size="sm" icon={<Award />}>
              Collector edition
            </Chip>
          ) : null}
        </div>

        <CollectorMeta product={product} />

        <div
          className={cn(
            'mt-auto flex items-end justify-between gap-3 border-t border-line',
            compact ? 'pt-2.5' : 'pt-3',
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <StockStatus stock={product.stock} size="sm" />
            <PriceTag
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size={compact ? 'sm' : 'md'}
            />
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-2">
            <AddToCartButton product={product} size="sm" />
            <WishlistButton product={product} size="sm" />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Memoized: re-renders only when the product object / props change. */
export const ProductCard = memo(ProductCardImpl);
ProductCard.displayName = 'ProductCard';
