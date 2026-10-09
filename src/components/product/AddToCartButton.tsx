import { motion } from 'framer-motion';
import { Check, Plus, ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAX_QTY_PER_ITEM } from '@shared/commerce';
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { isSoldOut, toCartItem } from '@/lib/product';
import { useCartQty, useCartStore, type AddToCartResult } from '@/store/cartStore';
import { toast } from '@/store/toastStore';
import type { Product } from '@/types';
import { useEngineShake } from './useEngineShake';

export interface AddToCartButtonProps {
  product: Product;
  /** Units added per click (default 1). Clamped by stock and the per-collector max. */
  qty?: number;
  size?: ButtonSize;
  /** Idle variant (default `primary`). Sold-out / max states switch to `outline`. */
  variant?: ButtonVariant;
  fullWidth?: boolean;
  /** Idle label (default `Cart`, rendered as `+ CART`). */
  label?: ReactNode;
  className?: string;
  /** Called after every add with the cart result. */
  onAdded?: (result: AddToCartResult) => void;
}

/** How long the "ADDED" confirmation stays before settling into "IN PIT STOP". */
const ADDED_FLASH_MS = 1400;

/**
 * `+ CART` for a product. Adds through the Pit Stop cart store (`toCartItem`), toasts
 * "Added to your pit stop", plays the optional click sound and a 1–2px engine shake.
 * States: idle → ADDED (flash) → IN PIT STOP ×n (still adds +1) → MAX IN CART (disabled);
 * SOLD OUT is disabled.
 */
export function AddToCartButton({
  product,
  qty = 1,
  size = 'md',
  variant = 'primary',
  fullWidth = false,
  label = 'Cart',
  className,
  onAdded,
}: AddToCartButtonProps) {
  const inCartQty = useCartQty(product.id);
  const playSound = useSound();
  const { controls, variants, shake } = useEngineShake();
  const [justAdded, setJustAdded] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const soldOut = isSoldOut(product.stock);
  const maxQty = Math.max(0, Math.min(Math.floor(product.stock), MAX_QTY_PER_ITEM));
  /** The cap is the remaining stock, not the per-collector limit (copy must not blame the rule). */
  const stockLimited = maxQty < MAX_QTY_PER_ITEM;
  const atMax = !soldOut && inCartQty >= maxQty;
  const inCart = inCartQty > 0;
  const disabled = soldOut || atMax;

  const handleClick = (): void => {
    const result = useCartStore.getState().addItem(toCartItem(product), qty);
    onAdded?.(result);

    const limitTitle = stockLimited
      ? `Only ${formatNumber(maxQty)} in stock`
      : 'Max per collector reached';

    if (result.added === 0) {
      toast({
        title: limitTitle,
        description: `Your pit stop already holds ${result.qty} × ${product.name}.`,
      });
      return;
    }

    if (result.limited) {
      toast({
        title: limitTitle,
        description: `Your pit stop now holds ${result.qty} × ${product.name}.`,
      });
    } else {
      toast.success('Added to your pit stop', product.name);
    }

    playSound('click');
    shake();
    setJustAdded(true);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => {
      flashTimer.current = null;
      setJustAdded(false);
    }, ADDED_FLASH_MS);
  };

  let content: ReactNode;
  let accessibleName: string;
  let icon: ReactNode;
  let resolvedVariant: ButtonVariant = variant;

  if (soldOut) {
    content = 'Sold out';
    accessibleName = `Sold out – ${product.name}`;
    icon = null;
    resolvedVariant = 'outline';
  } else if (justAdded) {
    content = 'Added';
    accessibleName = `Added – ${product.name} is in your pit stop (${inCartQty})`;
    icon = <Check />;
  } else if (atMax) {
    content = 'Max in cart';
    accessibleName = stockLimited
      ? `Max in cart – ${inCartQty} × ${product.name}, every one in stock`
      : `Max in cart – ${inCartQty} × ${product.name} is the limit per collector`;
    icon = <ShoppingCart />;
    resolvedVariant = 'outline';
  } else if (inCart) {
    content = (
      <>
        In pit stop{' '}
        <span className="font-mono tabular-nums tracking-normal" aria-hidden="true">
          ×{inCartQty}
        </span>
      </>
    );
    accessibleName = `In pit stop (${inCartQty}) – add another ${product.name} to cart`;
    icon = <Plus />;
    resolvedVariant = variant === 'primary' ? 'secondary' : variant;
  } else {
    content = label;
    accessibleName = `Add ${product.name} to cart`;
    icon = <Plus />;
  }

  return (
    <motion.span
      className={cn('inline-flex', fullWidth && 'flex w-full', className)}
      initial="idle"
      animate={controls}
      variants={variants}
    >
      <Button
        variant={resolvedVariant}
        size={size}
        fullWidth={fullWidth}
        leftIcon={icon}
        disabled={disabled}
        // Adding the last allowed unit disables the button under the collector's focus.
        focusableWhenDisabled={atMax}
        aria-label={accessibleName}
        data-state={soldOut ? 'sold-out' : atMax ? 'max' : inCart ? 'in-cart' : 'idle'}
        onClick={handleClick}
        className={cn(justAdded && resolvedVariant !== 'primary' && 'text-success')}
      >
        {content}
      </Button>
    </motion.span>
  );
}
