/**
 * Shared Playwright fixtures + helpers for the HotWheelsArena e2e suite.
 *
 * - `theme` option (set per project): persisted into the app's prefs key before every load, so
 *   the no-flash script and the zustand store both start in that theme.
 * - Every test automatically fails on uncaught page errors and on console errors that are not in
 *   the small allowlist of known-benign framework notices (see `BENIGN_CONSOLE_ERRORS`).
 * - `signIn()` uses the dev-only emulator hook `window.__hwaTest.signIn` (src/dev/testHooks.ts);
 *   `uniqueEmail()` gives every test its own collector so tests stay independent on the shared
 *   emulator database.
 */
import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';

export type Theme = 'dark' | 'light';

export interface E2eOptions {
  /** App theme for this project (persisted pref, applied before first paint). */
  theme: Theme;
}

export interface ConsoleGuard {
  /** Console errors / page errors captured so far (asserted empty when the test ends). */
  errors: string[];
  /** Allow an extra console-error pattern for this test only (e.g. an intentional failure path). */
  allow: (pattern: RegExp) => void;
}

interface E2eFixtures {
  consoleGuard: ConsoleGuard;
}

interface TestHookUser {
  uid: string;
  email: string | null;
}

declare global {
  interface Window {
    __hwaTest?: {
      signIn: (options: { email: string; displayName?: string }) => Promise<TestHookUser>;
      signOut: () => Promise<void>;
    };
  }
}

/** Persist key of the UI prefs store (src/store/uiStore.ts, zustand persist version 1). */
const PREFS_KEY = 'hwa-prefs-v1';
/** Set by `setTheme()` so the per-project init script stops forcing the project theme. */
const THEME_LOCK_KEY = 'hwa-e2e-theme-lock';

/**
 * Known-benign console errors. Keep this list tiny and specific — anything else fails the test.
 * - Chromium logs aborted Firestore long-poll / WebChannel requests when a page navigates away
 *   mid-request (emulator transport noise, not an app error).
 */
const BENIGN_CONSOLE_ERRORS: readonly RegExp[] = [
  /Failed to load resource: net::ERR_ABORTED.*(google\.firestore|Listen\/channel|Write\/channel)/i,
];

export const test = base.extend<E2eFixtures & E2eOptions>({
  theme: ['dark', { option: true }],

  page: async ({ page, theme }, use) => {
    await page.addInitScript(
      ({ prefsKey, lockKey, initialTheme }) => {
        try {
          if (window.localStorage.getItem(lockKey)) return;
          const raw = window.localStorage.getItem(prefsKey);
          const parsed = raw ? (JSON.parse(raw) as { state?: object; version?: number }) : {};
          window.localStorage.setItem(
            prefsKey,
            JSON.stringify({ state: { ...(parsed.state ?? {}), theme: initialTheme }, version: 1 }),
          );
        } catch {
          /* storage unavailable — the app falls back to prefers-color-scheme */
        }
      },
      { prefsKey: PREFS_KEY, lockKey: THEME_LOCK_KEY, initialTheme: theme },
    );
    await use(page);
  },

  consoleGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const extra: RegExp[] = [];
      const allowed = (text: string): boolean =>
        [...BENIGN_CONSOLE_ERRORS, ...extra].some((pattern) => pattern.test(text));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (!allowed(text)) errors.push(`console.error: ${text}`);
      });
      page.on('pageerror', (error) => {
        const text = error.stack ?? String(error);
        if (!allowed(text)) errors.push(`pageerror: ${text}`);
      });
      await use({ errors, allow: (pattern) => extra.push(pattern) });
      expect(errors, 'no page errors and no unexpected console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** A unique, readable collector email for this test (one emulator user per test + project). */
export function uniqueEmail(testInfo: TestInfo, label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  const random = Math.random().toString(36).slice(2, 8);
  return `e2e-${testInfo.project.name}-${slug}-${Date.now().toString(36)}${random}@hwa.test`;
}

/**
 * Signs in through the Auth emulator using the dev hook (no popup). Opens `/` first when the
 * current page is blank. Resolves once Firebase Auth reports the user.
 */
export async function signIn(
  page: Page,
  options: { email: string; displayName?: string },
): Promise<TestHookUser> {
  if (page.url() === 'about:blank') await page.goto('/');
  await page.waitForFunction(() => typeof window.__hwaTest?.signIn === 'function');
  const user = await page.evaluate(
    (opts) => {
      const hooks = window.__hwaTest;
      if (!hooks) throw new Error('window.__hwaTest is not installed (dev + emulators only)');
      return hooks.signIn(opts);
    },
    { email: options.email, displayName: options.displayName ?? 'E2E Collector' },
  );
  expect(user.uid).toBeTruthy();
  return user;
}

/** Navigates and waits until the lazy route has rendered its heading (not the Suspense fallback). */
export async function gotoRoute(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.locator('main h1').first()).toBeVisible();
}

/** Exactly one `<h1>` on the page (visible or sr-only). */
export async function expectSingleH1(page: Page): Promise<void> {
  await expect(page.locator('h1')).toHaveCount(1);
}

/** The document never scrolls sideways. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
}

/** Switches the persisted theme (and keeps it across reloads), then reloads. */
export async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(
    ({ prefsKey, lockKey, next }) => {
      const raw = window.localStorage.getItem(prefsKey);
      const parsed = raw ? (JSON.parse(raw) as { state?: object }) : {};
      window.localStorage.setItem(
        prefsKey,
        JSON.stringify({ state: { ...(parsed.state ?? {}), theme: next }, version: 1 }),
      );
      window.localStorage.setItem(lockKey, '1');
    },
    { prefsKey: PREFS_KEY, lockKey: THEME_LOCK_KEY, next: theme },
  );
  await page.reload();
  await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

/** Accessible-name matcher for the nav cart button ("Pit stop cart (2 items)"). */
export function cartButton(page: Page): Locator {
  return page.getByRole('link', { name: /^Pit stop cart/ });
}

/** Opens a product page and adds one copy to the cart via its primary ADD TO CART button. */
export async function addProductToCart(page: Page, slug: string, name: string): Promise<void> {
  await gotoRoute(page, `/product/${slug}`);
  const add = page.getByRole('button', { name: `Add ${name} to cart`, exact: true });
  await add.click();
  await expect(
    page
      .getByRole('button', {
        name: new RegExp(`^(Added – |In pit stop \\(\\d+\\) – add another )${escapeRegExp(name)}`),
      })
      .first(),
  ).toBeVisible();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True for the 375px project. */
export function isMobileProject(testInfo: TestInfo): boolean {
  return testInfo.project.name === 'mobile';
}
