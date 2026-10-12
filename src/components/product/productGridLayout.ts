export type ProductGridColumns = 2 | 3 | 4;

/**
 * Phones get two columns from 360px (ProductCard switches to its phone density below sm) and one
 * column below 360px. Reuse for hand-built card grids: `cn('grid', PRODUCT_GRID_COLUMNS[4],
 * PRODUCT_GRID_GAP)`.
 */
export const PRODUCT_GRID_COLUMNS: Readonly<Record<ProductGridColumns, string>> = {
  2: 'grid-cols-1 min-[360px]:grid-cols-2',
  3: 'grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

/** Card gap: 12px on phones (2-up), then 20 / 24px. */
export const PRODUCT_GRID_GAP = 'gap-3 sm:gap-5 lg:gap-6';
