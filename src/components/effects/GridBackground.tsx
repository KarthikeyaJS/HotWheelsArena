import { cn } from '@/lib/cn';

export interface GridBackgroundProps {
  /** Radial fade towards the edges (default true). */
  fade?: boolean;
  /** Tilted "garage floor" plane on the lower half instead of a flat grid. */
  perspective?: boolean;
  /** Add a soft orange floor glow under the grid (hero / feature sections). */
  glow?: boolean;
  className?: string;
}

/**
 * Subtle garage-floor grid (CSS only). Fills its positioned parent; decorative and
 * pointer-transparent. Line colour/opacity come from the theme tokens (`--grid-*`).
 */
export function GridBackground({
  fade = true,
  perspective = false,
  glow = false,
  className,
}: GridBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {perspective ? (
        <div className="absolute inset-x-0 bottom-0 h-3/5 [perspective:520px]">
          <div
            className={cn(
              'bg-grid absolute -inset-x-1/2 top-0 h-[180%] origin-top [transform:rotateX(64deg)]',
              fade &&
                '[mask-image:linear-gradient(to_bottom,transparent_0%,#000_22%,#000_55%,transparent_92%)]',
            )}
          />
        </div>
      ) : (
        <div className={cn('bg-grid absolute inset-0', fade && 'bg-grid-fade')} />
      )}
      {glow ? (
        <div className="absolute inset-x-[10%] bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgb(var(--accent)/0.14)_0%,transparent_65%)]" />
      ) : null}
    </div>
  );
}
