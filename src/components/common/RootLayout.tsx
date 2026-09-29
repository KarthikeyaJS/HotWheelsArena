import { ScrollRestoration } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Root route element (core-owned glue): the app layout plus scroll management.
 * ScrollRestoration scrolls to top on new navigations and restores position on back/forward.
 * Filter-style URL updates must pass `preventScrollReset: true` to keep the scroll position.
 */
export function RootLayout() {
  return (
    <>
      <AppLayout />
      <ScrollRestoration />
    </>
  );
}
