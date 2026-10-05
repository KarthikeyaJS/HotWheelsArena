/**
 * (c) Home: sections in spec order, category card → /shop?category=…, reduced-motion run
 * (static hero, no GSAP pin spacer, no scroll-track, no errors) and the scroll sequence on
 * desktop. (k) Newsletter: subscribe → success; same email again → already subscribed.
 */
import { expect, gotoRoute, isMobileProject, test, uniqueEmail } from './fixtures';

const SPEC_ORDER = [
  'hero',
  'collection',
  'new-arrivals',
  'featured',
  'vault',
  'garage',
  'achievements',
  'about',
] as const;

test.describe('home', () => {
  test('sections render in spec order with labelled landmarks', async ({ page }) => {
    await gotoRoute(page, '/');
    const ids = await page
      .locator('main section[id]')
      .evaluateAll((sections) => sections.map((section) => section.id));
    const ordered = ids.filter((id): id is (typeof SPEC_ORDER)[number] =>
      (SPEC_ORDER as readonly string[]).includes(id),
    );
    expect(ordered).toEqual([...SPEC_ORDER]);
    for (const id of SPEC_ORDER) {
      const section = page.locator(`main section#${id}`);
      const labelledBy = await section.getAttribute('aria-labelledby');
      expect(labelledBy, `#${id} is labelled`).toBeTruthy();
      await expect(page.locator(`[id="${labelledBy}"]`)).toHaveCount(1);
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/hot wheels/i);
    await expect(page.getByRole('heading', { name: /choose your ride/i })).toBeVisible();
  });

  test('a category card opens the shop filtered by that category', async ({ page }) => {
    await gotoRoute(page, '/');
    const card = page.locator('main a[data-category="off-road"]');
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page).toHaveURL(/\/shop\?category=off-road$/);
    await expect(page).toHaveTitle(/off.?road/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('desktop runs the GSAP scroll sequence', async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), 'the scroll sequence is desktop-only (≥1024px)');
    await gotoRoute(page, '/');
    const hero = page.locator('section#hero');
    await expect(hero).toHaveAttribute('data-sequence', 'scroll');
    // Scrub through the hand-off: the car leaves, the next section rises; no errors on the way.
    for (const y of [300, 700, 1100, 1500]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(250);
    }
    await expect(page.getByRole('heading', { name: /choose your ride/i })).toBeInViewport();
    const gsapLoaded = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => /\.vite\/deps\/gsap/i.test(entry.name)),
    );
    expect(gsapLoaded, 'GSAP is lazy-loaded for the desktop sequence').toBe(true);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('static hero, no pinned GSAP spacer, no scroll-track and no errors', async ({ page }) => {
      await gotoRoute(page, '/');
      await expect(page.locator('section#hero')).toHaveAttribute('data-sequence', 'static');
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      });
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Page sections' })).toHaveCount(0);
      const gsapLoaded = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          // Vite serves the gsap package (core + plugins) as prebundled deps: .vite/deps/gsap*.js
          .some((entry) => /\.vite\/deps\/gsap/i.test(entry.name)),
      );
      expect(gsapLoaded, 'GSAP is never loaded under reduced motion').toBe(false);
    });
  });

  test('newsletter: subscribe, then the same email is already subscribed', async ({
    page,
  }, testInfo) => {
    await gotoRoute(page, '/');
    const section = page.getByRole('region', { name: /join the pit crew/i });
    await section.scrollIntoViewIfNeeded();
    const email = uniqueEmail(testInfo, 'newsletter');
    const field = section.getByRole('textbox', { name: /email address/i });
    const submit = section.getByRole('button', { name: /join the grid/i });

    // Invalid email → inline validation, nothing sent.
    await field.fill('not-an-email');
    await submit.click();
    await expect(field).toHaveAttribute('aria-invalid', 'true');

    await field.fill(email);
    await submit.click();
    await expect(section.getByText(/you're on the grid/i)).toBeVisible();

    await field.fill(email);
    await submit.click();
    await expect(section.getByText(/already on the list/i)).toBeVisible();
  });
});
