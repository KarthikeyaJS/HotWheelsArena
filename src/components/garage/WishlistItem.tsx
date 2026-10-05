import { Archive, ShoppingCart, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { CarImage } from '@/components/product/CarImage';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { formatINR, formatRelative } from '@/lib/format';
import { isSoldOut, primaryImageOf } from '@/lib/product';
import type { Product } from '@/types';

export interface WishlistItemProps {
  product: Product;
  /** When it was wishlisted (epoch millis). */
  addedAt: number | null;
  inCart: boolean;
  onMove: (product: Product) => void;
  onRemove: (product: Product) => void;
  removing?: boolean;
  priority?: boolean;
  headingAs?: 'h2' | 'h3' | 'h4';
}

/**
 * A wishlisted car: the collectible ProductCard plus an attached action rail with
 * MOVE TO PIT STOP (adds to cart, then clears it from the wishlist) and REMOVE.
 * Retired products get a compact card with only the remove action.
 */
function WishlistItemImpl({
  product,
  addedAt,
  inCart,
  onMove,
  onRemove,
  removing = false,
  priority = false,
  headingAs = 'h3',
}: WishlistItemProps) {
  const soldOut = isSoldOut(product.stock);
  const Heading = headingAs;

  if (!product.isActive) {
    const image = primaryImageOf(product);
    return (
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-dashed border-line bg-card p-4 text-fg shadow-card">
        <p className="hud inline-flex items-center gap-1.5 text-[10px] text-muted">
          <Archive aria-hidden="true" className="h-3.5 w-3.5" />
          Retired from the catalogue
        </p>
        <CarImage
          image={image}
          alt={image.alt || product.name}
          width={480}
          height={300}
          className="mt-3 rounded-lg"
          imgClassName="opacity-60 grayscale"
        />
        <Heading className="mt-3 line-clamp-2 font-display text-[15px] font-bold uppercase leading-[1.25] tracking-display">
          {product.name}
        </Heading>
        <p className="mt-1 font-mono text-sm tabular-nums text-muted">{formatINR(product.price)}</p>
        <div className="mt-auto pt-4">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={<Trash2 />}
            loading={removing}
            aria-label={`Remove ${product.name} from your wishlist`}
            onClick={() => onRemove(product)}
          >
            Remove
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ProductCard
        product={product}
        priority={priority}
        headingAs={headingAs}
        className="flex-1 rounded-b-none"
      />
      <div className="flex items-center gap-2 rounded-b-xl border border-t-0 border-line bg-surface px-3 py-2.5">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<ShoppingCart />}
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.name} is sold out`
              : `Move to pit stop — ${product.name}${inCart ? ' (already in your pit stop)' : ''}`
          }
          onClick={() => onMove(product)}
          className="min-w-0 flex-1"
        >
          {soldOut ? 'Sold out' : 'Move to pit stop'}
        </Button>
        <IconButton
          size="sm"
          variant="outline"
          label={`Remove ${product.name} from your wishlist`}
          title="Remove from wishlist"
          icon={<Trash2 />}
          loading={removing}
          onClick={() => onRemove(product)}
        />
      </div>
      {addedAt != null ? (
        <p className="hud mt-1.5 px-1 text-[10px] text-muted">Saved {formatRelative(addedAt)}</p>
      ) : null}
    </div>
  );
}

export const WishlistItem = memo(WishlistItemImpl);
WishlistItem.displayName = 'WishlistItem';
