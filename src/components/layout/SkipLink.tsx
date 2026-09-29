import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SkipLinkProps {
  /** Id of the element to jump to (default `main-content`, AppLayout's `<main>`). */
  targetId?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * "Skip to content" link — hidden until focused (first Tab on every page). Moves focus to the
 * target programmatically so it works without changing the URL hash (SPA-safe).
 */
export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to content',
  className,
}: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    const target = document.getElementById(targetId);
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn('skip-link', className)}
    >
      {children}
    </a>
  );
}
