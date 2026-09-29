import { Heart } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { IconButton, type IconButtonSize } from '@/components/ui/IconButton';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/cn';
import { useWishlistCount } from '@/store/garageStore';

export interface WishlistNavButtonProps {
  size?: IconButtonSize;
  className?: string;
}

/** Wishlist link with a count badge (mirror of the signed-in user's wishlist; 0 when signed out). */
export function WishlistNavButton({ size = 'md', className }: WishlistNavButtonProps) {
  const count = useWishlistCount();
  const { pathname } = useLocation();
  const active = pathname === ROUTES.wishlist;

  return (
    <IconButton
      label="Wishlist"
      to={ROUTES.wishlist}
      size={size}
      badge={count}
      badgeLabel={count === 1 ? 'car' : 'cars'}
      aria-current={active ? 'page' : undefined}
      className={cn(active && 'text-accent-ink', className)}
      icon={<Heart className={count > 0 ? 'fill-current' : undefined} />}
    />
  );
}
