/**
 * (b) axe-core scans (WCAG 2.0 A + AA rules) of the main routes in every project, i.e. dark and
 * light at 1440px plus the 375px layout. Zero serious/critical violations allowed. Pages are
 * scanned with reduced motion (so no element is caught mid-fade) after scrolling through the
 * page once, which triggers the scroll-into-view reveals.
 *
 * Besides the empty-state routes, a signed-in "filled pit stop" flow scans the states only a
 * real order reaches: a cart with two cars (summary + totals breakdown), each checkout step
 * (address, payment with COD, review) and the order-success page.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  type CartSeedLine,
  choosePaymentMethod,
  expect,
  fillAddress,
  gotoRoute,
  seedCart,
  signIn,
  test,
  uniqueEmail,
} from './fixtures';

const PUBLIC_ROUTES = [
  '/',
  '/shop',
  '/shop?category=off-road',
  '/search?q=porsche',
  '/collections',
  '/collections/hw-rescue-2025',
  '/product/porsche-911-gt3-rs',
  '/product/lamborghini-countach-lpi-800-4',
  '/product/toyota-supra-a80',
  '/vault',
  '/cart',
  '/about',
  '/contact',
  '/faq',
  '/shipping-returns',
  '/privacy',
  '/terms',
  '/wrong-turn-somewhere',
] as const;

const PRIVATE_ROUTES = [
  '/garage',
  '/garage?tab=achievements',
  '/garage?tab=stats',
  '/wishlist',
  '/orders',
  '/checkout',
] as const;

/** Two in-stock cars at their seeded prices (₹199 + ₹229: under the free-shipping threshold). */
const PIT_STOP: readonly CartSeedLine[] = [
  {
    productId: 'monsoon-mauler',
    slug: 'monsoon-mauler',
    name: 'Monsoon Mauler',
    price: 199,
    qty: 1,
    stock: 91,
  },
  {
    productId: 'mahindra-thar',
    slug: 'mahindra-thar',
    name: 'Mahindra Thar',
    price: 229,
    qty: 1,
    stock: 134,
  },
];

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

test.use({ reducedMotion: 'reduce' });

async function revealPage(page: Page): Promise<void> {
  await expect(page.locator('main .shimmer'))
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined);
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

async function scan(page: Page, route: string): Promise<void> {
  await gotoRoute(page, route);
  await scanCurrent(page, route);
}

/** Scans whatever the page shows right now (e.g. a checkout step reached by clicking). */
async function scanCurrent(page: Page, route: string): Promise<void> {
  await revealPage(page);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? ''),
  );
  const summary = blocking.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.slice(0, 6).map((node) => ({
      target: node.target.join(' '),
      summary: node.failureSummary?.split('\n').slice(0, 3).join(' | '),
    })),
  }));
  const minor = results.violations
    .filter((violation) => !BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => `${violation.id} (${violation.impact ?? 'n/a'})`);
  test.info().annotations.push({
    type: 'axe',
    description: `${route}: ${results.passes.length} rules passed, ${blocking.length} serious/critical, minor/moderate: ${minor.join(', ') || 'none'}`,
  });
  if (process.env.E2E_AXE_LOG) console.info(test.info().annotations.at(-1)?.description);
  expect(summary, `serious/critical axe violations on ${route}`).toEqual([]);
}

test.describe('axe (wcag2a + wcag2aa)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`no serious/critical violations on ${route}`, async ({ page }) => {
      await scan(page, route);
    });
  }

  test('no serious/critical violations on signed-in pages', async ({ page }, testInfo) => {
    await signIn(page, { email: uniqueEmail(testInfo, 'axe'), displayName: 'Axe Auditor' });
    for (const route of PRIVATE_ROUTES) {
      await test.step(route, async () => {
        await scan(page, route);
      });
    }
  });

  test('no serious/critical violations in a filled pit stop, checkout and order success', async ({
    page,
  }, testInfo) => {
    test.slow();
    await signIn(page, { email: uniqueEmail(testInfo, 'axe-pit-stop'), displayName: 'Axe Racer' });
    await seedCart(page, PIT_STOP);

    await test.step('/cart (2 cars)', async () => {
      await gotoRoute(page, '/cart');
      const summary = page.locator('[aria-labelledby="cart-summary-title"]');
      for (const line of PIT_STOP) {
        await expect(page.getByRole('link', { name: line.name, exact: true })).toBeVisible();
      }
      await expect(summary.getByRole('link', { name: /start engine/i })).toBeVisible();
      await scanCurrent(page, '/cart (filled)');
    });

    await test.step('/checkout address step', async () => {
      await gotoRoute(page, '/checkout');
      await expect(page.getByRole('textbox', { name: /^Full name/ })).toBeVisible();
      await scanCurrent(page, '/checkout?step=address');
    });

    await test.step('/checkout payment step (COD)', async () => {
      await fillAddress(page);
      await page.getByRole('button', { name: /continue to payment/i }).click();
      await choosePaymentMethod(page, /^Cash on Delivery/);
      await scanCurrent(page, '/checkout?step=payment');
    });

    await test.step('/checkout review step', async () => {
      await page.getByRole('button', { name: /review order/i }).click();
      await expect(page.getByRole('button', { name: /^Place order/ })).toBeVisible();
      await scanCurrent(page, '/checkout?step=review');
    });

    await test.step('order success', async () => {
      await page.getByRole('button', { name: /^Place order/ }).click();
      await expect(page).toHaveURL(/\/checkout\/success\/[^/?#]+/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/order confirmed/i);
      await expect(page.getByRole('main')).toContainText(/\+[1-9][\d,]*\s*XP/);
      await scanCurrent(page, '/checkout/success/:orderId');
    });
  });
});
