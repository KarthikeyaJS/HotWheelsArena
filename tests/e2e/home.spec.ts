/**
 * (c) Home: sections in spec order, the simple static hero (not pinned, Explore Collection
 * scrolls to #collection, the next section is a short scroll away), category card →
 * /shop?category=…, a reduced-motion run (instant jump, no scroll-track, no errors).
 * (k) Newsletter: subscribe → success; same email again → already subscribed.
 */
import { expect, gotoRoute, test, uniqueEmail } from './fixtures';

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

  test('the hero is static: not pinned, no scroll-track', async ({ page }) => {
    await gotoRoute(page, '/');
    const hero = page.locator('section#hero');
    await expect(hero.getByRole('link', { name: /explore collection/i })).toBeVisible();
    await expect(hero.getByRole('link', { name: /enter the vault/i })).toHaveAttribute(
      'href',
      '/vault',
    );
    await expect(hero.locator('[data-hero="car"] svg')).toBeVisible();

    // Modest height: shorter than the viewport, no sticky stage inside.
    const viewport = page.viewportSize();
    const heroBox = await hero.boundingBox();
    expect(heroBox?.height ?? Infinity).toBeLessThan(viewport?.height ?? 0);
    const stickyInside = await hero.evaluate(
      (section) =>
        Array.from(section.querySelectorAll<HTMLElement>('*')).filter(
          (element) => getComputedStyle(element).position === 'sticky',
        ).length,
    );
    expect(stickyInside, 'no sticky stage in the hero').toBe(0);

    // Not pinned: the hero scrolls away with the page, pixel for pixel.
    const before = await hero.evaluate((section) => section.getBoundingClientRect().top);
    await page.evaluate(() => window.scrollTo(0, 200));
    await expect
      .poll(() => hero.evaluate((section) => section.getBoundingClientRect().top))
      .toBeCloseTo(before - 200, 0);

    await expect(page.locator('.pin-spacer')).toHaveCount(0);
    await expect(page.getByTestId('scroll-track')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Page sections' })).toHaveCount(0);
  });

  test('the next section is visible after a short scroll', async ({ page }) => {
    await gotoRoute(page, '/');
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect(page.getByRole('heading', { name: /choose your ride/i })).toBeInViewport();
  });

  test('Explore Collection scrolls to #collection and moves focus there', async ({ page }) => {
    await gotoRoute(page, '/');
    await page
      .locator('section#hero')
      .getByRole('link', { name: /explore collection/i })
      .click();
    const collection = page.locator('section#collection');
    await expect(collection).toBeFocused();
    await expect(page.getByRole('heading', { name: /choose your ride/i })).toBeInViewport();
    // The section top settles just under the sticky header (scroll-padding-top).
    await expect
      .poll(() => collection.evaluate((section) => Math.round(section.getBoundingClientRect().top)))
      .toBeLessThan(120);
    await expect(page).toHaveURL(/\/$/);
  });

  test('Choose Your Ride: names never truncate and titles line up per row', async ({
    page,
  }, testInfo) => {
    // The project viewport (1440 / 375) plus the two narrowest layouts, checked once.
    const widths = testInfo.project.name === 'desktop-dark' ? [320, 1024, 1440] : [null];
    await gotoRoute(page, '/');
    for (const width of widths) {
      if (width !== null) await page.setViewportSize({ width, height: 900 });
      await page.locator('section#collection').scrollIntoViewIfNeeded();
      const cards = await page.locator('#collection a[data-category]').evaluateAll((links) =>
        links.map((link) => {
          const title = link.querySelector('h3');
          const rect = title?.getBoundingClientRect();
          return {
            slug: link.getAttribute('data-category') ?? '',
            row: Math.round(link.getBoundingClientRect().top),
            titleTop: Math.round(rect?.top ?? -1),
            truncated: title ? title.scrollWidth > title.clientWidth : true,
          };
        }),
      );
      expect(cards).toHaveLength(6);
      const label = `at ${width ?? 'project'} px`;
      expect(
        cards.filter((card) => card.truncated).map((card) => card.slug),
        label,
      ).toEqual([]);
      const rows = new Map<number, number[]>();
      for (const card of cards) rows.set(card.row, [...(rows.get(card.row) ?? []), card.titleTop]);
      for (const titleTops of rows.values()) {
        expect(new Set(titleTops).size, `titles share one line per row ${label}`).toBe(1);
      }
    }
  });

  test('Just off the track: compact cards keep their labels whole at 320px', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-dark', 'one narrow-viewport check is enough');
    await page.setViewportSize({ width: 320, height: 800 });
    await gotoRoute(page, '/');
    const rail = page.getByRole('region', { name: 'New arrivals' });
    await rail.scrollIntoViewIfNeeded();
    const firstSlide = rail.locator('[aria-roledescription="slide"]').first();
    await expect(firstSlide).toBeVisible();
    const clipped = await firstSlide.evaluate((slide) =>
      Array.from(slide.querySelectorAll<HTMLElement>('*'))
        .filter((element) => getComputedStyle(element).textOverflow === 'ellipsis')
        .filter((element) => element.scrollWidth > element.clientWidth)
        .map((element) => element.textContent?.trim() ?? ''),
    );
    expect(clipped, 'no ellipsis-truncated label in the first card').toEqual([]);
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

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('instant jump, no scroll-track and no errors', async ({ page }) => {
      await gotoRoute(page, '/');
      await page
        .locator('section#hero')
        .getByRole('link', { name: /explore collection/i })
        .click();
      // behavior: 'auto' → the jump is immediate, no smooth-scroll frames in between.
      const top = await page
        .locator('section#collection')
        .evaluate((section) => Math.round(section.getBoundingClientRect().top));
      expect(top).toBeLessThan(120);

      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      });
      await expect(page.getByRole('navigation', { name: 'Page sections' })).toHaveCount(0);
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
