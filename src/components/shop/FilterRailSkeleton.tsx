import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const GROUP_ROWS = [5, 0, 4, 1, 0, 1, 1, 4, 3] as const;

/** Racing-shimmer placeholder matching the filter rail's layout (decorative, `aria-hidden`). */
export function FilterRailSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      {GROUP_ROWS.map((rows, group) => (
        <div key={group} className="border-b border-line py-4 last:border-b-0">
          <Skeleton className="h-3 w-24 rounded" />
          {rows > 0 ? (
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-[18px] w-[18px] rounded" />
                  <Skeleton className="h-3 flex-1 rounded" />
                  <Skeleton className="h-3 w-5 rounded" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
