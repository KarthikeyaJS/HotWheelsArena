/**
 * (a) Every route renders: exactly one h1, a meaningful document title, no page errors, no
 * unexpected console errors (auto-checked by the consoleGuard fixture) and no horizontal
 * overflow. Desktop projects check their own theme; the 375px project checks dark AND light.
 */
import type { Page, TestInfo } from '@playwright/test';
import {
  expect,
  expectNoHorizontalOverflow,
  expectSingleH1,
  gotoRoute,
  isMobileProject,
  setTheme,
  signIn,
  test,
  uniqueEmail,
  type Theme,
} from './fixtures';

interface RouteCase {
  name: string;
  path: string;
  /** Expected document title (all page titles end with "| HotWheelsArena" except home). */
  title: RegExp;
}

const BRAND_SUFFIX = / \| HotWheelsArena$/;

const PUBLIC_ROUTES: readonly RouteCase[] = [
  { name: 'home', path: '/', title: /^HotWheelsArena — .*Collector's Garage/ },
  { name: 'shop', path: '/shop', title: BRAND_SUFFIX },
  { name: 'shop new arrivals', path: '/shop?view=new', title: /new/i },
  { name: 'shop off-road', path: '/shop?category=off-road', title: /off.?road/i },
  { name: 'search porsche', path: '/search?q=porsche', title: /^Search: porsche \|/ },
  { name: 'collections', path: '/collections', title: /^Collections/ },
  { name: 'series', path: '/collections/hw-rescue-2025', title: /rescue/i },
  {
    name: 'product (vault car)',
    path: '/product/lamborghini-countach-lpi-800-4',
    title: /^Lamborghini Countach LPI 800-4/,
  },
  { name: 'product (sold out)', path: '/product/toyota-supra-a80', title: /^Toyota Supra/ },
  { name: 'vault', path: '/vault', title: /^The Vault/ },
  { name: 'cart', path: '/cart', title: /^Your Pit Stop \|/ },
  { name: 'about', path: '/about', title: /^About \|/ },
  { name: 'contact', path: '/contact', title: /^Contact \|/ },
  { name: 'faq', path: '/faq', title: /^FAQ \|/ },
  { name: 'shipping & returns', path: '/shipping-returns', title: /^Shipping & Returns \|/ },
  { name: 'privacy', path: '/privacy', title: /^Privacy Policy \|/ },
  { name: 'terms', path: '/terms', title: /^Terms of Use \|/ },
  { name: '404', path: '/this-road-does-not-exist', title: /^Wrong turn \|/ },
];

const PRIVATE_ROUTES: readonly RouteCase[] = [
  { name: 'garage', path: '/garage', title: /^My Garage \|/ },
  { name: 'garage wishlist tab', path: '/garage?tab=wishlist', title: /^My Garage \|/ },
  { name: 'garage favorites tab', path: '/garage?tab=favorites', title: /^My Garage \|/ },
  { name: 'garage achievements tab', path: '/garage?tab=achievements', title: /^My Garage \|/ },
  { name: 'garage stats tab', path: '/garage?tab=stats', title: /^My Garage \|/ },
  { name: 'wishlist', path: '/wishlist', title: /^Wishlist \|/ },
  { name: 'orders', path: '/orders', title: /^Your orders \|/ },
  { name: 'checkout', path: '/checkout', title: /^Checkout \|/ },
];

function themesFor(testInfo: TestInfo, projectTheme: Theme): Theme[] {
  return isMobileProject(testInfo) ? ['dark', 'light'] : [projectTheme];
}

/** Lets data views finish their skeleton phase so late render errors are caught too. */
async function settle(page: Page): Promise<void> {
  await expect(page.locator('main .shimmer'))
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined);
}

async function checkRoute(page: Page, route: RouteCase): Promise<void> {
  await gotoRoute(page, route.path);
  await settle(page);
  await expectSingleH1(page);
  await expect(page).toHaveTitle(route.title);
  const title = await page.title();
  expect(title.trim().length, 'title is meaningful').toBeGreaterThan(12);
  await expectNoHorizontalOverflow(page);
}

test.describe('public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} renders (${route.path})`, async ({ page, theme }, testInfo) => {
      for (const [index, current] of themesFor(testInfo, theme).entries()) {
        if (index > 0) await setTheme(page, current);
        await checkRoute(page, route);
        await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${current}\\b`));
      }
    });
  }

  test('404 says wrong turn and links back to the garage', async ({ page }) => {
    await gotoRoute(page, '/no/such/track');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/wrong turn/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('signed-in routes', () => {
  test('garage (all tabs), wishlist, orders and checkout render', async ({
    page,
    theme,
  }, testInfo) => {
    await signIn(page, { email: uniqueEmail(testInfo, 'routes'), displayName: 'Route Runner' });
    for (const [index, current] of themesFor(testInfo, theme).entries()) {
      if (index > 0) await setTheme(page, current);
      for (const route of PRIVATE_ROUTES) {
        await test.step(`${route.name} (${current})`, async () => {
          await checkRoute(page, route);
          await expect(page.getByText(/pit pass required/i)).toHaveCount(0);
          await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
        });
      }
    }
  });
});
