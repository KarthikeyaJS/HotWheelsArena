/**
 * (e) Shop: load more, sort, a MAKE filter and clear-all — the URL is the source of truth and
 * the results follow it. Below lg the filter rail lives in a drawer.
 */
import type { Page } from '@playwright/test';
import { expect, gotoRoute, isMobileProject, test } from './fixtures';

const resultsCount = (page: Page) =>
  page.getByRole('heading', { level: 2, name: /^\d+\s*machines?$/i });

async function readCount(page: Page): Promise<number> {
  const text = (await resultsCount(page).textContent()) ?? '';
  return Number(text.replace(/[^\d]/g, ''));
}

test.describe('shop', () => {
  test('load more, sort and a make filter drive the URL; clear all resets', async ({
    page,
  }, testInfo) => {
    await gotoRoute(page, '/shop');
    const grid = page.getByRole('list', { name: 'All cars' });
    await expect(resultsCount(page)).toBeVisible();
    const total = await readCount(page);
    expect(total).toBeGreaterThan(24);
    await expect(grid.getByRole('listitem')).toHaveCount(12);

    // Load more → 24 cards, URL keeps the paging.
    await page.getByRole('button', { name: /^Load more/ }).click();
    await expect(page).toHaveURL(/[?&]shown=24\b/);
    await expect(grid.getByRole('listitem')).toHaveCount(24);

    // Sort: cheapest first.
    await page.getByRole('combobox', { name: 'Sort by' }).selectOption('price-asc');
    await expect(page).toHaveURL(/[?&]sort=price-asc\b/);
    await expect(grid.getByRole('listitem').first()).toContainText('₹199');

    // MAKE filter (rail on desktop, drawer below lg).
    const mobile = isMobileProject(testInfo);
    if (mobile) await page.getByRole('button', { name: /^Filters/ }).click();
    const scope = mobile ? page.getByRole('dialog', { name: 'Filters' }) : page;
    // Long facet lists collapse behind "Show all N makes".
    const showAllMakes = scope.getByRole('button', { name: /^Show all \d+ makes$/ });
    if (await showAllMakes.isVisible()) await showAllMakes.click();
    const porsche = scope.getByRole('checkbox', { name: /^Porsche, \d+ cars?$/ });
    // Controlled by the URL (updated in a router transition), so assert with a retrying check.
    await porsche.click();
    await expect(page).toHaveURL(/[?&]make=Porsche\b/);
    await expect(porsche).toBeChecked();
    await expect(page).not.toHaveURL(/shown=/);
    if (mobile) {
      await scope.getByRole('button', { name: /^Show \d+ cars?$/ }).click();
      await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden();
    }
    await expect.poll(() => readCount(page)).toBeLessThan(total);
    const porscheCount = await readCount(page);
    expect(porscheCount).toBeGreaterThan(1);
    const cards = grid.getByRole('listitem');
    await expect(cards).toHaveCount(porscheCount);
    for (const card of await cards.all()) await expect(card).toContainText(/porsche/i);
    await expect(page.getByRole('list', { name: 'Active filters' })).toContainText(/porsche/i);

    // Clear all → filters gone, full grid back.
    await page
      .getByRole('list', { name: 'Active filters' })
      .getByRole('button', { name: /clear all/i })
      .click();
    await expect(page).not.toHaveURL(/make=/);
    await expect.poll(() => readCount(page)).toBe(total);
  });

  test('view tabs and the category deep link', async ({ page }) => {
    await gotoRoute(page, '/shop?view=new');
    await expect(
      page.getByRole('link', { name: /new arrivals/i, exact: false }).first(),
    ).toHaveAttribute('aria-current', 'page');
    const newCount = await readCount(page);
    expect(newCount).toBeGreaterThanOrEqual(8);
    await gotoRoute(page, '/shop?category=off-road');
    await expect(page).toHaveTitle(/off.?road/i);
    await expect.poll(() => readCount(page)).toBeGreaterThan(0);
  });
});
