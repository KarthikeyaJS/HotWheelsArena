import { ChevronsDown, Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatNumber, pluralize } from '@/lib/format';

export interface LoadMoreProps {
  shown: number;
  total: number;
  pageSize: number;
  onLoadMore: () => void;
}

/** "Showing 12 of 30" + thin orange progress line + LOAD MORE (end-of-track flag when done). */
export function LoadMore({ shown, total, pageSize, onLoadMore }: LoadMoreProps) {
  const visible = Math.min(shown, total);
  const remaining = Math.max(0, total - visible);
  const next = Math.min(pageSize, remaining);

  return (
    <div className="mt-10 flex flex-col items-center gap-4 border-t border-line pt-8 text-center">
      <p className="hud text-muted">
        Showing <span className="text-fg">{formatNumber(visible)}</span> of{' '}
        <span className="text-fg">{formatNumber(total)}</span>
      </p>
      <ProgressBar
        value={visible}
        max={Math.max(1, total)}
        label="Machines on the grid"
        valueText={`${visible} of ${total} shown`}
        size="xs"
        animated={false}
        className="w-full max-w-xs"
      />
      {remaining > 0 ? (
        <Button
          variant="outline"
          size="lg"
          onClick={onLoadMore}
          rightIcon={<ChevronsDown />}
          className="min-w-52"
        >
          Load more
          <span className="sr-only"> ({pluralize(next, 'more machine', 'more machines')})</span>
        </Button>
      ) : total > pageSize ? (
        <p className="hud inline-flex items-center gap-2 text-muted">
          <Flag aria-hidden="true" className="h-3.5 w-3.5 text-accent-ink" />
          End of the track
        </p>
      ) : null}
    </div>
  );
}
