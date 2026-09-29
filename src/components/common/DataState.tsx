import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface DataStateProps {
  isLoading: boolean;
  isError: boolean;
  /** The query error → friendly message in `ErrorState`. */
  error?: unknown;
  /** Retry handler (e.g. TanStack `refetch`) → retry button on the error state. */
  onRetry?: () => void;
  /** Data loaded but nothing to show. */
  isEmpty?: boolean;
  /** Loading placeholder matching the final layout (default: generic skeleton blocks). */
  skeleton?: ReactNode;
  /** Empty view (default: a generic `EmptyState`). */
  empty?: ReactNode;
  /** Error title (default "ENGINE TROUBLE"). */
  errorTitle?: string;
  /** Compact inline error (for sections inside a page). */
  errorCompact?: boolean;
  /** Screen-reader text while loading (default "Loading…"). */
  loadingLabel?: string;
  className?: string;
  /** Content — or a function, so it only runs once data exists. */
  children: ReactNode | (() => ReactNode);
}

function DefaultSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-line bg-card p-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton variant="text" lines={2} />
        </div>
      ))}
    </div>
  );
}

/**
 * One switch for every data view: skeleton while loading → friendly error with retry →
 * empty state → content.
 *
 *   <DataState isLoading={q.isLoading} isError={q.isError} error={q.error} onRetry={() => void q.refetch()}
 *              isEmpty={q.data?.length === 0} skeleton={<GridSkeleton />} empty={<EmptyState title="…" />}>
 *     {() => <ProductGrid products={q.data ?? []} />}
 *   </DataState>
 */
export function DataState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty = false,
  skeleton,
  empty,
  errorTitle,
  errorCompact = false,
  loadingLabel = 'Loading…',
  className,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className={cn('w-full', className)}>
        <span className="sr-only">{loadingLabel}</span>
        {skeleton ?? <DefaultSkeleton />}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={onRetry}
        compact={errorCompact}
        className={className}
        {...(errorTitle ? { title: errorTitle } : {})}
      />
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('w-full', className)}>
        {empty ?? (
          <EmptyState
            title="Nothing on the grid yet"
            description="Check back soon — new machines roll into the garage all the time."
          />
        )}
      </div>
    );
  }

  return <>{typeof children === 'function' ? children() : children}</>;
}
