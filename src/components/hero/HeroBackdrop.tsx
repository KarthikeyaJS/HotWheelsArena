import { memo } from 'react';
import { GridBackground } from '@/components/effects/GridBackground';
import { cn } from '@/lib/cn';

export interface HeroBackdropProps {
  className?: string;
}

/**
 * Static backdrop behind the home hero: the faint garage-floor grid (radially faded, colours from
 * the theme's `--grid-*` tokens) and a fade into the page background at the bottom edge, so the
 * hero blends into the next section. Decorative, pointer-transparent and motion-free.
 */
export const HeroBackdrop = memo(function HeroBackdrop({ className }: HeroBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      <GridBackground />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
});
