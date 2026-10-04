import { colorSwatch } from '@/config/shop';
import { cn } from '@/lib/cn';

export interface ColorSwatchProps {
  /** Paint colour name from the catalogue (`Red`, `Gold` …). */
  color: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Decorative paint chip for the COLOR facet (always paired with a text label, never colour
 * alone). Unknown colours fall back to the brushed-metal gradient.
 */
export function ColorSwatch({ color, size = 'md', className }: ColorSwatchProps) {
  const background = colorSwatch(color);
  return (
    <span
      aria-hidden="true"
      style={background ? { background } : undefined}
      className={cn(
        'relative inline-block shrink-0 rounded-full border border-fg/25 shadow-[inset_0_1px_1px_rgb(255_255_255/0.35),inset_0_-1px_2px_rgb(0_0_0/0.35)]',
        size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
        background ? null : 'bg-metal-gradient',
        className,
      )}
    />
  );
}
