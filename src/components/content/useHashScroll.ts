import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Element id from a location hash (`#faq-returns` → `faq-returns`), or null. */
export function idFromHash(hash: string): string | null {
  if (!hash || hash === '#') return null;
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return hash.replace(/^#/, '');
  }
}

/**
 * Deep links on a lazily loaded page: the router's ScrollRestoration runs before the page chunk
 * has rendered, so on first render (once `ready`) scroll the hash target into view ourselves.
 * Later in-page hash navigations are handled by ScrollRestoration.
 */
export function useHashScroll(ready = true): void {
  const { hash } = useLocation();
  const initialHash = useRef(hash);
  const done = useRef(false);

  useEffect(() => {
    if (!ready || done.current) return undefined;
    const id = idFromHash(initialHash.current);
    if (!id) return undefined;
    const frame = window.requestAnimationFrame(() => {
      done.current = true;
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);
}
