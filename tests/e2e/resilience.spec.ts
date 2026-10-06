/**
 * (k) Resilience: with the Firestore backend unreachable, data pages must show the friendly error
 * with Retry — never a successful-looking empty grid, a 404 or a `noindex` (the SDK's in-memory
 * cache answers offline queries with an empty `fromCache` snapshot; the services turn that into
 * `unavailable`). Once the backend is back, Retry recovers.
 */
import type { Page } from '@playwright/test';
import { expect, test, type ConsoleGuard } from './fixtures';

/** Firestore emulator traffic (VITE_EMULATOR_HOST 127.0.0.1, sometimes reached as localhost). */
const FIRESTORE = /^https?:\/\/(127\.0\.0\.1|localhost):8080\//;

/** Chromium + SDK noise while the backend is refused (not app errors). */
const OFFLINE_NOISE: readonly RegExp[] = [
  /Failed to load resource: net::ERR_(CONNECTION_REFUSED|FAILED)/i,
  /@firebase\/firestore/i,
  /Could not reach Cloud Firestore backend/i,
];

/** How long the SDK may take to reconnect after the outage (stream backoff) before Retry works. */
const RECOVERY_TIMEOUT = 60_000;

async function refuseFirestore(
  page: Page,
  consoleGuard: ConsoleGuard,
): Promise<() => Promise<void>> {
  for (const pattern of OFFLINE_NOISE) consoleGuard.allow(pattern);
  await page.route(FIRESTORE, (route) => route.abort('connectionrefused'));
  return () => page.unroute(FIRESTORE);
}

/** The friendly error panel with its Retry button. */
async function expectEngineTrouble(page: Page): Promise<void> {
  const alert = page
    .getByRole('main')
    .getByRole('alert')
    .filter({ hasText: /engine trouble/i });
  await expect(alert).toBeVisible({ timeout: 30_000 });
  await expect(alert).toContainText(/can't reach the track/i);
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
}

/**
 * Clicks Retry until the page recovers. The first click right after the outage can still land
 * inside the Firestore SDK's reconnect backoff (it answers from cache → the error again).
 */
async function retryUntil(page: Page, recovered: () => Promise<void>): Promise<void> {
  await expect(async () => {
    const retry = page.getByRole('main').getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    await recovered();
  }).toPass({ timeout: RECOVERY_TIMEOUT, intervals: [1_000, 2_000, 3_000] });
}

const robotsContent = (page: Page) =>
  page.evaluate(
    () => document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
  );

test.describe('Firestore unreachable', () => {
  test('/shop shows Engine trouble with Retry (not an empty grid), then recovers', async ({
    page,
    consoleGuard,
  }) => {
    test.slow();
    const restore = await refuseFirestore(page, consoleGuard);
    await page.goto('/shop');
    await expect(page.locator('main h1').first()).toBeVisible();
    await expectEngineTrouble(page);
    await expect(page.getByText(/this bay is empty/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^0\s*machines?$/i })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'All cars' })).toHaveCount(0);

    await restore();
    const grid = page.getByRole('list', { name: 'All cars' });
    await retryUntil(page, async () => {
      await expect(grid.getByRole('listitem').first()).toBeVisible({ timeout: 4_000 });
    });
    await expect(
      page.getByRole('heading', { level: 2, name: /^[1-9]\d*\s*machines?$/i }),
    ).toBeVisible();
    await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  });

  test('/product shows Engine trouble with Retry (not a 404, still indexable), then recovers', async ({
    page,
    consoleGuard,
  }) => {
    test.slow();
    const restore = await refuseFirestore(page, consoleGuard);
    await page.goto('/product/porsche-911-gt3-rs');
    await expectEngineTrouble(page);
    await expect(page.getByText(/off track|machine not found|isn't in our garage/i)).toHaveCount(0);
    expect(await robotsContent(page)).not.toMatch(/noindex/);
    await expect(page).not.toHaveTitle(/not found/i);

    await restore();
    const heading = page.getByRole('heading', { level: 1, name: /Porsche 911 GT3 RS/ });
    await retryUntil(page, async () => {
      await expect(heading).toBeVisible({ timeout: 4_000 });
    });
    await expect(page).toHaveTitle(/^Porsche 911 GT3 RS/);
    expect(await robotsContent(page)).not.toMatch(/noindex/);
  });
});
