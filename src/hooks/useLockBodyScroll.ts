import { useEffect, useSyncExternalStore } from 'react';

let lockCount = 0;
let savedStyles: { overflow: string; paddingRight: string } | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getLocked = (): boolean => lockCount > 0;

/**
 * True while any modal / drawer / palette holds the scroll lock. The Toaster uses it to hold
 * toasts back so they never cover a dialog's actions.
 */
export function useIsScrollLocked(): boolean {
  return useSyncExternalStore(subscribe, getLocked, () => false);
}

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
    if (lockCount === 1) notify();

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        if (savedStyles) {
          body.style.overflow = savedStyles.overflow;
          body.style.paddingRight = savedStyles.paddingRight;
          savedStyles = null;
        }
        notify();
      }
    };
  }, [locked]);
}
