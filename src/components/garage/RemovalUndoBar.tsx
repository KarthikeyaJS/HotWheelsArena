import { motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { UNDO_WINDOW_MS, type PendingRemoval } from './useRemovalQueue';

export interface RemovalUndoBarProps {
  pending: readonly PendingRemoval[];
  onUndo: (productId: string) => void;
  onDismiss: (productId: string) => void;
  /** Where focus goes when the bar empties while focus is inside it. */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  windowMs?: number;
  className?: string;
}

/** Draining orange line over the remaining undo window (framer; static for reduced motion). */
function CountdownLine({ expiresAt, windowMs }: { expiresAt: number; windowMs: number }) {
  const [remaining] = useState(() => Math.max(0, expiresAt - Date.now()));
  const start = windowMs > 0 ? Math.min(1, remaining / windowMs) : 0;
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent"
      initial={{ scaleX: start }}
      animate={{ scaleX: 0 }}
      transition={{ duration: remaining / 1000, ease: 'linear' }}
    />
  );
}

/** Shown at most at once (newest first); older removals keep counting down silently. */
const MAX_VISIBLE = 3;

/**
 * Sticky "car removed — UNDO" bar for the garage. Focus moves to the newest Undo button (the
 * removed card's controls are gone), and back to `fallbackFocusRef` when the bar empties.
 * The countdown line drains over the undo window (static for reduced motion).
 */
export function RemovalUndoBar({
  pending,
  onUndo,
  onDismiss,
  fallbackFocusRef,
  windowMs = UNDO_WINDOW_MS,
  className,
}: RemovalUndoBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const undoRefs = useRef(new Map<string, HTMLElement>());
  const newestId = pending[0]?.productId ?? null;
  const previousNewest = useRef<string | null>(null);
  const hadFocus = useRef(false);

  useEffect(() => {
    if (newestId && newestId !== previousNewest.current) {
      undoRefs.current.get(newestId)?.focus({ preventScroll: true });
    }
    previousNewest.current = newestId;
  }, [newestId]);

  useEffect(() => {
    if (pending.length === 0 && hadFocus.current) {
      hadFocus.current = false;
      fallbackFocusRef?.current?.focus({ preventScroll: true });
    }
  }, [pending.length, fallbackFocusRef]);

  const visible = pending.slice(0, MAX_VISIBLE);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Recently removed cars"
      onFocus={() => {
        hadFocus.current = true;
      }}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget)) hadFocus.current = false;
      }}
      className={cn(
        'pointer-events-none sticky bottom-4 z-20 flex flex-col items-center gap-2',
        className,
      )}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {pending[0] ? `${pending[0].name} removed from your garage. Undo is available.` : ''}
      </p>
      {visible.map((item) => (
        <div
          key={item.productId}
          className="pointer-events-auto relative flex w-full max-w-xl animate-fade-in items-center gap-3 overflow-hidden rounded-lg border border-line bg-surface/95 py-2.5 pl-4 pr-2 shadow-card-hover backdrop-blur"
        >
          <p className="min-w-0 flex-1 text-sm text-fg">
            <span className="hud mr-2 text-2xs text-muted">Pulled from the garage</span>
            <span className="block truncate font-semibold sm:inline">{item.name}</span>
          </p>
          <Button
            ref={(element: HTMLElement | null) => {
              if (element) undoRefs.current.set(item.productId, element);
              else undoRefs.current.delete(item.productId);
            }}
            size="sm"
            variant="secondary"
            leftIcon={<RotateCcw />}
            aria-label={`Undo — put ${item.name} back in your garage`}
            onClick={() => onUndo(item.productId)}
          >
            Undo
          </Button>
          <IconButton
            size="sm"
            label={`Dismiss — remove ${item.name} now`}
            icon={<X />}
            onClick={() => onDismiss(item.productId)}
          />
          <CountdownLine expiresAt={item.expiresAt} windowMs={windowMs} />
        </div>
      ))}
      {pending.length > MAX_VISIBLE ? (
        <p className="hud pointer-events-auto rounded bg-surface/90 px-2 py-1 text-xs text-muted">
          +{pending.length - MAX_VISIBLE} more waiting
        </p>
      ) : null}
    </div>
  );
}
