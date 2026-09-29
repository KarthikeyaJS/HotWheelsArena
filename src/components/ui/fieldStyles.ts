import { cn } from '@/lib/cn';

export type FieldSize = 'sm' | 'md' | 'lg';

/**
 * Shared look for Input / Textarea / Select. Mobile gets 16px text (prevents iOS zoom on focus),
 * focus = orange border + tight orange ring, invalid = red border + red ring.
 */
const FIELD_BASE =
  'block w-full min-w-0 rounded-md border border-line bg-surface font-sans text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow,background-color] duration-150 ease-race placeholder:text-muted hover:border-fg/30 focus-visible:border-accent focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-fg/[0.04] disabled:text-muted disabled:hover:border-line aria-[invalid=true]:border-danger aria-[invalid=true]:hover:border-danger aria-[invalid=true]:focus-visible:outline-danger';

const FIELD_SIZES: Readonly<Record<FieldSize, string>> = {
  sm: 'h-9 px-3 text-base sm:text-sm',
  md: 'h-11 px-3.5 text-base sm:text-sm',
  lg: 'h-12 px-4 text-base',
};

const MULTILINE = 'min-h-[7.5rem] resize-y px-3.5 py-3 text-base leading-relaxed sm:text-sm';

export interface FieldClassOptions {
  size?: FieldSize;
  multiline?: boolean;
  className?: string;
}

/** Class string for a text field (`<input>`, `<textarea>`, `<select>`). */
export function fieldClasses({ size = 'md', multiline = false, className }: FieldClassOptions = {}): string {
  return cn(FIELD_BASE, multiline ? MULTILINE : FIELD_SIZES[size], className);
}

/** Left padding when a field has a leading icon. */
export const FIELD_ICON_PADDING: Readonly<Record<FieldSize, string>> = {
  sm: 'pl-9',
  md: 'pl-10',
  lg: 'pl-11',
};
