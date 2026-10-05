import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Readable long-form typography for static pages (both themes): comfortable measure and
 * leading, orange-ink links, orange list markers, Orbitron h3s and mono `<code>`.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        'max-w-[70ch] text-[15px] leading-7 text-fg/85 sm:text-base sm:leading-7',
        '[&>*+*]:mt-4',
        '[&_a]:font-medium [&_a]:text-accent-ink [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-4 [&_a]:transition-colors',
        '[&_a:active]:opacity-80 [&_a:hover]:decoration-accent',
        '[&_strong]:font-semibold [&_strong]:text-fg',
        '[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5',
        '[&_li]:pl-1 [&_li]:marker:text-accent [&_ol>li]:marker:font-mono [&_ol>li]:marker:text-sm',
        '[&_h3]:!mt-8 [&_h3]:text-sm [&_h3]:text-fg sm:[&_h3]:text-base',
        '[&_code]:rounded [&_code]:bg-fg/[0.07] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_code]:text-fg',
        className,
      )}
    >
      {children}
    </div>
  );
}
