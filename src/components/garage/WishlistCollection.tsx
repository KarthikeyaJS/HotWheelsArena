import { Gem, Heart, ShoppingCart } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataState } from '@/components/common/DataState';
import { ProductCardSkeleton } from '@/components/product/ProductCardSkeleton';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { HudReadout } from '@/components/ui/HudReadout';
import { Select } from '@/components/ui/Select';
import { ROUTES, shopPath } from '@/config/routes';
import { useWishlistActions } from '@/hooks/useWishlistActions';
import { useWishlistProducts } from '@/hooks/useWishlist';
import { cn } from '@/lib/cn';
import { formatINR, formatNumber, pluralize } from '@/lib/format';
import { isSoldOut, toCartItem } from '@/lib/product';
import { useCartItems, useCartStore } from '@/store/cartStore';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';
import {
  WISHLIST_SORTS,
  blockedMoveToast,
  isWishlistSort,
  sortWishlist,
  type MoveOutcome,
  type WishlistSort,
} from './wishlistModel';
import { WishlistItem } from './WishlistItem';

export interface WishlistCollectionProps {
  /** Heading level of each card name (the page / tab provides the section heading). */
  cardHeadingAs?: 'h2' | 'h3' | 'h4';
  /** First N card images load eagerly (above the fold on the Wishlist page). */
  priorityCount?: number;
  className?: string;
}

/** Focus left the page: the focused control was removed from the DOM or just got disabled. */
function focusWasLost(active: Element | null): boolean {
  if (!active || active === document.body || !active.isConnected) return true;
  return active instanceof HTMLButtonElement && active.disabled;
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * The collector's wishlist — shared by `/wishlist` and the garage WISHLIST tab: summary HUD
 * (count, value, in stock), sort, MOVE ALL TO PIT STOP, and a grid of ProductCards with
 * move-to-pit-stop and remove actions. Mutations are optimistic (`useWishlistActions`).
 */
export function WishlistCollection({
  cardHeadingAs = 'h3',
  priorityCount = 0,
  className,
}: WishlistCollectionProps) {
  const wishlist = useWishlistProducts();
  const { removeFromWishlist, pendingProductId } = useWishlistActions();
  const { removeFromWishlist: removeQuietly } = useWishlistActions({ toasts: false });
  const cartItems = useCartItems();
  const [sort, setSort] = useState<WishlistSort>('recent');
  const rootRef = useRef<HTMLDivElement>(null);
  /** Cars that are leaving the grid through an action here, and the grid slot to refocus. */
  const refocusRef = useRef<{ ids: ReadonlySet<string>; index: number } | null>(null);

  const addedAtById = useMemo(
    () => new Map(wishlist.entries.map((entry) => [entry.productId, entry.addedAt])),
    [wishlist.entries],
  );
  const inCartIds = useMemo(() => new Set(cartItems.map((item) => item.productId)), [cartItems]);
  const products = useMemo(
    () => sortWishlist(wishlist.products, sort, addedAtById),
    [wishlist.products, sort, addedAtById],
  );
  const movable = useMemo(
    () => products.filter((product) => product.isActive && !isSoldOut(product.stock)),
    [products],
  );
  const value = useMemo(
    () => products.reduce((sum, product) => sum + (product.isActive ? product.price : 0), 0),
    [products],
  );
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const expectRemoval = useCallback((ids: readonly string[]) => {
    const index = productsRef.current.findIndex((product) => ids.includes(product.id));
    refocusRef.current = { ids: new Set(ids), index: Math.max(0, index) };
  }, []);

  // Moving / removing a car unmounts the card whose button had focus (and "Move all" disables
  // itself). Once those cars have left the grid, focus the same slot's action (the next car), or
  // the first control of what is left (sort, or the empty state's CTA).
  useEffect(() => {
    const pending = refocusRef.current;
    if (!pending || products.some((product) => pending.ids.has(product.id))) return;
    refocusRef.current = null;
    if (!focusWasLost(document.activeElement)) return;
    const root = rootRef.current;
    const items = root?.querySelectorAll<HTMLElement>('[data-wishlist-item]');
    const item =
      items && items.length > 0 ? items[Math.min(pending.index, items.length - 1)] : null;
    const target =
      item?.querySelector<HTMLElement>('[data-wishlist-action]:not(:disabled)') ??
      root?.querySelector<HTMLElement>('a[href], button:not(:disabled), select');
    target?.focus();
  }, [products]);

  /** Adds to the cart (once) and clears the car from the wishlist. */
  const moveOne = useCallback(
    (product: Product): MoveOutcome => {
      if (!product.isActive) return 'unavailable';
      if (isSoldOut(product.stock)) return 'sold-out';
      const alreadyInCart = useCartStore
        .getState()
        .items.some((item) => item.productId === product.id);
      if (!alreadyInCart) {
        const result = useCartStore.getState().addItem(toCartItem(product));
        if (result.added === 0) return 'capped';
      }
      removeQuietly(product);
      return 'moved';
    },
    [removeQuietly],
  );

  const handleMove = useCallback(
    (product: Product) => {
      expectRemoval([product.id]);
      const outcome = moveOne(product);
      if (outcome === 'moved') {
        toast.success('Moved to your pit stop', product.name);
        return;
      }
      refocusRef.current = null;
      toast(blockedMoveToast(outcome, product));
    },
    [expectRemoval, moveOne],
  );

  const handleMoveAll = (): void => {
    const moved = movable.filter((product) => moveOne(product) === 'moved');
    if (moved.length > 0) {
      expectRemoval(moved.map((product) => product.id));
      toast.success(
        `${pluralize(moved.length, 'car')} moved to your pit stop`,
        moved.map((product) => product.name).join(', '),
      );
    } else {
      toast({ title: 'Nothing to move', description: 'Those cars are sold out or capped.' });
    }
  };

  const handleRemove = useCallback(
    (product: Product) => {
      expectRemoval([product.id]);
      removeFromWishlist(product);
    },
    [expectRemoval, removeFromWishlist],
  );

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-6', className)}>
      <DataState
        isLoading={wishlist.isLoading}
        isError={wishlist.isError}
        error={wishlist.error}
        onRetry={wishlist.refetch}
        isEmpty={products.length === 0}
        loadingLabel="Loading your wishlist…"
        skeleton={<WishlistSkeleton />}
        empty={
          <EmptyState
            size="lg"
            titleAs="h2"
            icon={<Heart />}
            title="Your wishlist is empty"
            description="Tap the ♡ on any car to save it for later — it'll be waiting here, ready to roll into your pit stop."
            action={
              <>
                <Button to={shopPath()} size="lg">
                  Explore the garage
                </Button>
                <Button to={ROUTES.vault} variant="outline" size="lg" leftIcon={<Gem />}>
                  Visit the Vault
                </Button>
              </>
            }
          />
        }
      >
        {() => (
          <>
            <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 shadow-card sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-3 gap-4 sm:gap-8">
                <HudReadout label="Saved" value={formatNumber(products.length)} />
                <HudReadout label="Wishlist value" value={formatINR(value)} />
                <HudReadout
                  label="Ready to roll"
                  value={formatNumber(movable.length)}
                  tone="accent"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <label htmlFor="wishlist-sort" className="hud shrink-0 text-muted">
                    Sort
                  </label>
                  <Select
                    id="wishlist-sort"
                    value={sort}
                    onChange={(event) => {
                      const next = event.currentTarget.value;
                      if (isWishlistSort(next)) setSort(next);
                    }}
                    options={WISHLIST_SORTS}
                    size="sm"
                    containerClassName="flex-1 sm:w-52"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<ShoppingCart />}
                  disabled={movable.length === 0}
                  onClick={handleMoveAll}
                >
                  Move all to pit stop
                </Button>
              </div>
            </div>
            <ul
              aria-label="Wishlisted cars"
              className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {products.map((product, index) => (
                <li key={product.id} data-wishlist-item="" className="min-w-0">
                  <WishlistItem
                    product={product}
                    addedAt={addedAtById.get(product.id) ?? null}
                    inCart={inCartIds.has(product.id)}
                    onMove={handleMove}
                    onRemove={handleRemove}
                    removing={pendingProductId === product.id}
                    priority={index < priorityCount}
                    headingAs={cardHeadingAs}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </DataState>
    </div>
  );
}
