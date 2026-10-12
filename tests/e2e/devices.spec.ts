/**
 * Device-matrix regression guard (mobile & responsive pass). Real device profiles — UA, DPR,
 * isMobile, hasTouch — on key public routes:
 * - no sideways page scroll and no element wider than the viewport (outside clipping scrollers);
 * - exactly one h1;
 * - the primary navigation is reachable (hamburger → drawer below lg);
 * - header controls and product-card actions have hit areas ≥ 40px (invisible `::after` hit-area
 *   expansions count, as on a real touch screen);
 * - no console errors (the auto `consoleGuard` fixture fails the test on any).
 * Runs once, in the `desktop-dark` project only (each device sets its own viewport/touch), so the
 * three projects don't triple it. Only Chromium is installed, so iPhone profiles run in Chromium
 * with the iPhone UA / metrics.
 */
import { devices, type Page } from '@playwright/test';
import { expect, expectNoHorizontalOverflow, expectSingleH1, gotoRoute, test } from './fixtures';

interface DeviceCase {
  id: string;
  profile: string;
  /** Real in-browser viewport (browser UI excluded) where it differs from the profile. */
  viewport?: { width: number; height: number };
}

const DEVICES: readonly DeviceCase[] = [
  { id: 'iPhone SE (320)', profile: 'iPhone SE', viewport: { width: 320, height: 568 } },
  { id: 'Galaxy S9+ (360)', profile: 'Galaxy S9+', viewport: { width: 360, height: 740 } },
  { id: 'iPhone 13 (390)', profile: 'iPhone 13', viewport: { width: 390, height: 664 } },
  { id: 'Pixel 7 (412)', profile: 'Pixel 7', viewport: { width: 412, height: 839 } },
  {
    id: 'iPhone 14 Pro Max (430)',
    profile: 'iPhone 14 Pro Max',
    viewport: { width: 430, height: 740 },
  },
  {
    id: 'iPhone 13 landscape (844)',
    profile: 'iPhone 13 landscape',
    viewport: { width: 844, height: 390 },
  },
  { id: 'iPad Mini (768)', profile: 'iPad Mini' },
];

const ROUTES = [
  '/',
  '/shop',
  '/search?q=porsche',
  '/product/porsche-911-gt3-rs',
  '/vault',
  '/collections',
  '/cart',
  '/about',
  '/faq',
  '/this-road-does-not-exist',
] as const;

/** Routes whose product cards load after the heading (wait for them before measuring). */
const CARD_ROUTES = new Set<string>(['/shop', '/search?q=porsche']);

/** Minimum hit area for the checked controls (44 is the goal; 40 the floor for dense rows). */
const MIN_TARGET = 40;

/** Elements whose box crosses the viewport edge without a clipping/fixed ancestor. */
async function elementsWiderThanViewport(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const clipped = (element: Element): boolean => {
      for (
        let node = element.parentElement;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        if (style.position === 'fixed' || style.overflowX !== 'visible') return true;
      }
      return false;
    };
    return [...document.body.querySelectorAll('*')]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) return false;
        if (box.right <= width + 1 && box.left >= -1) return false;
        if (getComputedStyle(element).position === 'fixed') return false;
        return !clipped(element);
      })
      .slice(0, 5)
      .map(
        (element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 80)}`,
      );
  });
}

/** Width × height of an element's tap area, including an absolutely positioned ::after/::before. */
async function hitArea(page: Page, selector: string): Promise<{ width: number; height: number }> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      let { left, top, right, bottom } = box;
      for (const pseudo of ['::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        if (style.position !== 'absolute' || style.content === 'none') continue;
        const px = (value: string): number => (value.endsWith('px') ? parseFloat(value) : 0);
        left = Math.min(left, box.left + px(style.left));
        top = Math.min(top, box.top + px(style.top));
        right = Math.max(right, box.right - px(style.right));
        bottom = Math.max(bottom, box.bottom - px(style.bottom));
      }
      return { width: Math.round(right - left), height: Math.round(bottom - top) };
    });
}

async function expectTarget(page: Page, selector: string, name: string): Promise<void> {
  const area = await hitArea(page, selector);
  expect(
    Math.min(area.width, area.height),
    `${name} hit area (${area.width}×${area.height})`,
  ).toBeGreaterThanOrEqual(MIN_TARGET);
}

for (const device of DEVICES) {
  test.describe(`device matrix · ${device.id}`, () => {
    // Device descriptors pin a browser type (webkit for iPhones), which can't change inside a
    // describe; everything else (UA, DPR, isMobile, hasTouch, viewport) applies.
    const descriptor = devices[device.profile];
    if (!descriptor) throw new Error(`Unknown Playwright device: ${device.profile}`);
    const { defaultBrowserType: _browser, ...profile } = descriptor;
    test.use({ ...profile, ...(device.viewport ? { viewport: device.viewport } : {}) });

    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop-dark', 'device matrix runs in one project');
    });

    test('key routes fit the screen with one h1', async ({ page }) => {
      test.setTimeout(180_000);
      for (const route of ROUTES) {
        await test.step(route, async () => {
          await gotoRoute(page, route);
          if (CARD_ROUTES.has(route)) {
            await expect(page.locator('article[data-variant]').first()).toBeVisible();
          }
          await expectSingleH1(page);
          await expectNoHorizontalOverflow(page);
          expect(await elementsWiderThanViewport(page), `elements wider than ${route}`).toEqual([]);
        });
      }
    });

    test('primary nav is reachable and key controls are tappable', async ({ page }) => {
      await gotoRoute(page, '/shop');
      const banner = page.getByRole('banner');
      const desktopNav = (page.viewportSize()?.width ?? 0) >= 1024;

      if (desktopNav) {
        await expect(banner.getByRole('navigation').getByRole('link').first()).toBeVisible();
      } else {
        const menu = banner.getByRole('button', { name: 'Open menu' });
        await expect(menu).toBeVisible();
        await expectTarget(page, 'header button[aria-label="Open menu"]', 'Open menu');
        await menu.click();
        const drawer = page.getByRole('dialog');
        const mobileNav = drawer.getByRole('navigation', { name: 'Mobile primary' });
        await expect(mobileNav.getByRole('link').first()).toBeVisible();
        await mobileNav.getByRole('link').last().scrollIntoViewIfNeeded();
        await expect(mobileNav.getByRole('link').last()).toBeInViewport();
        await drawer.getByRole('button', { name: 'Close menu' }).click();
        await expect(drawer).toBeHidden();
      }

      await expectTarget(page, 'header a[href="/cart"], header [aria-label^="Pit stop"]', 'Cart');
      await expect(page.locator('article[data-variant]').first()).toBeVisible();
      await expectTarget(page, 'article[data-variant] button[aria-label^="Add "]', 'Card + CART');
      await expectTarget(page, 'article[data-variant] button[aria-pressed]', 'Card wishlist');
    });
  });
}
