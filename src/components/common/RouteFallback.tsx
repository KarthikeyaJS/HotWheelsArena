import { cn } from '@/lib/cn';

export interface RouteFallbackProps {
  /** HUD label under the loader. */
  label?: string;
  /** Fill the viewport instead of a content-height block. */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Racing loader shown while a lazy route chunk loads (fades in after 200ms to avoid flashes).
 * Under reduced motion the speed line holds still.
 */
export function RouteFallback({
  label = 'WARMING UP ENGINE',
  fullScreen = false,
  className,
}: RouteFallbackProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'flex w-full animate-fade-in-delayed flex-col items-center justify-center gap-5 px-4',
        fullScreen ? 'min-h-screen min-h-[100svh]' : 'min-h-[50vh]',
        className,
      )}
    >
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="relative h-1 w-56 overflow-hidden rounded-full bg-line">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-speed-line rounded-full bg-accent shadow-glow-accent" />
      </div>
      <p aria-hidden="true" className="hud text-muted">
        {label}
        <span className="ml-3 text-accent-ink">RPM 8,200</span>
      </p>
    </div>
  );
}
