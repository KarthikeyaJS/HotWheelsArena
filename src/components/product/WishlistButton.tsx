import { motion, useAnimationControls, type AnimationControls } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
  Button,
  IconButton,
  type ButtonSize,
  type IconButtonSize,
  type IconButtonVariant,
} from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useWishlistActions } from '@/hooks/useWishlistActions';
import { EASE_OUT_EXPO } from '@/lib/animations';
import { cn } from '@/lib/cn';
import { useIsWishlisted } from '@/store/garageStore';
import type { Product } from '@/types';

export type WishlistButtonVariant = 'icon' | 'button';

export interface WishlistButtonProps {
  product: Pick<Product, 'id' | 'name'>;
  /** `icon` = heart IconButton (cards); `button` = labelled outline button (detail page). */
  variant?: WishlistButtonVariant;
  /** IconButton size for `icon` (`xs`–`lg`), Button size for `button` (`sm`–`lg`). Default `md`. */
  size?: IconButtonSize;
  /** Visual style of the icon variant (default `outline`). */
  iconVariant?: Exclude<IconButtonVariant, 'solid' | 'danger'>;
  fullWidth?: boolean;
  className?: string;
}

interface HeartIconProps {
  active: boolean;
  heart: AnimationControls;
  ring: AnimationControls;
}

/** Heart glyph + burst ring, driven by the parent's animation controls. */
function HeartIcon({ active, heart, ring }: HeartIconProps) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border-2 border-accent"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={ring}
      />
      <motion.span className="inline-flex" animate={heart}>
        <Heart
          className={cn(
            'transition-[fill,color] duration-200',
            active ? 'fill-current text-accent-ink' : 'fill-transparent',
          )}
        />
      </motion.span>
    </span>
  );
}

const BUTTON_SIZES: Readonly<Record<IconButtonSize, ButtonSize>> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

/**
 * ♡ wishlist toggle. Optimistic through `useWishlistActions` (which also opens the sign-in
 * prompt for signed-out visitors and runs the toggle right after sign-in). `aria-pressed`
 * reflects the saved state; the accessible name stays constant as the toggle pattern requires.
 */
export function WishlistButton({
  product,
  variant = 'icon',
  size = 'md',
  iconVariant = 'outline',
  fullWidth = false,
  className,
}: WishlistButtonProps) {
  const wishlisted = useIsWishlisted(product.id);
  const { toggleWishlist } = useWishlistActions();
  const reduceMotion = useReducedMotion();
  const heart = useAnimationControls();
  const ring = useAnimationControls();
  const userInitiated = useRef(false);

  // Pop only for a collector-initiated add (not for hydration after sign-in or other tabs).
  useEffect(() => {
    const shouldPop = wishlisted && userInitiated.current && !reduceMotion;
    userInitiated.current = false;
    if (!shouldPop) return;
    void heart.start({
      scale: [1, 1.45, 0.88, 1.08, 1],
      transition: { duration: 0.55, ease: EASE_OUT_EXPO },
    });
    void ring.start({
      scale: [0.4, 2.1],
      opacity: [0.7, 0],
      transition: { duration: 0.6, ease: 'easeOut' },
    });
  }, [wishlisted, reduceMotion, heart, ring]);

  const handleClick = (): void => {
    userInitiated.current = true;
    toggleWishlist({ id: product.id, name: product.name });
  };

  const accessibleName = `Save ${product.name} to wishlist`;
  const tooltip = wishlisted ? 'In your wishlist — click to remove' : 'Save to wishlist';
  const icon = <HeartIcon active={wishlisted} heart={heart} ring={ring} />;

  if (variant === 'button') {
    return (
      <Button
        variant="outline"
        size={BUTTON_SIZES[size]}
        fullWidth={fullWidth}
        aria-pressed={wishlisted}
        aria-label={accessibleName}
        title={tooltip}
        leftIcon={icon}
        onClick={handleClick}
        className={cn(wishlisted && 'border-accent/60 text-accent-ink', className)}
      >
        {wishlisted ? 'Wishlisted' : 'Wishlist'}
      </Button>
    );
  }

  return (
    <IconButton
      label={accessibleName}
      title={tooltip}
      variant={iconVariant}
      size={size}
      pressed={wishlisted}
      icon={icon}
      onClick={handleClick}
      className={className}
    />
  );
}
