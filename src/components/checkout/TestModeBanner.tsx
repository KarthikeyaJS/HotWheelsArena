import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TestModeBannerProps {
  /** Provider label, e.g. "Test payments". */
  providerLabel?: string;
  className?: string;
}

/** Always-visible notice that checkout runs on simulated payments. */
export function TestModeBanner({ providerLabel, className }: TestModeBannerProps) {
  return (
    <div
      role="note"
      aria-label="Test mode"
      className={cn(
        'relative flex items-center gap-3 overflow-hidden rounded-lg border border-accent/45 bg-surface px-4 py-3',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-[repeating-linear-gradient(135deg,rgb(var(--accent))_0_6px,transparent_6px_12px)]"
      />
      <span
        aria-hidden="true"
        className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-on-accent [&_svg]:h-4 [&_svg]:w-4"
      >
        <FlaskConical />
      </span>
      <p className="min-w-0 text-sm text-fg">
        <span className="font-display text-xs font-bold uppercase tracking-display">Test mode</span>
        <span aria-hidden="true" className="mx-2 text-muted">
          —
        </span>
        <span className="sr-only">: </span>
        no real payment is taken. Cards, UPI and COD are simulated
        {providerLabel ? <span className="text-muted"> ({providerLabel})</span> : null}.
      </p>
    </div>
  );
}
