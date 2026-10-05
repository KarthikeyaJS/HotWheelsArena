/**
 * (f) Product page: ADD TO CART increments the nav cart badge; signed-out wishlist / garage
 * clicks open the PIT PASS sign-in prompt. (j) Reviews: a signed-in collector gets validation
 * errors for too-short text, then posts a review that appears in the list. Also checks the
 * product SEO contract (JSON-LD + themed-specs disclaimer).
 */
import { cartButton, expect, gotoRoute, signIn, test, uniqueEmail } from './fixtures';

const GT3 = { slug: 'porsche-911-gt3-rs', name: 'Porsche 911 GT3 RS' } as const;
const NISMO = { slug: 'nissan-gt-r-nismo', name: 'Nissan GT-R Nismo' } as const;

test.describe('product page', () => {
  test('add to cart bumps the cart badge', async ({ page }) => {
    await gotoRoute(page, `/product/${GT3.slug}`);
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart');

    await page.getByRole('button', { name: `Add ${GT3.name} to cart`, exact: true }).click();
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart (1 item)');

    await page
      .getByRole('button', {
        name: new RegExp(`^(Added – ${GT3.name}|In pit stop \\(1\\) – add another ${GT3.name})`),
      })
      .click();
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart (2 items)');

    // Persisted cart survives a reload.
    await page.reload();
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart (2 items)');
  });

  test('signed-out wishlist and garage clicks open the PIT PASS prompt', async ({ page }) => {
    await gotoRoute(page, `/product/${GT3.slug}`);
    const prompt = page.getByRole('dialog', { name: /pit pass required/i });

    await page
      .getByRole('button', { name: `Save ${GT3.name} to wishlist`, exact: true })
      .first()
      .click();
    await expect(prompt).toBeVisible();
    await expect(prompt.getByRole('button', { name: /sign in with google/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(prompt).toBeHidden();

    await page.getByRole('button', { name: `Add to garage – ${GT3.name}`, exact: true }).click();
    await expect(prompt).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(prompt).toBeHidden();
  });

  test('SEO: Product JSON-LD and the themed-specs disclaimer', async ({ page }) => {
    await gotoRoute(page, `/product/${GT3.slug}`);
    await expect(page).toHaveTitle(new RegExp(`^${GT3.name}`));
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent ?? '{}')));
    const product = jsonLd.flat().find((entry) => entry?.['@type'] === 'Product');
    expect(product, 'Product JSON-LD present').toBeTruthy();
    expect(product.name).toBe(GT3.name);
    expect(product.offers.priceCurrency).toBe('INR');
    await expect(
      page.getByText('Themed vehicle specifications — not claims about the toy itself.'),
    ).toBeVisible();
  });
});

test.describe('reviews', () => {
  test('validation for short text, then a posted review shows in the list', async ({
    page,
  }, testInfo) => {
    await signIn(page, { email: uniqueEmail(testInfo, 'reviewer'), displayName: 'Rhea Reviewer' });
    await gotoRoute(page, `/product/${NISMO.slug}`);
    const form = page.getByRole('form', { name: /write a review/i });
    await form.scrollIntoViewIfNeeded();

    const textarea = form.getByRole('textbox', { name: /your review/i });
    const submit = form.getByRole('button', { name: /post review/i });

    // Nothing filled → rating required; too-short text → length error.
    await textarea.fill('Too short');
    await submit.click();
    await expect(form.getByText(/at least 10 characters/i)).toBeVisible();
    await expect(textarea).toHaveAttribute('aria-invalid', 'true');

    // The radios are visually hidden inside star labels (click the label, like a pointer user).
    const ratingRadio = form.getByRole('radio', { name: /^4 stars/ });
    await form
      .locator('label')
      .filter({ has: page.getByRole('radio', { name: /^4 stars/ }) })
      .click();
    await expect(ratingRadio).toBeChecked();

    const text = `E2E ${testInfo.project.name} review ${Date.now().toString(36)} — crisp casting, wheels roll true.`;
    await textarea.fill(text);
    await submit.click();

    const list = page.getByRole('list', { name: 'Collector reviews' });
    await expect(list.getByText(text)).toBeVisible();
    await expect(list.getByRole('listitem').filter({ hasText: text })).toContainText(
      /your review/i,
    );
    // The form switches to edit mode for the collector's own review.
    await expect(page.getByRole('form', { name: /edit your review/i })).toBeVisible();
  });
});
