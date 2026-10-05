/**
 * (i) My Garage: park a car manually through the ADD A CAR picker, favourite it, bump its copies
 * (the duplicates tracker picks it up), switch tabs with URL sync, and see badge progress on the
 * achievements tab.
 */
import { expect, gotoRoute, signIn, test, uniqueEmail } from './fixtures';

const CAR = { name: 'Dodge Charger Pursuit', query: 'charger' } as const;

test.describe('my garage', () => {
  test('picker → favourite → copies → duplicates → tabs → achievements', async ({
    page,
  }, testInfo) => {
    test.slow();
    await signIn(page, { email: uniqueEmail(testInfo, 'garage'), displayName: 'Gita Garage' });
    await gotoRoute(page, '/garage');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome back, gita/i);

    // ADD A CAR picker.
    await page
      .getByRole('button', { name: /^Add a car$/i })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Add a car' });
    await expect(dialog).toBeVisible();
    const search = dialog.getByRole('searchbox', { name: 'Search the catalogue' });
    await expect(search).toBeFocused();
    await search.fill(CAR.query);
    await dialog.getByRole('button', { name: `Park it — ${CAR.name}` }).click();
    await expect(dialog.getByRole('button', { name: `+1 copy — ${CAR.name}` })).toBeVisible();
    await dialog.getByRole('button', { name: /^Done$/ }).click();
    await expect(dialog).toBeHidden();

    const card = page.getByRole('article').filter({ hasText: CAR.name }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(/manual/i);

    // Favourite it.
    const favorite = card.getByRole('button', { name: `Favorite ${CAR.name}` });
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');

    // Bump copies → duplicates tracker.
    await card.getByRole('button', { name: `Add a copy of ${CAR.name}` }).click();
    await expect(card.getByRole('spinbutton', { name: `Copies of ${CAR.name}` })).toHaveValue('2');
    const duplicates = page.getByRole('region', { name: /duplicates tracker/i });
    await expect(duplicates.getByRole('list', { name: 'Duplicate cars' })).toContainText(CAR.name);

    // Tabs with URL sync.
    const tabs = page.getByRole('tablist', { name: 'Garage sections' });
    await tabs.getByRole('tab', { name: /^Favorites/ }).click();
    await expect(page).toHaveURL(/\/garage\?tab=favorites$/);
    await expect(page.getByRole('tabpanel')).toContainText(CAR.name);

    await tabs.getByRole('tab', { name: /^Stats/ }).click();
    await expect(page).toHaveURL(/\/garage\?tab=stats$/);

    await tabs.getByRole('tab', { name: /^Achievements/ }).click();
    await expect(page).toHaveURL(/\/garage\?tab=achievements$/);
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByRole('progressbar', { name: /progress$/i }).first()).toBeVisible();
    await expect(panel).toContainText(/garage builder/i);

    // Keyboard: Home goes back to the Collection tab (bare /garage).
    await tabs.getByRole('tab', { name: /^Achievements/ }).focus();
    await page.keyboard.press('Home');
    await expect(page).toHaveURL(/\/garage$/);
    await expect(tabs.getByRole('tab', { name: /^Collection/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Survives a reload (data really is in Firestore, not just the optimistic mirror).
    await page.reload();
    const reloaded = page.getByRole('article').filter({ hasText: CAR.name }).first();
    await expect(reloaded.getByRole('spinbutton', { name: `Copies of ${CAR.name}` })).toHaveValue(
      '2',
    );
    await expect(reloaded.getByRole('button', { name: `Favorite ${CAR.name}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
