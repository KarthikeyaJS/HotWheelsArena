import { Skeleton } from '@/components/ui/Skeleton';

/** Racing-shimmer placeholder matching the order detail layout. */
export function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40 rounded-sm" />
        <Skeleton className="h-10 w-72 rounded-md" />
        <Skeleton className="h-4 w-56 rounded-sm" />
      </div>
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-4 rounded-xl border border-line bg-card p-4">
              <Skeleton className="h-14 w-24 rounded-md" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3 rounded-sm" />
                <Skeleton className="h-3 w-1/3 rounded-sm" />
              </div>
              <Skeleton className="h-5 w-16 rounded-sm" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
