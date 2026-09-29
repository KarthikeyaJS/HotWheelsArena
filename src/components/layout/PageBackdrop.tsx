import { GridBackground } from '@/components/effects/GridBackground';
import { TireMarks } from '@/components/effects/TireMarks';
import { cn } from '@/lib/cn';

export interface PageBackdropProps {
  className?: string;
}

/**
 * Page-level garage backdrop behind every route: a very faint fixed grid plus skid marks.
 * Must sit inside an `isolate` container (AppLayout) so `-z-10` stays above the page colour.
 */
export function PageBackdrop({ className }: PageBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
    >
      <GridBackground className="opacity-60" />
      <TireMarks
        variant="drift"
        className="left-auto top-auto h-1/2 w-full text-fg/[0.03] sm:w-3/4"
      />
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgb(var(--accent)/0.06),transparent_70%)]" />
    </div>
  );
}
