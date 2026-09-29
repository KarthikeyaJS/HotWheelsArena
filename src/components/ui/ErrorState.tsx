import { AlertTriangle, RotateCcw } from 'lucide-react';
import { getFriendlyErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  /** Default "ENGINE TROUBLE". */
  title?: string;
  /** Any thrown value → friendly racing-themed message via `getFriendlyErrorMessage`. */
  error?: unknown;
  /** Explicit message (wins over `error`). */
  message?: string;
  /** Shows a retry button (e.g. TanStack `refetch`). */
  onRetry?: () => void;
  /** Default "Try again". */
  retryLabel?: string;
  /** Retry in progress → loading state on the button. */
  retrying?: boolean;
  /** Inline row layout for sections / cards. */
  compact?: boolean;
  /** Heading element for the title (default `h3`). */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
  className?: string;
}

/** Friendly error panel (`role="alert"`) with an optional retry. Never shows raw SDK errors. */
export function ErrorState({
  title = 'ENGINE TROUBLE',
  error,
  message,
  onRetry,
  retryLabel = 'Try again',
  retrying = false,
  compact = false,
  titleAs: Title = 'h3',
  className,
}: ErrorStateProps) {
  const text = message ?? getFriendlyErrorMessage(error);
  const retry = onRetry ? (
    <Button
      variant="secondary"
      size={compact ? 'sm' : 'md'}
      leftIcon={<RotateCcw />}
      loading={retrying}
      onClick={onRetry}
    >
      {retryLabel}
    </Button>
  ) : null;

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-start gap-4 rounded-lg border border-danger/30 bg-danger/[0.04] p-5 sm:flex-row sm:items-center',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-danger/30 bg-danger/10 text-danger-ink"
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Title className="font-display text-sm font-bold uppercase tracking-display text-fg">
            {title}
          </Title>
          <p className="mt-1 text-sm text-muted">{text}</p>
        </div>
        {retry}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'relative isolate flex flex-col items-center overflow-hidden rounded-xl border border-danger/25 bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <div aria-hidden="true" className="bg-grid bg-grid-fade absolute inset-0 -z-10 opacity-60" />
      <span
        aria-hidden="true"
        className="grid h-14 w-14 place-items-center rounded-lg border border-danger/30 bg-danger/10 text-danger-ink shadow-[0_0_28px_-10px_rgb(var(--accent-2)/0.7)]"
      >
        <AlertTriangle className="h-6 w-6" />
      </span>
      <p className="hud mt-5 text-danger-ink">PIT LANE · SYSTEM ALERT</p>
      <Title className="mt-2 font-display text-lg font-bold uppercase tracking-display text-fg sm:text-xl">
        {title}
      </Title>
      <p className="mt-2 max-w-md text-sm text-muted sm:text-base">{text}</p>
      {retry ? <div className="mt-6">{retry}</div> : null}
    </div>
  );
}
