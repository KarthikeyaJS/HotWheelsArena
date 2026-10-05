/**
 * Playwright end-to-end suite (tests/e2e/**). Run it through the Emulator Suite:
 *
 *   npm run e2e      (= functions build → firebase emulators:exec auth,firestore,functions →
 *                       seed the emulator → playwright test)
 *   npm run e2e:ui   (Playwright UI mode; start `npm run emulators` + `npm run seed:emulator` first)
 *
 * Playwright starts its own Vite dev server (port 5173) wired to the emulators, with
 * deterministic test payments (VITE_DUMMY_PAYMENT_SUCCESS_RATE=1). Tests share one emulator
 * database, so every test signs in as its own unique collector (tests/e2e/fixtures.ts).
 */
import { defineConfig, devices } from '@playwright/test';
import type { E2eOptions } from './tests/e2e/fixtures';

const isCI = Boolean(process.env.CI);
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig<E2eOptions>({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Shared emulator data + one dev server: keep parallelism modest so Vite's on-demand
  // transforms and the Functions emulator are not the bottleneck.
  workers: isCI ? 1 : 2,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },
  projects: [
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
        theme: 'dark',
      },
    },
    {
      name: 'desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
        theme: 'light',
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
        theme: 'dark',
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Emulator-ready values (the same as the developer .env.local) so CI needs no env file.
      VITE_USE_EMULATORS: 'true',
      VITE_EMULATOR_HOST: '127.0.0.1',
      VITE_FIREBASE_PROJECT_ID: 'demo-hotwheelsarena',
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-hotwheelsarena.firebaseapp.com',
      VITE_FUNCTIONS_REGION: 'asia-south1',
      VITE_PAYMENT_PROVIDER: 'dummy',
      // Deterministic checkout: simulated card/UPI payments always approve.
      VITE_DUMMY_PAYMENT_SUCCESS_RATE: '1',
      VITE_ENABLE_ANALYTICS: 'false',
      VITE_SITE_URL: BASE_URL,
    },
  },
});
