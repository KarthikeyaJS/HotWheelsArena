import { ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { ROUTES } from '@/config/routes';
import { usePrevious } from '@/hooks/usePrevious';
import { cn } from '@/lib/cn';
import { useCartCount } from '@/store/cartStore';

export interface CartButtonProps {
  size?: IconButtonSize;
  className?: string;
}

/**
 * Pit-stop cart link with an item-count badge. The icon does a 1–2px engine shake (and the
 * badge pops) whenever the count goes up; static under reduced motion.
 */
export function CartButton({ size = 'md', className }: CartButtonProps) {
  const count = useCartCount();
  const previous = usePrevious(count);
  const [bumps, setBumps] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    if (previous !== undefined && count > previous) setBumps((value) => value + 1);
  }, [count, previous]);

  return (
    <IconButton
      label="Pit stop cart"
      to={ROUTES.cart}
      size={size}
      badge={count}
      badgeLabel={count === 1 ? 'item' : 'items'}
      aria-current={pathname === ROUTES.cart ? 'page' : undefined}
      className={cn(pathname === ROUTES.cart && 'text-accent-ink', className)}
      icon={
        <span key={bumps} className={cn('inline-flex', bumps > 0 && 'animate-engine-shake')}>
          <ShoppingCart />
        </span>
      }
    />
  );
}
