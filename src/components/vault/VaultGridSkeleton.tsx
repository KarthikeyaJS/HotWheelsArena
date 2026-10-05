import { Skeleton } from '@/components/ui/Skeleton';
import { VAULT_GRID_CLASSES as GRID } from './vaultLayout';

/** Loading placeholder matching the VaultCard layout (aria-hidden; wrap in DataState). */
export function VaultGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className={GRID}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-2xl border border-highlight/20 bg-card p-5"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
          <Skeleton className="aspect-[16/10] rounded-xl" />
          <Skeleton variant="text" className="w-40" />
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-2.5 rounded-full" />
          <div className="flex items-center justify-between border-t border-line pt-4">
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-10 w-36 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
