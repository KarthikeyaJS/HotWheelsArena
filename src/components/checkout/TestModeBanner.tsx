import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TestModeBannerProps {
  /** Provider label, e.g. "Test payments". */
  providerLabel?: string;
  className?: string;
}

/**
 * Always-visible notice that checkout runs on simulated payments. Phones and landscape phones get
 * a one-line strip (the method details move to the payment step's own copy).
 */
export function TestModeBanner({ providerLabel, className }: TestModeBannerProps) {
  return (
    <div
      role="note"
      aria-label="Test mode"
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-lg border border-accent/45 bg-surface px-4 py-2 sm:py-3 sm:short:py-2',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-[repeating-linear-gradient(135deg,rgb(var(--accent))_0_6px,transparent_6px_12px)]"
      />
      <span
        aria-hidden="true"
        className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-accent text-on-accent sm:h-8 sm:w-8 sm:short:h-7 sm:short:w-7 [&_svg]:h-4 [&_svg]:w-4"
      >
        <FlaskConical />
      </span>
      <p className="min-w-0 text-sm text-fg">
        <span className="font-display text-xs font-bold uppercase tracking-display">Test mode</span>
        <span aria-hidden="true" className="mx-2 text-muted">
          —
        </span>
        <span className="sr-only">: </span>
        no real payment is taken
        <span className="short:hidden max-sm:hidden">
          . Cards, UPI and COD are simulated
          {providerLabel ? <span className="text-muted"> ({providerLabel})</span> : null}
        </span>
        .
      </p>
    </div>
  );
}
