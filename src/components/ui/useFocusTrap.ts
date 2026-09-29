import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

function isVisible(element: HTMLElement): boolean {
  if (element.closest('[hidden], [inert]')) return false;
  if (typeof window.getComputedStyle !== 'function') return true;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** Keyboard-reachable elements inside `container`, in DOM order. */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      isVisible(element),
  );
}

/** Stack of active traps: only the top-most layer reacts to Esc / Tab / stray focus. */
const layerStack: object[] = [];

export interface FocusTrapOptions {
  /** Trap is active (usually the overlay's `open` flag). */
  active: boolean;
  /** Called when Escape is pressed while this layer is top-most. */
  onEscape?: () => void;
  /** Element to focus on activation. Falls back to `[data-autofocus]`, the first tabbable, then the container. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Restore focus to the previously focused element on deactivation (default true). */
  returnFocus?: boolean;
}

/**
 * Focus management for dialogs, drawers and palettes: moves focus inside on open, keeps Tab /
 * Shift+Tab cycling within the container, pulls stray focus back, closes on Escape and returns
 * focus to the trigger when deactivated. Nested layers are supported (top-most wins).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  { active, onEscape, initialFocusRef, returnFocus = true }: FocusTrapOptions,
): void {
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    const token = {};
    layerStack.push(token);
    const isTopLayer = (): boolean => layerStack[layerStack.length - 1] === token;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = (): void => {
      const container = containerRef.current;
      if (!container) return;
      if (container.contains(document.activeElement) && document.activeElement !== container) {
        return;
      }
      const tabbables = getTabbableElements(container);
      const target =
        initialFocusRef?.current ??
        container.querySelector<HTMLElement>('[data-autofocus]') ??
        tabbables.find((element) => !element.hasAttribute('data-dialog-close')) ??
        tabbables[0] ??
        container;
      target.focus();
    };

    focusInitial();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isTopLayer()) return;
      const container = containerRef.current;
      if (!container) return;

      if (event.key === 'Escape') {
        if (event.defaultPrevented || !onEscapeRef.current) return;
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const tabbables = getTabbableElements(container);
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      if (!first || !last) {
        event.preventDefault();
        container.focus();
        return;
      }
      const current = document.activeElement;
      const outside = !container.contains(current);
      if (event.shiftKey && (outside || current === first || current === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent): void => {
      if (!isTopLayer()) return;
      const container = containerRef.current;
      if (!container || !(event.target instanceof Node) || container.contains(event.target)) {
        return;
      }
      const [first] = getTabbableElements(container);
      (first ?? container).focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      const index = layerStack.indexOf(token);
      if (index >= 0) layerStack.splice(index, 1);
      if (returnFocus && previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, returnFocus]);
}
