import { Skeleton } from '@/components/ui/Skeleton';

/** Racing-shimmer placeholders matching the orders list cards. */
export function OrdersListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-xl border border-line bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-2.5 w-36 rounded-sm" />
              <Skeleton className="h-5 w-40 rounded-sm" />
            </div>
            <Skeleton className="h-7 w-24 rounded" />
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((thumb) => (
                <Skeleton key={thumb} className="h-12 w-20 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-7 w-24 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
