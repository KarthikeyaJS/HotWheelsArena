/**
 * (d) Command palette: Ctrl+K opens it, "pors" shows the Make → Models group, Enter goes to
 * /search?q=…, Esc closes it and "/" opens it when focus is not in a text field.
 */
import { expect, gotoRoute, test } from './fixtures';

test.describe('command palette', () => {
  test('Ctrl+K, grouped suggestions, Enter → results, Esc and "/"', async ({ page }) => {
    await gotoRoute(page, '/shop');
    const dialog = page.getByRole('dialog', { name: 'Search the garage' });
    const combobox = dialog.getByRole('combobox', { name: 'Search the garage' });

    await page.keyboard.press('Control+k');
    await expect(dialog).toBeVisible();
    await expect(combobox).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // "/" opens it when focus isn't in a field.
    await page.locator('main h1').first().click();
    await page.keyboard.press('/');
    await expect(dialog).toBeVisible();
    await expect(combobox).toBeFocused();

    await combobox.pressSequentially('pors', { delay: 40 });
    await expect(dialog.getByRole('group', { name: 'Porsche models' })).toBeVisible();
    await expect(dialog.getByRole('option').first()).toBeVisible();
    await expect(combobox).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=pors/i);
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/pors/i);
  });

  test('arrow keys move the active option and Enter opens a suggestion', async ({ page }) => {
    await gotoRoute(page, '/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Search the garage' });
    const combobox = dialog.getByRole('combobox', { name: 'Search the garage' });
    await combobox.pressSequentially('porsche', { delay: 30 });
    await expect(dialog.getByRole('group', { name: 'Porsche models' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    const active = await combobox.getAttribute('aria-activedescendant');
    expect(active, 'an option becomes active').toBeTruthy();
    await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/(search\?q=|product\/|shop\?)/);
    await expect(page.locator('main h1').first()).toBeVisible();
  });
});
