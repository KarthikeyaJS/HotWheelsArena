import { DEMO_PROJECT_ID, FUNCTIONS_REGION } from '@shared/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import envSource from './env.ts?raw';

const KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_USE_EMULATORS',
  'VITE_EMULATOR_HOST',
  'VITE_FUNCTIONS_REGION',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_PAYMENT_PROVIDER',
  'VITE_DUMMY_PAYMENT_SUCCESS_RATE',
  'VITE_ENABLE_ANALYTICS',
  'VITE_SITE_URL',
] as const;

type EnvKey = (typeof KEYS)[number];

/** Loads a fresh copy of env.ts with every VITE_* key blank except the given overrides. */
async function loadEnv(overrides: Partial<Record<EnvKey, string>> = {}) {
  for (const key of KEYS) vi.stubEnv(key, overrides[key] ?? '');
  vi.resetModules();
  const module = await import('./env');
  return module.env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('env', () => {
  it('falls back to emulator-ready defaults when nothing is set', async () => {
    const env = await loadEnv();
    expect(env.firebase).toEqual({
      apiKey: 'demo-api-key',
      authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
      projectId: DEMO_PROJECT_ID,
      storageBucket: `${DEMO_PROJECT_ID}.appspot.com`,
      messagingSenderId: '000000000000',
      appId: '1:000000000000:web:0000000000000000000000',
    });
    expect(env.useEmulators).toBe(true);
    expect(env.emulatorHost).toBe('127.0.0.1');
    expect(env.functionsRegion).toBe(FUNCTIONS_REGION);
    expect(env.cloudinaryCloudName).toBeNull();
    expect(env.paymentProvider).toBe('dummy');
    expect(env.dummyPaymentSuccessRate).toBe(0.9);
    expect(env.enableAnalytics).toBe(false);
    expect(env.siteUrl).toBe(window.location.origin);
  });

  it('trims values and treats whitespace as not set', async () => {
    const env = await loadEnv({
      VITE_FIREBASE_PROJECT_ID: '  hwa-prod  ',
      VITE_FIREBASE_API_KEY: '   ',
      VITE_FIREBASE_MEASUREMENT_ID: ' G-ABC123 ',
      VITE_EMULATOR_HOST: ' localhost ',
    });
    expect(env.firebase.projectId).toBe('hwa-prod');
    expect(env.firebase.authDomain).toBe('hwa-prod.firebaseapp.com');
    expect(env.firebase.storageBucket).toBe('hwa-prod.appspot.com');
    expect(env.firebase.apiKey).toBe('demo-api-key');
    expect(env.firebase.measurementId).toBe('G-ABC123');
    expect(env.emulatorHost).toBe('localhost');
    // A real (non demo-*) project id without an explicit flag means production services.
    expect(env.useEmulators).toBe(false);
  });

  it('reads boolean flags case-insensitively and ignores unknown values', async () => {
    expect(
      (await loadEnv({ VITE_FIREBASE_PROJECT_ID: 'hwa-prod', VITE_USE_EMULATORS: 'YES' }))
        .useEmulators,
    ).toBe(true);
    expect((await loadEnv({ VITE_USE_EMULATORS: ' No ' })).useEmulators).toBe(false);
    expect((await loadEnv({ VITE_USE_EMULATORS: '0' })).useEmulators).toBe(false);
    // Unknown → not set → the demo-* project id decides.
    expect((await loadEnv({ VITE_USE_EMULATORS: 'maybe' })).useEmulators).toBe(true);
    expect(
      (await loadEnv({ VITE_FIREBASE_PROJECT_ID: 'hwa-prod', VITE_USE_EMULATORS: 'maybe' }))
        .useEmulators,
    ).toBe(false);
    expect((await loadEnv({ VITE_ENABLE_ANALYTICS: 'TRUE' })).enableAnalytics).toBe(true);
    expect((await loadEnv({ VITE_ENABLE_ANALYTICS: '1' })).enableAnalytics).toBe(true);
    expect((await loadEnv({ VITE_ENABLE_ANALYTICS: 'on' })).enableAnalytics).toBe(false);
  });

  it('validates the Cloudinary cloud name', async () => {
    expect(
      (await loadEnv({ VITE_CLOUDINARY_CLOUD_NAME: ' my_cloud-1 ' })).cloudinaryCloudName,
    ).toBe('my_cloud-1');
    expect(
      (await loadEnv({ VITE_CLOUDINARY_CLOUD_NAME: 'my cloud!' })).cloudinaryCloudName,
    ).toBeNull();
    expect(
      (await loadEnv({ VITE_CLOUDINARY_CLOUD_NAME: 'cloud/../x' })).cloudinaryCloudName,
    ).toBeNull();
  });

  it('accepts only known payment providers', async () => {
    expect((await loadEnv({ VITE_PAYMENT_PROVIDER: 'razorpay' })).paymentProvider).toBe('razorpay');
    expect((await loadEnv({ VITE_PAYMENT_PROVIDER: 'stripe' })).paymentProvider).toBe('dummy');
    expect((await loadEnv({ VITE_PAYMENT_PROVIDER: 'Razorpay' })).paymentProvider).toBe('dummy');
  });

  it('accepts a finite success rate in [0, 1] only', async () => {
    const rate = async (value: string) =>
      (await loadEnv({ VITE_DUMMY_PAYMENT_SUCCESS_RATE: value })).dummyPaymentSuccessRate;
    expect(await rate(' 0.25 ')).toBe(0.25);
    expect(await rate('1')).toBe(1);
    expect(await rate('0')).toBe(0);
    expect(await rate('1e-1')).toBe(0.1);
    expect(await rate('abc')).toBe(0.9);
    expect(await rate('1.5')).toBe(0.9);
    expect(await rate('-0.1')).toBe(0.9);
    expect(await rate('Infinity')).toBe(0.9);
  });

  it('accepts only parseable site URLs and strips trailing slashes', async () => {
    expect((await loadEnv({ VITE_SITE_URL: 'https://hotwheelsarena.web.app///' })).siteUrl).toBe(
      'https://hotwheelsarena.web.app',
    );
    expect((await loadEnv({ VITE_SITE_URL: 'not a url' })).siteUrl).toBe(window.location.origin);
  });

  it('stays out of zod (entry-chunk module)', () => {
    expect(envSource).not.toMatch(/from\s+['"](zod|@shared\/schemas|@shared)['"]/);
  });
});
