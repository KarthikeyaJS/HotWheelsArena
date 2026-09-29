/**
 * Firebase Admin SDK singletons.
 *
 * `initializeApp()` runs exactly once per process (Cloud Functions reuse warm instances and the
 * emulator may load this module more than once). With no arguments the Admin SDK picks up the
 * project from `FIREBASE_CONFIG` / `GCLOUD_PROJECT` (set automatically in Cloud Functions and the
 * Emulator Suite) and connects to the Firestore / Auth emulators through their standard
 * `*_EMULATOR_HOST` variables — no code changes between local and production.
 */
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';

export const adminApp: App = getApps().length > 0 ? getApp() : initializeApp();

export const db: Firestore = getFirestore(adminApp);

export { FieldValue, Timestamp };

/** `FieldValue.serverTimestamp()` — the only timestamp source for documents written by functions. */
export const serverTimestamp = (): FieldValue => FieldValue.serverTimestamp();
