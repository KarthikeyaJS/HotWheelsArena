/**
 * Product components barrel: `import { ProductCard, ProductGrid, … } from '@/components/product'`.
 * Docs: docs/components/product.md.
 */
export { CarImage, type CarImageProps } from './CarImage';
export {
  ProductCard,
  COLLECTOR_EDITION_MIN_SCORE,
  type ProductCardProps,
  type ProductCardVariant,
} from './ProductCard';
export { ProductCardSkeleton, type ProductCardSkeletonProps } from './ProductCardSkeleton';
export { ProductGrid, type ProductGridColumns, type ProductGridProps } from './ProductGrid';
export { VaultCard, type VaultCardLayout, type VaultCardProps } from './VaultCard';
export { HorizontalRail, type HorizontalRailGap, type HorizontalRailProps } from './HorizontalRail';
export { AddToCartButton, type AddToCartButtonProps } from './AddToCartButton';
export {
  WishlistButton,
  type WishlistButtonProps,
  type WishlistButtonVariant,
} from './WishlistButton';
export { AddToGarageButton, type AddToGarageButtonProps } from './AddToGarageButton';
export { StockStatus, type StockStatusProps, type StockStatusSize } from './StockStatus';
export { CollectorMeta, type CollectorMetaLayout, type CollectorMetaProps } from './CollectorMeta';
