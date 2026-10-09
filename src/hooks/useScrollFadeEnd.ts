import { useEffect, useState, type RefObject } from 'react';

/** Pixels of slack before the end counts as reached (sub-pixel scroll positions). */
const END_TOLERANCE = 4;

/**
 * True while a horizontal scroller has more content past its inline-end edge. Pair it with the
 * `.scroll-fade-x` utility so the fade only shows while there is something left to swipe to:
 * `className={cn('overflow-x-auto', fadeEnd && 'scroll-fade-x')}`.
 * Re-checks on scroll and whenever the scroller or its content resizes.
 */
export function useScrollFadeEnd(ref: RefObject<HTMLElement | null>): boolean {
  const [fadeEnd, setFadeEnd] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const update = (): void => {
      setFadeEnd(element.scrollWidth - element.clientWidth - element.scrollLeft > END_TOLERANCE);
    };
    update();

    element.addEventListener('scroll', update, { passive: true });
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(update);
      observer.observe(element);
      if (element.firstElementChild) observer.observe(element.firstElementChild);
    }
    return () => {
      element.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [ref]);

  return fadeEnd;
}
