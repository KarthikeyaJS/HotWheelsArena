import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface KbdProps {
  children: ReactNode;
  className?: string;
}

/** Keyboard key cap, e.g. <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 select-none items-center justify-center rounded border border-line bg-surface px-1.5 font-mono text-[10px] font-semibold uppercase leading-none text-muted shadow-[inset_0_-1px_0_rgb(var(--border))]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
