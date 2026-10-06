/**
 * Typed, validated environment. Every field has a safe default so the app boots against
 * the Emulator Suite with zero configuration. Invalid values silently fall back to defaults
 * instead of crashing the storefront.
 *
 * Entry-chunk module: the readers below are hand-written on purpose — importing zod here would
 * put it in the boot bundle (schemas live in lazy chunks).
 */
import { DEMO_PROJECT_ID, FUNCTIONS_REGION } from '@shared/constants';
import { PAYMENT_PROVIDER_IDS, type PaymentProviderId } from '@shared/types';

type BooleanFlag = 'true' | 'false' | '1' | '0' | 'yes' | 'no';

const BOOLEAN_FLAGS: readonly BooleanFlag[] = ['true', 'false', '1', '0', 'yes', 'no'];
const CLOUDINARY_CLOUD_NAME = /^[a-z0-9_-]+$/i;

/** Trimmed string; '' / whitespace / non-strings count as "not set". */
function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** true/false/1/0/yes/no (any case); anything else → not set. */
function readBooleanFlag(value: unknown): BooleanFlag | undefined {
  const text = readString(value)?.toLowerCase();
  return BOOLEAN_FLAGS.find((flag) => flag === text);
}

/** Cloudinary cloud names may only contain letters, digits, _ and -. */
function readCloudinaryName(value: unknown): string | undefined {
  const text = readString(value);
  return text !== undefined && CLOUDINARY_CLOUD_NAME.test(text) ? text : undefined;
}

function readPaymentProvider(value: unknown): PaymentProviderId | undefined {
  const text = readString(value);
  return PAYMENT_PROVIDER_IDS.find((id) => id === text);
}

/** A finite number in [0, 1] (Number() coercion, so '0.5', '1', '1e-1' all work). */
function readProbability(value: unknown): number | undefined {
  const text = readString(value);
  if (text === undefined) return undefined;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : undefined;
}

/** An absolute URL that `new URL()` accepts. */
function readUrl(value: unknown): string | undefined {
  const text = readString(value);
  if (text === undefined) return undefined;
  try {
    new URL(text);
    return text;
  } catch {
    return undefined;
  }
}

const source: Readonly<Record<string, unknown>> = import.meta.env;

const raw = {
  VITE_FIREBASE_API_KEY: readString(source.VITE_FIREBASE_API_KEY),
  VITE_FIREBASE_AUTH_DOMAIN: readString(source.VITE_FIREBASE_AUTH_DOMAIN),
  VITE_FIREBASE_PROJECT_ID: readString(source.VITE_FIREBASE_PROJECT_ID),
  VITE_FIREBASE_STORAGE_BUCKET: readString(source.VITE_FIREBASE_STORAGE_BUCKET),
  VITE_FIREBASE_MESSAGING_SENDER_ID: readString(source.VITE_FIREBASE_MESSAGING_SENDER_ID),
  VITE_FIREBASE_APP_ID: readString(source.VITE_FIREBASE_APP_ID),
  VITE_FIREBASE_MEASUREMENT_ID: readString(source.VITE_FIREBASE_MEASUREMENT_ID),
  VITE_USE_EMULATORS: readBooleanFlag(source.VITE_USE_EMULATORS),
  VITE_EMULATOR_HOST: readString(source.VITE_EMULATOR_HOST),
  VITE_FUNCTIONS_REGION: readString(source.VITE_FUNCTIONS_REGION),
  VITE_CLOUDINARY_CLOUD_NAME: readCloudinaryName(source.VITE_CLOUDINARY_CLOUD_NAME),
  VITE_PAYMENT_PROVIDER: readPaymentProvider(source.VITE_PAYMENT_PROVIDER),
  VITE_DUMMY_PAYMENT_SUCCESS_RATE: readProbability(source.VITE_DUMMY_PAYMENT_SUCCESS_RATE),
  VITE_ENABLE_ANALYTICS: readBooleanFlag(source.VITE_ENABLE_ANALYTICS),
  VITE_SITE_URL: readUrl(source.VITE_SITE_URL),
};

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
  /** Approval probability (0–1) of the test-mode DummyPaymentProvider for card/UPI (default 0.9). */
  dummyPaymentSuccessRate: number;
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
  dummyPaymentSuccessRate: raw.VITE_DUMMY_PAYMENT_SUCCESS_RATE ?? 0.9,
  enableAnalytics: isTrue(raw.VITE_ENABLE_ANALYTICS),
  siteUrl: (raw.VITE_SITE_URL ?? siteUrlFallback).replace(/\/+$/, ''),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
};

/** Shorthand for `env.useEmulators`. */
export const USE_EMULATORS = env.useEmulators;
