/**
 * Firebase singletons (modular v10 SDK).
 * - Firestore uses the in-memory cache: TanStack Query is the app cache.
 * - Emulator connections are guarded so Vite HMR never connects twice.
 * - Analytics is optional and lazily imported (never in the entry chunk).
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { EMULATOR_PORTS } from '@shared/constants';
import { env } from './env';

export const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(env.firebase);

export const auth: Auth = getAuth(firebaseApp);

function createFirestore(app: FirebaseApp): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
      ignoreUndefinedProperties: true,
    });
  } catch {
    // Already initialised (HMR re-evaluation) — reuse the existing instance.
    return getFirestore(app);
  }
}

export const db: Firestore = createFirestore(firebaseApp);

export const functions: Functions = getFunctions(firebaseApp, env.functionsRegion);

type EmulatorGlobal = typeof globalThis & { __HWA_EMULATORS_CONNECTED__?: boolean };

function connectEmulators(): void {
  const scope = globalThis as EmulatorGlobal;
  if (!env.useEmulators || scope.__HWA_EMULATORS_CONNECTED__) return;
  const host = env.emulatorHost;
  connectAuthEmulator(auth, `http://${host}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, EMULATOR_PORTS.firestore);
  connectFunctionsEmulator(functions, host, EMULATOR_PORTS.functions);
  scope.__HWA_EMULATORS_CONNECTED__ = true;
  if (env.isDev) {
    console.info(
      `[firebase] Emulator Suite → auth :${EMULATOR_PORTS.auth}, firestore :${EMULATOR_PORTS.firestore}, functions :${EMULATOR_PORTS.functions} on ${host}`,
    );
  }
}

connectEmulators();

let analyticsStarted = false;

/**
 * Initialises Firebase Analytics when enabled (`VITE_ENABLE_ANALYTICS=true`, not on the
 * emulators, measurement id present and the browser supports it). Safe to call many times.
 */
export async function initAnalytics(): Promise<void> {
  if (analyticsStarted || !env.enableAnalytics || env.useEmulators || !env.firebase.measurementId) {
    return;
  }
  analyticsStarted = true;
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) getAnalytics(firebaseApp);
  } catch (error) {
    analyticsStarted = false;
    console.warn('[firebase] Analytics unavailable:', error);
  }
}
