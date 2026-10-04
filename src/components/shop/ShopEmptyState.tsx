import { CarFront, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { shopPath } from '@/config/routes';

export interface ShopEmptyStateProps {
  title: string;
  description: ReactNode;
  /** Primary action (e.g. clear filters). */
  onClear?: () => void;
  clearLabel?: string;
  /** Adds a "Browse all cars" link. */
  browseAll?: boolean;
  /** Extra content under the actions (e.g. suggestion chips). */
  children?: ReactNode;
}

/** Empty grid: "No machines on this track" + clear / browse actions with racing microcopy. */
export function ShopEmptyState({
  title,
  description,
  onClear,
  clearLabel = 'Clear filters',
  browseAll = false,
  children,
}: ShopEmptyStateProps) {
  return (
    <EmptyState
      icon={<CarFront />}
      title={title}
      titleAs="h3"
      size="lg"
      description={description}
      action={
        onClear || browseAll || children ? (
          <>
            {onClear ? (
              <Button onClick={onClear} leftIcon={<RotateCcw />}>
                {clearLabel}
              </Button>
            ) : null}
            {browseAll ? (
              <Button variant={onClear ? 'outline' : 'primary'} to={shopPath()}>
                Browse all cars
              </Button>
            ) : null}
            {children ? <div className="mt-2 basis-full">{children}</div> : null}
          </>
        ) : undefined
      }
    />
  );
}
