import { Trash2 } from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface RemoveCarButtonProps {
  /** Car name for the accessible labels. */
  name: string;
  /** Called on the confirming (second) press. */
  onConfirm: () => void;
  disabled?: boolean;
  /** How long the armed state lasts (default 4s). */
  armedMs?: number;
  className?: string;
}

/**
 * Two-step remove control: the first press arms a red "Remove?" state (announced politely),
 * the second press confirms. Escape, blur or the timeout disarm it. It stays the same button
 * element in both states, so keyboard focus is never lost.
 */
export function RemoveCarButton({
  name,
  onConfirm,
  disabled = false,
  armedMs = 4000,
  className,
}: RemoveCarButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), armedMs);
    return () => clearTimeout(timer);
  }, [armed, armedMs]);

  const handleClick = (): void => {
    if (disabled) return;
    if (armed) {
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape' && armed) {
      event.stopPropagation();
      setArmed(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={() => setArmed(false)}
        disabled={disabled}
        aria-label={
          armed ? `Confirm: remove ${name} from your garage` : `Remove ${name} from your garage`
        }
        title={armed ? 'Press again to remove' : 'Remove from garage'}
        data-state={armed ? 'armed' : 'idle'}
        className={cn(
          'inline-flex h-9 shrink-0 select-none items-center justify-center gap-1.5 rounded-md font-display text-[11px] font-bold uppercase tracking-display transition-[background-color,color,border-color,width,transform] duration-200 ease-race active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:h-4 [&_svg]:w-4',
          armed
            ? 'bg-danger px-3 text-white hover:brightness-110'
            : 'w-9 border border-line text-muted hover:border-danger/60 hover:bg-danger/10 hover:text-danger-ink',
          className,
        )}
      >
        <Trash2 aria-hidden="true" />
        {armed ? <span aria-hidden="true">Remove?</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {armed ? `Press again to remove ${name}.` : ''}
      </span>
    </>
  );
}
