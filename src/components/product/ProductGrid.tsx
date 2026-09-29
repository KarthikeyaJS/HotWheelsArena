import { motion, type Variants } from 'framer-motion';
import { CarFront } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION, EASE_OUT_EXPO } from '@/lib/animations';
import { cn } from '@/lib/cn';
import type { Product } from '@/types';
import { ProductCard, type ProductCardVariant } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';

export type ProductGridColumns = 2 | 3 | 4;

export interface ProductGridProps {
  products: readonly Product[];
  /** Shows `skeletonCount` skeleton cards while true and there are no products yet. */
  isLoading?: boolean;
  /** Default 8. */
  skeletonCount?: number;
  /** Rendered when not loading and `products` is empty (default: generic empty bay). */
  emptyState?: ReactNode;
  /** Alias of `emptyState` (ARCHITECTURE contract name). */
  empty?: ReactNode;
  /** Max columns at the widest breakpoint: 1 → 2 → 3 → 4 (default 4). */
  columns?: ProductGridColumns;
  /** Card variant (default `default`). */
  variant?: ProductCardVariant;
  /** The first N cards load their images eagerly with high priority (LCP). Default 0. */
  priorityCount?: number;
  /** Heading level of each card's name (default `h3`). */
  cardHeadingAs?: 'h2' | 'h3' | 'h4';
  /** Accessible name of the list (e.g. "Featured collection"). */
  label?: string;
  /** Loading announcement (sr-only). */
  loadingLabel?: string;
  className?: string;
}

const COLUMN_CLASSES: Readonly<Record<ProductGridColumns, string>> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

/** fadeUp with a per-column stagger so each row ripples in left → right as it scrolls into view. */
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (column: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO, delay: column * 0.07 },
  }),
};

const reducedItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
};

const VIEWPORT = { once: true, amount: 0.15 } as const;

/**
 * Responsive collectible grid (1 → 2 → 3 → 4 columns). Loading → skeleton cards (with a
 * polite sr-only status); empty → `emptyState`; data → memoized ProductCards that fade up in a
 * staggered ripple the first time each row enters the viewport (fade only for reduced motion).
 */
export function ProductGrid({
  products,
  isLoading = false,
  skeletonCount = 8,
  emptyState,
  empty,
  columns = 4,
  variant = 'default',
  priorityCount = 0,
  cardHeadingAs = 'h3',
  label,
  loadingLabel = 'Loading cars…',
  className,
}: ProductGridProps) {
  const reduceMotion = useReducedMotion();
  const gridClasses = cn('grid gap-4 sm:gap-5 lg:gap-6', COLUMN_CLASSES[columns], className);

  if (isLoading && products.length === 0) {
    const count = Math.max(1, Math.floor(skeletonCount));
    return (
      <div role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{loadingLabel}</span>
        <div className={gridClasses}>
          {Array.from({ length: count }, (_, index) => (
            <ProductCardSkeleton key={index} variant={variant} />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <>
        {emptyState ?? empty ?? (
          <EmptyState
            icon={<CarFront />}
            title="This bay is empty"
            description="No cars match right now. Check back after the next drop."
          />
        )}
      </>
    );
  }

  return (
    <ul aria-label={label} className={gridClasses}>
      {products.map((product, index) => (
        <motion.li
          key={product.id}
          className="min-w-0"
          variants={reduceMotion ? reducedItemVariants : itemVariants}
          custom={index % columns}
          initial={index < priorityCount ? false : 'hidden'}
          whileInView="visible"
          viewport={VIEWPORT}
        >
          <ProductCard
            product={product}
            variant={variant}
            priority={index < priorityCount}
            headingAs={cardHeadingAs}
          />
        </motion.li>
      ))}
    </ul>
  );
}
