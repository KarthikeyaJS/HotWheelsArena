import { Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ProductCardVariant } from './ProductCard';

export interface ProductCardSkeletonProps {
  variant?: ProductCardVariant;
  className?: string;
}

/**
 * Racing-shimmer placeholder with the exact ProductCard layout (HUD row, 16:10 stage, name,
 * rating, meta, stock/price + actions), so the grid doesn't jump when data arrives.
 * Decorative (`aria-hidden`): the parent grid/DataState announces the loading state.
 */
export function ProductCardSkeleton({ variant = 'default', className }: ProductCardSkeletonProps) {
  const compact = variant === 'compact';
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          compact ? 'px-3 pt-3' : 'px-4 pt-4',
        )}
      >
        <Skeleton className="h-2.5 w-24 rounded-sm" />
        <Skeleton className="h-6 w-16 rounded" />
      </div>
      <div className={compact ? 'px-3 pt-1' : 'px-4 pt-2'}>
        <Skeleton className="aspect-[16/10] h-auto rounded-lg" />
      </div>
      <div className={cn('flex flex-1 flex-col', compact ? 'gap-2.5 p-3 pt-2' : 'gap-3 p-4 pt-3')}>
        <div className="flex min-h-[2.5em] flex-col gap-2">
          <Skeleton className="h-3.5 w-4/5 rounded-sm" />
          <Skeleton className="h-3.5 w-1/2 rounded-sm" />
        </div>
        <Skeleton className="h-3 w-28 rounded-sm" />
        <Skeleton className="h-2.5 w-36 rounded-sm" />
        <div
          className={cn(
            'mt-auto flex items-end justify-between gap-3 border-t border-line',
            compact ? 'pt-2.5' : 'pt-3',
          )}
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-16 rounded-sm" />
            <Skeleton className="h-5 w-20 rounded-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
