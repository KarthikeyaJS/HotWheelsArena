import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { formatNumber } from '@/lib/format';

export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Live result count for the "SHOW 24 MACHINES" CTA (`null` while loading). */
  resultCount: number | null;
  activeCount: number;
  onClearAll: () => void;
  children: ReactNode;
}

/** Below `lg` the filter rail lives in this left drawer; filters apply live while it's open. */
export function FilterDrawer({
  open,
  onClose,
  resultCount,
  activeCount,
  onClearAll,
  children,
}: FilterDrawerProps) {
  const showLabel =
    resultCount === null
      ? 'Show cars'
      : `Show ${formatNumber(resultCount)} ${resultCount === 1 ? 'car' : 'cars'}`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      size="md"
      eyebrow="Tune the grid"
      title="Filters"
      closeLabel="Close filters"
      bodyClassName="pt-0"
      footer={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="shrink-0"
          >
            Clear all
          </Button>
          <Button onClick={onClose} className="min-w-0 flex-1">
            {showLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
