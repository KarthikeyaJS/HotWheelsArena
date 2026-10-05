import { Skeleton } from '@/components/ui/Skeleton';

/** Loading placeholder for the collections grid (aria-hidden; wrap in DataState). */
export function SeriesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card"
        >
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="flex flex-col gap-3 p-5">
            <Skeleton variant="text" className="w-36" />
            <Skeleton className="h-6 w-2/3 rounded" />
            <Skeleton variant="text" lines={2} />
            <Skeleton className="mt-2 h-1.5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
