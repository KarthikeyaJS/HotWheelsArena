import { Skeleton } from '@/components/ui';

/**
 * Racing-shimmer placeholder matching the product page layout (breadcrumbs, gallery stage +
 * thumbnails, summary column). Decorative — `DataState` wraps it in a `role="status"` region.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-3 w-56" />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
          <div className="flex gap-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[4.5rem] w-24 rounded-lg sm:w-28" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-10 w-3/5" />
          <Skeleton className="h-4 w-40" />
          <Skeleton variant="text" lines={3} />
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
