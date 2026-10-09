import { useRef, type ReactNode } from 'react';
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
  const showRef = useRef<HTMLElement>(null);
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
            onClick={() => {
              onClearAll();
              // This button disables itself once nothing is left to clear — move focus to the
              // "Show N cars" button so it stays inside the dialog instead of dropping to <body>.
              showRef.current?.focus();
            }}
            disabled={activeCount === 0}
            className="shrink-0"
          >
            Clear all
          </Button>
          <Button ref={showRef} onClick={onClose} className="min-w-0 flex-1">
            {showLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
