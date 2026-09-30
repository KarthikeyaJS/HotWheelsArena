import { RotateCcw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';

export interface RemovedLineNoticeProps {
  name: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** Focus the Undo button on mount (the removed line's controls just disappeared). */
  focusOnMount?: boolean;
  className?: string;
}

/**
 * Placeholder left where a line was removed: "Removed X" + UNDO. It stays until undone or
 * dismissed (no timer, so nobody has to race a countdown to undo).
 */
export function RemovedLineNotice({
  name,
  onUndo,
  onDismiss,
  focusOnMount = false,
  className,
}: RemovedLineNoticeProps) {
  const undoRef = useRef<HTMLElement>(null);
  const focusOnMountRef = useRef(focusOnMount);

  useEffect(() => {
    if (focusOnMountRef.current) undoRef.current?.focus();
  }, []);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-3',
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-sm text-muted">
        <span className="hud mr-2 text-muted">PULLED OUT</span>
        <span className="text-fg">{name}</span> left your pit stop.
      </p>
      <div className="flex items-center gap-1">
        <Button
          ref={undoRef}
          variant="secondary"
          size="sm"
          leftIcon={<RotateCcw />}
          onClick={onUndo}
          aria-label={`Undo — put ${name} back in your pit stop`}
        >
          Undo
        </Button>
        <IconButton
          label={`Dismiss the removed ${name} notice`}
          icon={<X />}
          variant="ghost"
          size="sm"
          onClick={onDismiss}
        />
      </div>
    </div>
  );
}
