import { useScrollProgress } from '@/hooks/useScrollProgress';
import { cn } from '@/lib/cn';

export interface ScrollProgressProps {
  className?: string;
}

/**
 * Thin orange scroll-progress line (rAF-throttled via `useScrollProgress`). Rendered along the
 * bottom edge of the sticky Navbar; decorative (`aria-hidden`) — the native scrollbar conveys
 * the same information.
 */
export function ScrollProgress({ className }: ScrollProgressProps) {
  const progress = useScrollProgress();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent shadow-[0_0_10px_rgb(var(--accent)/0.65)] transition-opacity duration-300',
        progress > 0 ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={{ transform: `scaleX(${progress})` }}
    />
  );
}
