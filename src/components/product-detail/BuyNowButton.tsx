import { ArrowRight, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, type ButtonSize } from '@/components/ui';
import { ROUTES } from '@/config/routes';
import { useSound } from '@/hooks/useSound';
import { isSoldOut, toCartItem } from '@/lib/product';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

export interface BuyNowButtonProps {
  product: Product;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/**
 * BUY NOW: puts one of this car in the Pit Stop (only if it isn't there already — the
 * collector's chosen quantity is kept) and heads straight to checkout. Plays the optional
 * engine-start cue. Disabled when the car is sold out.
 */
export function BuyNowButton({
  product,
  size = 'lg',
  fullWidth = false,
  className,
}: BuyNowButtonProps) {
  const navigate = useNavigate();
  const playSound = useSound();
  const [pending, setPending] = useState(false);
  const soldOut = isSoldOut(product.stock);

  const handleClick = (): void => {
    if (soldOut || pending) return;
    setPending(true);
    const cart = useCartStore.getState();
    const alreadyInCart = cart.items.some((item) => item.productId === product.id);
    if (!alreadyInCart) cart.addItem(toCartItem(product), 1);
    playSound('start');
    navigate(ROUTES.checkout);
  };

  return (
    <Button
      variant={soldOut ? 'outline' : 'primary'}
      size={size}
      fullWidth={fullWidth}
      disabled={soldOut}
      loading={pending}
      loadingText="Starting engine…"
      leftIcon={soldOut ? undefined : <Zap />}
      rightIcon={soldOut ? undefined : <ArrowRight />}
      aria-label={
        pending ? undefined : soldOut ? `Sold out – ${product.name}` : `Buy ${product.name} now`
      }
      data-state={soldOut ? 'sold-out' : 'idle'}
      onClick={handleClick}
      className={className}
    >
      {soldOut ? 'Sold out' : 'Buy now'}
    </Button>
  );
}
