import { useEffect } from 'react';

let lockCount = 0;
let savedStyles: { overflow: string; paddingRight: string } | null = null;

/**
 * Prevents body scrolling while `locked` is true (modals, drawers, command palette).
 * Reference-counted, so nested overlays work; compensates for the scrollbar width.
 */
export function useLockBodyScroll(locked = true): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;
    const { body, documentElement } = document;

    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      savedStyles = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && savedStyles) {
        body.style.overflow = savedStyles.overflow;
        body.style.paddingRight = savedStyles.paddingRight;
        savedStyles = null;
      }
    };
  }, [locked]);
}
