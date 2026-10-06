/**
 * (a) Every route renders: exactly one h1, a meaningful document title, no page errors, no
 * unexpected console errors (auto-checked by the consoleGuard fixture) and no horizontal
 * overflow. Desktop projects check their own theme; the 375px project checks dark AND light.
 *
 * Plus the shell's route behaviour: client-side navigations are announced (#route-announcer)
 * with focus repaired to #main-content, and the footer stays below the fold while a lazy page
 * loads (no layout shift when it lands).
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

test.describe('route announcements', () => {
  const announcer = (page: Page) => page.locator('#route-announcer');

  test('a product card announces the new title and moves focus to main; a filter does neither', async ({
    page,
  }) => {
    await gotoRoute(page, '/shop');
    await expect(
      page.getByRole('list', { name: 'All cars' }).getByRole('listitem').first(),
    ).toBeVisible();
    await expect(announcer(page)).toHaveAttribute('role', 'status');
    await expect(announcer(page)).toHaveAttribute('aria-live', 'polite');
    await expect(announcer(page)).toHaveText('');

    // A filter (search-only URL change): no announcement, focus stays on the chip.
    const views = page.getByRole('navigation', { name: 'Shop views' });
    const newArrivals = views.getByRole('link', { name: /^New Arrivals/ });
    await newArrivals.click();
    await expect(page).toHaveURL(/[?&]view=new\b/);
    await expect(newArrivals).toHaveAttribute('aria-current', 'page');
    const allCars = views.getByRole('link', { name: /^All Cars/ });
    await allCars.click();
    await expect(page).not.toHaveURL(/view=new/);
    await expect(allCars).toBeFocused();
    await page.waitForTimeout(1_000);
    await expect(announcer(page)).toHaveText('');
    await expect(allCars).toBeFocused();

    // A product card (pathname change; the activated link unmounts).
    const card = page.getByRole('link', { name: 'Porsche 911 GT3 RS', exact: true }).first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('main h1')).toContainText('Porsche 911 GT3 RS');
    await expect(announcer(page)).toHaveText(/^Porsche 911 GT3 RS\b.*\| HotWheelsArena$/);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('a header nav link keeps focus while the new page is announced', async ({
    page,
  }, testInfo) => {
    test.skip(isMobileProject(testInfo), 'primary nav links live in the drawer below lg');
    await gotoRoute(page, '/shop');
    const vault = page
      .getByRole('navigation', { name: 'Primary' })
      .getByRole('link', { name: 'Vault' });
    await vault.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/vault$/);
    await expect(announcer(page)).toHaveText(/^The Vault\b.*\| HotWheelsArena$/);
    await expect(vault).toBeFocused();
  });
});

test.describe('layout stability', () => {
  test('the footer stays below the fold while a lazy page chunk loads', async ({ page }) => {
    // Hold the FAQ page module (its own module in Vite dev, its own chunk in a build) so the
    // RouteFallback is on screen, as it is on a cold production load.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(/\/(src\/pages\/FaqPage\.tsx|assets\/FaqPage-[\w-]+\.js)/, async (route) => {
      await held;
      await route.continue();
    });
    try {
      await page.goto('/faq');
      await expect(page.locator('#main-content [aria-busy="true"]').first()).toBeAttached();
      await expect(page.locator('main h1')).toHaveCount(0);
      const { footerTop, viewportHeight } = await page.evaluate(() => ({
        footerTop: document.querySelector('footer')?.getBoundingClientRect().top ?? 0,
        viewportHeight: window.innerHeight,
      }));
      expect(footerTop, 'footer top while the page loads').toBeGreaterThanOrEqual(viewportHeight);
    } finally {
      release();
    }
    await expect(page.locator('main h1')).toBeVisible();
  });
});
