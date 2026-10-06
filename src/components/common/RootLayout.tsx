import { ScrollRestoration } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RouteAnnouncer } from './RouteAnnouncer';

/**
 * Root route element (core-owned glue): the app layout plus scroll and focus management.
 * ScrollRestoration scrolls to top on new navigations and restores position on back/forward.
 * Filter-style URL updates must pass `preventScrollReset: true` to keep the scroll position.
 * RouteAnnouncer announces each new page's title to screen readers once it has settled and
 * moves focus to `#main-content` when navigation dropped it.
 */
export function RootLayout() {
  return (
    <>
      <AppLayout />
      <RouteAnnouncer />
      <ScrollRestoration />
    </>
  );
}
