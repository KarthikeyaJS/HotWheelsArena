/**
 * Cross-cutting constants shared by the web app, Cloud Functions, seed script and rules tests.
 * Keep this file dependency-free.
 */

/** Cloud Functions region — used by `getFunctions(app, region)` and every function definition. */
export const FUNCTIONS_REGION = 'asia-south1';

/** Project id used by the Emulator Suite (a `demo-*` id needs no real Firebase project). */
export const DEMO_PROJECT_ID = 'demo-hotwheelsarena';

/** Emulator Suite ports (must match firebase.json). */
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  hosting: 5000,
  ui: 4000,
} as const;

/** Callable Cloud Function names (exported with exactly these names from functions/src/index.ts). */
export const CALLABLES = {
  ensureUserProfile: 'ensureUserProfile',
  placeOrder: 'placeOrder',
  submitReview: 'submitReview',
  subscribeNewsletter: 'subscribeNewsletter',
} as const;
export type CallableName = (typeof CALLABLES)[keyof typeof CALLABLES];

/** Top-level Firestore collections. */
export const COLLECTIONS = {
  products: 'products',
  categories: 'categories',
  series: 'series',
  users: 'users',
  orders: 'orders',
  newsletter: 'newsletter',
  settings: 'settings',
} as const;

/** Sub-collections. `reviews` lives under products/{id}; the rest under users/{uid}. */
export const SUBCOLLECTIONS = {
  reviews: 'reviews',
  addresses: 'addresses',
  garage: 'garage',
  wishlist: 'wishlist',
} as const;

/** `settings/{SETTINGS_SITE_DOC_ID}` holds `SiteSettings`. */
export const SETTINGS_SITE_DOC_ID = 'site';

/** Transaction id format produced by the dummy (test-mode) payment provider: `test_` + 20 lowercase hex. */
export const DUMMY_TRANSACTION_ID_REGEX = /^test_[0-9a-f]{20}$/;
