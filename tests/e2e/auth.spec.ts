/**
 * (g) The REAL Google sign-in popup, once, through the Auth emulator's popup UI: nav "Sign in" →
 * popup → "Add new account" → auto-generate user → "Sign in with Google.com" → the avatar menu
 * shows the collector. Every other spec signs in with the dev hook (fixtures.signIn).
 */
import { expect, gotoRoute, test } from './fixtures';

test.describe('google sign-in (auth emulator popup)', () => {
  test('nav Sign in → emulator popup → avatar menu → sign out', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-dark',
      'runs once (the nav Sign in button is in the desktop header)',
    );
    await gotoRoute(page, '/');
    const header = page.getByRole('banner');
    const signInButton = header.getByRole('button', { name: /^Sign in/ });
    await expect(signInButton).toBeVisible();

    const popupPromise = page.waitForEvent('popup');
    await signInButton.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/\/emulator\/auth\/handler/);

    await popup.getByRole('button', { name: /add new account/i }).click();
    await popup.getByRole('button', { name: /auto-generate user information/i }).click();
    const closed = popup.waitForEvent('close');
    await popup.getByRole('button', { name: /sign in with google\.com/i }).click();
    await closed;

    const accountMenu = header.getByRole('button', { name: /^Account menu for / });
    await expect(accountMenu).toBeVisible();
    await expect(header.getByRole('button', { name: /^Sign in/ })).toHaveCount(0);

    await accountMenu.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /my garage/i })).toBeVisible();
    await menu.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(header.getByRole('button', { name: /^Sign in/ })).toBeVisible();
  });
});
