/**
 * Typed, validated environment. Every field has a safe default so the app boots against
 * the Emulator Suite with zero configuration. Invalid values fall back to defaults
 * (logged once in development) instead of crashing the storefront.
 */
import { z } from 'zod';
import { DEMO_PROJECT_ID, FUNCTIONS_REGION } from '@shared/constants';
import { PAYMENT_PROVIDER_IDS, type PaymentProviderId } from '@shared/types';

/** Treat '' / whitespace as "not set". */
const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
  z.string().optional(),
);

const booleanFlag = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim().toLowerCase() : undefined,
  z.enum(['true', 'false', '1', '0', 'yes', 'no']).optional(),
);

const EnvSchema = z.object({
  VITE_FIREBASE_API_KEY: optionalString,
  VITE_FIREBASE_AUTH_DOMAIN: optionalString,
  VITE_FIREBASE_PROJECT_ID: optionalString,
  VITE_FIREBASE_STORAGE_BUCKET: optionalString,
  VITE_FIREBASE_MESSAGING_SENDER_ID: optionalString,
  VITE_FIREBASE_APP_ID: optionalString,
  VITE_FIREBASE_MEASUREMENT_ID: optionalString,
  VITE_USE_EMULATORS: booleanFlag.catch(undefined),
  VITE_EMULATOR_HOST: optionalString,
  VITE_FUNCTIONS_REGION: optionalString,
  VITE_CLOUDINARY_CLOUD_NAME: optionalString
    .pipe(
      z
        .string()
        .regex(/^[a-z0-9_-]+$/i, 'Cloudinary cloud name may only contain letters, digits, _ and -')
        .optional(),
    )
    .catch(undefined),
  VITE_PAYMENT_PROVIDER: optionalString
    .pipe(z.enum(PAYMENT_PROVIDER_IDS).optional())
    .catch(undefined),
  VITE_ENABLE_ANALYTICS: booleanFlag.catch(undefined),
  VITE_SITE_URL: optionalString.pipe(z.string().url().optional()).catch(undefined),
});

const raw = EnvSchema.parse(import.meta.env);

const isTrue = (flag: string | undefined): boolean =>
  flag === 'true' || flag === '1' || flag === 'yes';

const projectId = raw.VITE_FIREBASE_PROJECT_ID ?? DEMO_PROJECT_ID;
const isDemoProject = projectId.startsWith('demo-');

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface AppEnv {
  firebase: FirebaseWebConfig;
  /** Connect Auth / Firestore / Functions to the local Emulator Suite. */
  useEmulators: boolean;
  emulatorHost: string;
  functionsRegion: string;
  /** `null` → Cloudinary disabled, local placeholder URLs are used. */
  cloudinaryCloudName: string | null;
  paymentProvider: PaymentProviderId;
  enableAnalytics: boolean;
  /** Public origin without trailing slash, e.g. `https://hotwheelsarena.web.app`. */
  siteUrl: string;
  isDev: boolean;
  isProd: boolean;
  mode: string;
}

const siteUrlFallback =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:5173';

export const env: AppEnv = {
  firebase: {
    apiKey: raw.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
    authDomain: raw.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: raw.VITE_FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`,
    messagingSenderId: raw.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: raw.VITE_FIREBASE_APP_ID ?? '1:000000000000:web:0000000000000000000000',
    ...(raw.VITE_FIREBASE_MEASUREMENT_ID
      ? { measurementId: raw.VITE_FIREBASE_MEASUREMENT_ID }
      : {}),
  },
  // Explicit flag wins; otherwise a demo-* project id implies the emulators.
  useEmulators:
    raw.VITE_USE_EMULATORS !== undefined ? isTrue(raw.VITE_USE_EMULATORS) : isDemoProject,
  emulatorHost: raw.VITE_EMULATOR_HOST ?? '127.0.0.1',
  functionsRegion: raw.VITE_FUNCTIONS_REGION ?? FUNCTIONS_REGION,
  cloudinaryCloudName: raw.VITE_CLOUDINARY_CLOUD_NAME ?? null,
  paymentProvider: raw.VITE_PAYMENT_PROVIDER ?? 'dummy',
  enableAnalytics: isTrue(raw.VITE_ENABLE_ANALYTICS),
  siteUrl: (raw.VITE_SITE_URL ?? siteUrlFallback).replace(/\/+$/, ''),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
};

/** Shorthand for `env.useEmulators`. */
export const USE_EMULATORS = env.useEmulators;
