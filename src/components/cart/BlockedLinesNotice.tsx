import { AlertOctagon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { pluralize } from '@/lib/format';
import type { ReconciledCartLine } from './reconcile';

export interface BlockedLinesNoticeProps {
  blocked: readonly ReconciledCartLine[];
  onRemoveAll: () => void;
  headingAs?: 'h2' | 'h3';
  className?: string;
}

/** Sold-out / retired cars block the checkout — explain and offer a one-click clean-up. */
export function BlockedLinesNotice({
  blocked,
  onRemoveAll,
  headingAs: Heading = 'h2',
  className,
}: BlockedLinesNoticeProps) {
  if (blocked.length === 0) return null;

  return (
    <section
      role="alert"
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-xl border border-danger/45 bg-danger/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-danger" />
      <div className="flex items-start gap-3">
        <AlertOctagon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
        <div className="min-w-0">
          <Heading className="font-display text-xs font-bold uppercase tracking-display text-fg sm:text-sm">
            {pluralize(blocked.length, 'car')} can't make this race
          </Heading>
          <p className="mt-1 text-sm text-muted">
            {blocked.map((line) => line.item.name).join(', ')} {blocked.length === 1 ? 'is' : 'are'}{' '}
            sold out or no longer available. Remove {blocked.length === 1 ? 'it' : 'them'} to start
            your engine.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Trash2 />}
        onClick={onRemoveAll}
        className="shrink-0 self-start sm:self-center"
      >
        Remove unavailable
      </Button>
    </section>
  );
}
