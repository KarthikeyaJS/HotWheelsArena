import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Longest wait (ms) for a new route to settle before its title is announced anyway. */
export const ROUTE_SETTLE_TIMEOUT_MS = 3000;

/** The layout's `<main>` (AppLayout): focus target when navigation dropped focus. */
const MAIN_ID = 'main-content';
/** Route loaders (RouteFallback, AuthGateSkeleton) and data skeletons mark themselves busy. */
const BUSY_SELECTOR = `#${MAIN_ID} [aria-busy="true"]`;

/** True when focus fell back to the document (the activated control unmounted, or never moved). */
function focusWasLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || !active.isConnected;
}

/**
 * Announces client-side route changes to screen readers and repairs focus (WCAG 2.4.3 / 4.1.3).
 * Mounted once in RootLayout; renders a visually hidden polite live region `#route-announcer`.
 *
 * - Only pathname changes count: the initial load, search-only updates (shop filters, checkout
 *   `?step=`, garage tabs) and hash-only changes (FAQ anchors) are never announced. A load-time
 *   redirect (`<Navigate replace>` before the visitor has interacted) counts as the initial load.
 * - After a pathname change it waits until the route has settled: no `[aria-busy="true"]` loader
 *   inside `#main-content` AND `document.title` differs from the outgoing page's title, or
 *   {@link ROUTE_SETTLE_TIMEOUT_MS} has passed. Then it announces `document.title`.
 * - Focus moves to `#main-content` (`preventScroll`, so ScrollRestoration keeps charge of scroll)
 *   only when focus was lost (on `<body>`, null or disconnected), e.g. an activated product card
 *   unmounted. A still-mounted control (nav link, the palette/drawer return target, a checkout
 *   step heading) keeps focus.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const [message, setMessage] = useState('');
  const lastPathnameRef = useRef<string | null>(null);
  const navigationTypeRef = useRef(navigationType);
  const interactedRef = useRef(false);

  // Any pointer or key input means later navigations are the visitor's (not a load redirect).
  useEffect(() => {
    const options = { capture: true } as const;
    const markInteracted = () => {
      interactedRef.current = true;
      document.removeEventListener('pointerdown', markInteracted, options);
      document.removeEventListener('keydown', markInteracted, options);
    };
    document.addEventListener('pointerdown', markInteracted, options);
    document.addEventListener('keydown', markInteracted, options);
    return () => {
      document.removeEventListener('pointerdown', markInteracted, options);
      document.removeEventListener('keydown', markInteracted, options);
    };
  }, []);

  // Declared before the pathname effect so that effect always reads this commit's value.
  useLayoutEffect(() => {
    navigationTypeRef.current = navigationType;
  }, [navigationType]);

  // A layout effect runs before the new page's passive effects (useDocumentMeta), so
  // `document.title` still holds the outgoing page's title here.
  useLayoutEffect(() => {
    const previous = lastPathnameRef.current;
    lastPathnameRef.current = pathname;
    if (previous === null || previous === pathname) return undefined;
    if (navigationTypeRef.current === 'REPLACE' && !interactedRef.current) return undefined;

    const outgoingTitle = document.title;
    let finished = false;
    setMessage('');

    const finish = () => {
      if (finished) return;
      finished = true;
      observer.disconnect();
      window.clearTimeout(timer);
      setMessage(document.title);
      if (focusWasLost()) document.getElementById(MAIN_ID)?.focus({ preventScroll: true });
    };
    const check = () => {
      if (document.title !== outgoingTitle && document.querySelector(BUSY_SELECTOR) === null) {
        finish();
      }
    };

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-busy'],
    });
    const timer = window.setTimeout(finish, ROUTE_SETTLE_TIMEOUT_MS);

    return () => {
      finished = true;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return (
    <div
      id="route-announcer"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
