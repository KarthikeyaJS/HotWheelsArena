import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface GarageGridSkeletonProps {
  count?: number;
  className?: string;
}

/** Racing-shimmer placeholders with the GarageCarCard layout (decorative; parent announces). */
export function GarageGridSkeleton({ count = 8, className }: GarageGridSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-card"
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-4">
            <Skeleton className="h-2.5 w-24 rounded-sm" />
            <Skeleton className="h-6 w-16 rounded" />
          </div>
          <div className="px-4 pt-2">
            <Skeleton className="aspect-[16/10] h-auto rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 p-4 pt-3">
            <div className="flex min-h-[2.5em] flex-col gap-2">
              <Skeleton className="h-3.5 w-4/5 rounded-sm" />
              <Skeleton className="h-3.5 w-1/2 rounded-sm" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-6 w-20 rounded" />
            </div>
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <Skeleton className="h-6 w-24 rounded-sm" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
