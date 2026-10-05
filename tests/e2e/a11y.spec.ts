/**
 * (b) axe-core scans (WCAG 2.0 A + AA rules) of the main routes in every project, i.e. dark and
 * light at 1440px plus the 375px layout. Zero serious/critical violations allowed. Pages are
 * scanned with reduced motion (so no element is caught mid-fade) after scrolling through the
 * page once, which triggers the scroll-into-view reveals.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, gotoRoute, signIn, test, uniqueEmail } from './fixtures';

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
});
