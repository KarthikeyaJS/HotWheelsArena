import { useIsPresent } from 'framer-motion';
import type { RefObject } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from './useFocusTrap';

export interface OverlayBehaviorOptions {
  onClose: () => void;
  /** Close on Escape while this overlay is the top-most layer (default true). */
  closeOnEsc?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Return focus to the element focused before opening (default true). */
  returnFocus?: boolean;
}

/**
 * Dialog plumbing for a panel rendered inside `<AnimatePresence>`: body scroll lock, focus
 * trap, Escape to close and focus return. Everything is released as soon as the exit
 * animation starts, so the page is interactive again immediately.
 * @returns whether the overlay is present (false while animating out).
 */
export function useOverlayBehavior(
  panelRef: RefObject<HTMLElement | null>,
  { onClose, closeOnEsc = true, initialFocusRef, returnFocus = true }: OverlayBehaviorOptions,
): boolean {
  const isPresent = useIsPresent();
  useLockBodyScroll(isPresent);
  useFocusTrap(panelRef, {
    active: isPresent,
    onEscape: closeOnEsc ? onClose : undefined,
    initialFocusRef,
    returnFocus,
  });
  return isPresent;
}
