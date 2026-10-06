/**
 * (l) Reflow (WCAG 1.4.10): at 320 CSS px (≈ 1280px at 400% zoom) nothing scrolls sideways and
 * the header keeps every control on screen — the wordmark text collapses to the stripe mark
 * below 360px (the home link keeps its accessible name). From 360px the wordmark is visible.
 */
import type { Page } from '@playwright/test';
import { cartButton, expect, expectNoHorizontalOverflow, gotoRoute, test } from './fixtures';

const ROUTES = [
  '/',
  '/shop',
  '/product/porsche-911-gt3-rs',
  '/cart',
  '/faq',
  '/this-road-does-not-exist',
] as const;

const homeLink = (page: Page) => page.getByRole('banner').getByRole('link', { name: /— home$/ });

/** The header control's box lies fully inside the viewport. */
async function expectInViewport(
  page: Page,
  name: string,
  box: { x: number; width: number } | null,
) {
  const viewport = page.viewportSize();
  expect(box, `${name} is rendered`).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x, `${name} left edge`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${name} right edge`).toBeLessThanOrEqual(viewport.width);
}

test.describe('reflow at 320px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const route of ROUTES) {
    test(`no sideways scroll and the header fits on ${route}`, async ({ page }) => {
      await gotoRoute(page, route);
      await expectNoHorizontalOverflow(page);
      await expectInViewport(page, 'Pit stop cart button', await cartButton(page).boundingBox());
      await expectInViewport(
        page,
        'menu button',
        await page.getByRole('button', { name: 'Open menu' }).boundingBox(),
      );
      await expect(homeLink(page)).toBeVisible();
      await expect(homeLink(page)).toHaveAccessibleName(/^HotWheelsArena — home$/);
    });
  }
});

test.describe('header at 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('shows the wordmark text and still fits', async ({ page }) => {
    await gotoRoute(page, '/shop');
    const wordmark = homeLink(page).locator('span').first();
    await expect(wordmark).toBeVisible();
    const box = await wordmark.boundingBox();
    expect(box?.width ?? 0, 'wordmark text is not visually hidden').toBeGreaterThan(40);
    await expectNoHorizontalOverflow(page);
    await expectInViewport(page, 'Pit stop cart button', await cartButton(page).boundingBox());
  });
});
