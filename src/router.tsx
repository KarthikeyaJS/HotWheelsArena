import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/components/common/RequireAuth';
import { RootLayout } from '@/components/common/RootLayout';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';
import { RouteFallback } from '@/components/common/RouteFallback';
import { shopPath } from '@/config/routes';

/* Every page is code-split. Page modules default-export their component. */
const HomePage = lazy(() => import('@/pages/HomePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage'));
const SeriesPage = lazy(() => import('@/pages/SeriesPage'));
const ProductPage = lazy(() => import('@/pages/ProductPage'));
const VaultPage = lazy(() => import('@/pages/VaultPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/OrderDetailPage'));
const GaragePage = lazy(() => import('@/pages/GaragePage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const ShippingReturnsPage = lazy(() => import('@/pages/ShippingReturnsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

type LazyPage = LazyExoticComponent<ComponentType>;

interface PageOptions {
  /** Wrap in RequireAuth (inline PIT PASS REQUIRED panel when signed out). */
  auth?: boolean;
  /** Reason shown on the pit-pass panel. */
  reason?: string;
}

/** Suspense (+ optional auth guard) around a lazy page. */
function renderPage(Page: LazyPage, options: PageOptions = {}) {
  const content = (
    <Suspense fallback={<RouteFallback />}>
      <Page />
    </Suspense>
  );
  if (!options.auth) return content;
  return options.reason ? (
    <RequireAuth reason={options.reason}>{content}</RequireAuth>
  ) : (
    <RequireAuth>{content}</RequireAuth>
  );
}

/** A page route with its own errorElement (renders inside the layout). */
function page(path: string, Page: LazyPage, options?: PageOptions): RouteObject {
  return { path, element: renderPage(Page, options), errorElement: <RouteErrorBoundary /> };
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          { index: true, element: renderPage(HomePage), errorElement: <RouteErrorBoundary /> },
          page('shop', ShopPage),
          page('search', SearchPage),
          page('collections', CollectionsPage),
          page('collections/:slug', SeriesPage),
          page('product/:slug', ProductPage),
          page('vault', VaultPage),
          page('cart', CartPage),
          page('checkout', CheckoutPage, {
            auth: true,
            reason:
              'Sign in with Google to check out — your order, XP and badges are saved to your garage.',
          }),
          page('checkout/success/:orderId', OrderSuccessPage, { auth: true }),
          page('orders', OrdersPage, {
            auth: true,
            reason: 'Sign in with Google to see your race history.',
          }),
          page('orders/:orderId', OrderDetailPage, { auth: true }),
          page('garage', GaragePage, {
            auth: true,
            reason:
              'Sign in with Google to open your garage, track your collection and earn badges.',
          }),
          page('wishlist', WishlistPage, {
            auth: true,
            reason: 'Sign in with Google to see the cars you have saved.',
          }),
          page('about', AboutPage),
          page('contact', ContactPage),
          page('faq', FaqPage),
          page('shipping-returns', ShippingReturnsPage),
          page('privacy', PrivacyPage),
          page('terms', TermsPage),
          {
            path: 'new-drops',
            element: <Navigate to={shopPath({ view: 'new' })} replace />,
            errorElement: <RouteErrorBoundary />,
          },
          page('*', NotFoundPage),
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});
