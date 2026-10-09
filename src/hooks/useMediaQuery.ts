import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind breakpoints as media queries (min-width). */
export const MEDIA_QUERIES = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  hover: '(hover: hover) and (pointer: fine)',
  /** Landscape phones (Tailwind `short:` variant). */
  short: '(max-height: 500px)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  prefersLight: '(prefers-color-scheme: light)',
} as const;

/**
 * Subscribes to a CSS media query. SSR / no-matchMedia environments return `fallback`.
 * @example const isDesktop = useMediaQuery(MEDIA_QUERIES.lg);
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined;
      }
      const mql = window.matchMedia(query);
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
      }
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = (): boolean =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : fallback;

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

/** ≥ 1024px. */
export function useIsDesktop(): boolean {
  return useMediaQuery(MEDIA_QUERIES.lg);
}

/** Device with a fine pointer that can hover (enables tilt / hover-only effects). */
export function useCanHover(): boolean {
  return useMediaQuery(MEDIA_QUERIES.hover);
}
