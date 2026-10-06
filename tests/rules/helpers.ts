/**
 * Shared harness for the Firestore security-rules suite.
 *
 * - Boots a RulesTestEnvironment against the Firestore emulator started by
 *   `firebase emulators:exec` (see `npm run test:rules`), loading ./firestore.rules.
 * - Exposes one Firestore client per actor (signed out, two collectors, an admin).
 * - Seeds fixtures with rules disabled, exactly like Cloud Functions (Admin SDK) would.
 *
 * `RulesTestContext.firestore()` returns the (fully typed) compat Firestore client, so the
 * suite uses the compat API — the rules engine sees the same requests either way.
 */
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type TokenOptions,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Every assertFails() makes the SDK log the (expected) PERMISSION_DENIED stream error at "warn"
// level. Keep the suite output readable while still surfacing genuine SDK errors.
firebase.firestore.setLogLevel('error');

export const PROJECT_ID = 'demo-hotwheelsarena';

/**
 * Emulator address: `FIRESTORE_EMULATOR_HOST` (`host:port`, set by `firebase emulators:exec`, so
 * the suite also runs against an emulator on another port), else the default 127.0.0.1:8080.
 */
function emulatorAddress(): { host: string; port: number } {
  const match = /^(.+):(\d+)$/.exec(process.env.FIRESTORE_EMULATOR_HOST?.trim() ?? '');
  return match?.[1] && match[2]
    ? { host: match[1], port: Number(match[2]) }
    : { host: '127.0.0.1', port: 8080 };
}

export const { host: FIRESTORE_HOST, port: FIRESTORE_PORT } = emulatorAddress();

export const RULES_FILE = new URL('../../firestore.rules', import.meta.url);

export type Db = firebase.firestore.Firestore;
export type DocData = firebase.firestore.DocumentData;

export const ALICE = 'alice';
export const BOB = 'bob';
export const ADMIN = 'admin-ops';

/** The rules source exactly as deployed. */
export function readRules(): string {
  return readFileSync(RULES_FILE, 'utf8');
}

export function createTestEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readRules(),
      host: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
    },
  });
}

export interface Actors {
  /** Signed-out visitor. */
  anon: Db;
  /** Signed-in collector `alice`. */
  alice: Db;
  /** Another signed-in collector, `bob`. */
  bob: Db;
  /** Signed-in operator carrying the `admin: true` custom claim. */
  admin: Db;
}

const collectorToken = (uid: string): TokenOptions => ({
  email: `${uid}@example.com`,
  email_verified: true,
  name: uid,
  firebase: { sign_in_provider: 'google.com' },
});

export function actors(env: RulesTestEnvironment): Actors {
  return {
    anon: env.unauthenticatedContext().firestore(),
    alice: env.authenticatedContext(ALICE, collectorToken(ALICE)).firestore(),
    bob: env.authenticatedContext(BOB, collectorToken(BOB)).firestore(),
    admin: env.authenticatedContext(ADMIN, { ...collectorToken(ADMIN), admin: true }).firestore(),
  };
}

/** Client for an arbitrary uid with extra token claims (e.g. `{ admin: false }`). */
export function actorWithClaims(env: RulesTestEnvironment, uid: string, claims: TokenOptions): Db {
  return env.authenticatedContext(uid, { ...collectorToken(uid), ...claims }).firestore();
}

/** Writes `docs` (path → data) with security rules disabled. */
export async function seed(
  env: RulesTestEnvironment,
  docs: Record<string, DocData>,
): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(Object.entries(docs).map(([path, data]) => db.doc(path).set(data)));
  });
}

/* -------------------------------------------------------------------------------------------- */
/*                                          Fixtures                                            */
/* -------------------------------------------------------------------------------------------- */

export const serverTimestamp = (): firebase.firestore.FieldValue =>
  firebase.firestore.FieldValue.serverTimestamp();

/** Field transforms (delete / arrayUnion / increment) a tampered client could send. */
export const fieldValue = firebase.firestore.FieldValue;

/** A fixed, clearly-not-now timestamp for seeded documents. */
export const SEEDED_AT = firebase.firestore.Timestamp.fromDate(new Date('2026-01-15T10:00:00Z'));

/** A client-chosen timestamp (what a tampered client would send instead of serverTimestamp()). */
export const clientTimestamp = (): firebase.firestore.Timestamp =>
  firebase.firestore.Timestamp.fromDate(new Date('2020-01-01T00:00:00Z'));

export function productDoc(id: string, overrides: DocData = {}): DocData {
  return {
    slug: id,
    name: `Test Car ${id}`,
    description: '',
    make: 'Generic',
    model: 'Racer',
    series: 'hw-test-2026',
    seriesName: 'HW Test',
    seriesNumber: 3,
    collectionNumber: 142,
    year: 2026,
    scale: '1:64',
    color: 'Orange',
    material: 'Die-cast metal',
    vehicleType: 'Coupe',
    category: 'racing',
    rarity: 'common',
    rarityScore: 3,
    collectorScore: 4,
    themedStats: { topSpeedKmh: 320, powerHp: 600 },
    price: 499,
    compareAtPrice: null,
    currency: 'INR',
    stock: 25,
    limitedEdition: null,
    images: [
      { publicId: `hotwheelsarena/cars/${id}`, url: '/placeholders/car-generic.svg', alt: id },
    ],
    primaryImage: '/placeholders/car-generic.svg',
    ratingAvg: 0,
    ratingCount: 0,
    tags: [],
    isNew: false,
    isFeatured: false,
    isVault: false,
    isActive: true,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    ...overrides,
  };
}

export function profileDoc(uid: string, overrides: DocData = {}): DocData {
  return {
    uid,
    displayName: `Collector ${uid}`,
    email: `${uid}@example.com`,
    photoURL: null,
    xp: 0,
    level: 1,
    badges: [],
    stats: {
      carsOwned: 0,
      uniqueCars: 0,
      seriesCompleted: 0,
      ordersPlaced: 0,
      racingCars: 0,
      rareCars: 0,
      totalSpent: 0,
    },
    role: 'customer',
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    ...overrides,
  };
}

export function orderDoc(uid: string, overrides: DocData = {}): DocData {
  return {
    uid,
    items: [
      {
        productId: 'p-1',
        slug: 'p-1',
        name: 'Test Car p-1',
        price: 499,
        qty: 2,
        image: '/placeholders/car-generic.svg',
      },
    ],
    subtotal: 998,
    shipping: 79,
    tax: 152.24,
    total: 1077,
    currency: 'INR',
    address: {
      name: 'Arjun Mehta',
      phone: '9876543210',
      pincode: '560001',
      line1: '221 MG Road',
      line2: '',
      landmark: '',
      city: 'Bengaluru',
      state: 'Karnataka',
    },
    status: 'placed',
    payment: {
      provider: 'dummy',
      status: 'success',
      transactionId: 'test_0123456789abcdef0123',
      mode: 'test',
    },
    paymentMethod: 'upi',
    xpEarned: 150,
    badgesUnlocked: ['first-ride'],
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    ...overrides,
  };
}

/** A valid client address write (as produced by src/services/firestore/addresses.ts). */
export function addressWrite(overrides: DocData = {}): DocData {
  return {
    name: 'Arjun Mehta',
    phone: '9876543210',
    pincode: '560001',
    line1: '221B MG Road, Indiranagar',
    line2: '',
    landmark: 'Near the metro station',
    city: 'Bengaluru',
    state: 'Karnataka',
    isDefault: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

/** A valid manual garage entry (as produced by src/services/firestore/garage.ts). */
export function manualGarageWrite(productId: string, overrides: DocData = {}): DocData {
  return {
    productId,
    addedAt: serverTimestamp(),
    source: 'manual',
    isFavorite: false,
    quantity: 1,
    ...overrides,
  };
}

/** Returns a shallow copy of `data` without `key`. */
export function without(data: DocData, key: string): DocData {
  return Object.fromEntries(Object.entries(data).filter(([name]) => name !== key));
}
