import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface VisuallyHiddenProps {
  children: ReactNode;
  /** Element to render (default `span`). Use `div`/`p` for block content. */
  as?: ElementType;
  /** Id so other elements can reference the text (e.g. `aria-describedby`). */
  id?: string;
  className?: string;
}

/**
 * Text that is read by screen readers but not shown on screen (Tailwind `sr-only`).
 * Use it for context a sighted user gets from layout or icons ("was", "opens in a new tab").
 */
export function VisuallyHidden({ children, as: Component = 'span', id, className }: VisuallyHiddenProps) {
  return (
    <Component id={id} className={cn('sr-only', className)}>
      {children}
    </Component>
  );
}
