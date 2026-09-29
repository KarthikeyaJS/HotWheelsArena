#!/usr/bin/env node
/**
 * HotWheelsArena — end-to-end smoke test against the Firebase Emulator Suite.
 *
 * Exercises the real Cloud Functions (built from functions/lib), the Firestore security rules and
 * the seeded catalogue exactly like the web app does — over HTTP, with an Auth-emulator ID token:
 *
 *   auth sign-up → ensureUserProfile (+ idempotent repeat) → placeOrder (2 in-stock cars, amount
 *   priced like the cart) → order / garage / XP / first-ride checks → idempotent replay → tampered
 *   amount, sold-out car and unauthenticated rejections → submitReview aggregates → newsletter
 *   dedupe + per-IP rate limit → a forged 'purchase' garage entry denied by the rules → a manual
 *   garage entry written through the rules → onGarageWrite stats / badge sync.
 *
 * Usage
 *   npm run smoke                  builds functions (presmoke), starts auth + firestore + functions
 *                                  emulators, seeds them, runs this script, shuts everything down
 *   node scripts/smoke-e2e.mjs     against emulators that are already running and seeded
 *                                  (npm run emulators + npm run seed:emulator)
 *
 * Env overrides: FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST (both set automatically by
 * `firebase emulators:exec`), SMOKE_FUNCTIONS_HOST (default 127.0.0.1:5001), SMOKE_PROJECT_ID
 * (default demo-hotwheelsarena).
 *
 * Node 22+, global fetch only (no dependencies). Prints a PASS/FAIL table; exit code 1 on any failure.
 */
import { randomBytes } from 'node:crypto';

/* ---------------------------------- config --------------------------------- */

const PROJECT_ID = process.env.SMOKE_PROJECT_ID || 'demo-hotwheelsarena';
const REGION = 'asia-south1';
const API_KEY = 'demo-api-key';

/** Accepts `host:port` or a full URL and returns `host:port`. */
const hostFrom = (value, fallback) =>
  (value && value.trim() ? value.trim() : fallback).replace(/^https?:\/\//, '').replace(/\/+$/, '');

const AUTH_HOST = hostFrom(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
const FIRESTORE_HOST = hostFrom(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
const FUNCTIONS_HOST = hostFrom(process.env.SMOKE_FUNCTIONS_HOST, '127.0.0.1:5001');

const DATABASE_PATH = `projects/${PROJECT_ID}/databases/(default)`;
const FIRESTORE_API = `http://${FIRESTORE_HOST}/v1/${DATABASE_PATH}`;
const FIRESTORE_DOCS = `${FIRESTORE_API}/documents`;
const FUNCTIONS_BASE = `http://${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}`;
const AUTH_BASE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;

/** The first callable invocation cold-starts the functions runtime. */
const REQUEST_TIMEOUT_MS = 60_000;
/** How long the onGarageWrite trigger gets to sync the profile. */
const TRIGGER_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 500;

/** Mirror of shared DEFAULT_SITE_SETTINGS (used only if settings/site is missing). */
const DEFAULT_SETTINGS = {
  shippingThreshold: 999,
  shippingFee: 79,
  taxRate: 0.18,
  taxInclusive: true,
};

const TEST_ADDRESS = {
  name: 'Smoke Test Collector',
  phone: '9876543210',
  pincode: '560001',
  line1: '42 Pit Lane, Garage Row',
  line2: '',
  landmark: 'Opposite the race track',
  city: 'Bengaluru',
  state: 'Karnataka',
};

/* ---------------------------------- http ----------------------------------- */

/**
 * @param {string} method
 * @param {string} url
 * @param {{ body?: unknown; token?: string; headers?: Record<string, string> }} [options]
 */
async function http(method, url, { body, token, headers: extraHeaders = {} } = {}) {
  const headers = { ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, ok: response.ok, json, text };
}

const snippet = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .slice(0, 200);

/* -------------------------------- firestore -------------------------------- */

/** Decodes a Firestore REST `Value` into plain JS. */
function decodeValue(value) {
  if (value === null || value === undefined) return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields);
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, v]) => [key, decodeValue(v)]));
}

function decodeDocument(document) {
  return { id: document.name.split('/').pop(), data: decodeFields(document.fields) };
}

/**
 * Reads one document. `token` defaults to the emulator's rules-bypassing "owner" credential.
 * @returns {Promise<{ id: string; data: Record<string, unknown> } | null>}
 */
async function getDocument(path, token = 'owner') {
  const response = await http('GET', `${FIRESTORE_DOCS}/${path}`, { token });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GET ${path} failed (HTTP ${response.status}): ${snippet(response.text)}`);
  }
  return decodeDocument(response.json);
}

/** Lists a whole collection (owner credential), following page tokens. */
async function listDocuments(collectionPath) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '300' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await http('GET', `${FIRESTORE_DOCS}/${collectionPath}?${query}`, {
      token: 'owner',
    });
    if (!response.ok) {
      throw new Error(
        `LIST ${collectionPath} failed (HTTP ${response.status}): ${snippet(response.text)}`,
      );
    }
    documents.push(...(response.json?.documents ?? []).map(decodeDocument));
    pageToken = response.json?.nextPageToken ?? '';
  } while (pageToken);
  return documents;
}

/**
 * Creates `users/{uid}/garage/{productId}` AS THE USER (security rules apply), with
 * `addedAt` set to the request time exactly like the web SDK's serverTimestamp().
 */
async function createGarageEntryAsUser(uid, productId, idToken, source) {
  const name = `${DATABASE_PATH}/documents/users/${uid}/garage/${productId}`;
  return http('POST', `${FIRESTORE_API}/documents:commit`, {
    token: idToken,
    body: {
      writes: [
        {
          update: {
            name,
            fields: {
              productId: { stringValue: productId },
              source: { stringValue: source },
              isFavorite: { booleanValue: false },
              quantity: { integerValue: '1' },
            },
          },
          updateTransforms: [{ fieldPath: 'addedAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
      ],
    },
  });
}

/* ------------------------------ auth + callables ----------------------------- */

async function signUp(email, password, displayName) {
  const response = await http('POST', `${AUTH_BASE}/accounts:signUp?key=${API_KEY}`, {
    body: { email, password, displayName, returnSecureToken: true },
  });
  if (!response.ok || typeof response.json?.idToken !== 'string') {
    throw new Error(
      `Auth emulator sign-up failed (HTTP ${response.status}): ${snippet(response.text)}`,
    );
  }
  return { uid: response.json.localId, idToken: response.json.idToken };
}

/**
 * Invokes a callable over the onCall HTTP protocol.
 * @returns {Promise<{ ok: true; result: any } | { ok: false; status: number; code: string; message: string }>}
 */
async function callFunction(name, data, idToken, headers = {}) {
  const response = await http('POST', `${FUNCTIONS_BASE}/${name}`, {
    body: { data },
    token: idToken,
    headers,
  });
  if (response.ok && response.json && 'result' in response.json) {
    return { ok: true, result: response.json.result };
  }
  const error = response.json?.error;
  return {
    ok: false,
    status: response.status,
    code: typeof error?.status === 'string' ? error.status : `HTTP_${response.status}`,
    message: typeof error?.message === 'string' ? error.message : snippet(response.text),
  };
}

/* --------------------------------- commerce -------------------------------- */

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Same rules as shared/commerce.ts `computeOrderTotals` (GST-inclusive prices, flat shipping
 * below the free-shipping threshold) — the client charges exactly this amount.
 */
function computeOrderTotals(lines, settings) {
  const valid = lines.filter(
    (line) => Number.isFinite(line.price) && Number.isFinite(line.qty) && line.qty > 0,
  );
  const subtotal = roundCurrency(
    valid.reduce((sum, line) => sum + Math.max(0, line.price) * Math.floor(line.qty), 0),
  );
  const threshold = Math.max(0, settings.shippingThreshold);
  const shipping = subtotal === 0 || subtotal >= threshold ? 0 : Math.max(0, settings.shippingFee);
  const rate = Math.max(0, settings.taxRate);
  const tax = settings.taxInclusive
    ? roundCurrency(subtotal - subtotal / (1 + rate))
    : roundCurrency(subtotal * rate);
  const total = roundCurrency(
    settings.taxInclusive ? subtotal + shipping : subtotal + shipping + tax,
  );
  return { subtotal, shipping, tax, total };
}

const testTransactionId = () => `test_${randomBytes(10).toString('hex')}`;

function dummyPayment(amount, method = 'card') {
  return {
    provider: 'dummy',
    status: 'success',
    transactionId: testTransactionId(),
    mode: 'test',
    method,
    amount,
  };
}

const byPriceThenId = (a, b) => a.data.price - b.data.price || a.id.localeCompare(b.id);

/* ------------------------------- test harness ------------------------------ */

/** @type {{ name: string; pass: boolean; detail: string; ms: number }[]} */
const results = [];

class Skip extends Error {}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function requires(value, what) {
  if (value === undefined || value === null) throw new Skip(`skipped — needs ${what}`);
  return value;
}

/** Runs one named check; its return value (string) becomes the detail column. */
async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    results.push({ name, pass: true, detail: detail ?? '', ms: Date.now() - startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, pass: false, detail: message, ms: Date.now() - startedAt });
  }
  const last = results[results.length - 1];
  console.log(`${last.pass ? 'PASS' : 'FAIL'}  ${name}${last.detail ? `  — ${last.detail}` : ''}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(read, predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = await read();
  while (!predicate(last) && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    last = await read();
  }
  return { value: last, satisfied: predicate(last) };
}

function expectRejection(response, code, messagePart) {
  check(
    !response.ok,
    `expected ${code}, but the call succeeded: ${JSON.stringify(response.result)}`,
  );
  check(response.code === code, `expected ${code}, got ${response.code}: ${response.message}`);
  if (messagePart) {
    check(
      response.message.toLowerCase().includes(messagePart.toLowerCase()),
      `message should mention "${messagePart}", got: ${response.message}`,
    );
  }
  return `${response.code}: ${response.message}`;
}

function printTable() {
  const rows = results.map((result, index) => [
    String(index + 1),
    result.pass ? 'PASS' : 'FAIL',
    result.name,
    `${(result.ms / 1000).toFixed(1)}s`,
  ]);
  const headers = ['#', 'RESULT', 'CHECK', 'TIME'];
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => row[column].length)),
  );
  const line = (cells) => `| ${cells.map((cell, i) => cell.padEnd(widths[i])).join(' | ')} |`;
  const rule = `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;
  console.log(`\n${rule}\n${line(headers)}\n${rule}`);
  for (const row of rows) console.log(line(row));
  console.log(rule);
  const failed = results.filter((result) => !result.pass);
  console.log(
    failed.length === 0
      ? `\nSMOKE PASSED — ${results.length}/${results.length} checks green.`
      : `\nSMOKE FAILED — ${failed.length} of ${results.length} checks failed:\n${failed
          .map((result) => `  ✖ ${result.name}: ${result.detail}`)
          .join('\n')}`,
  );
  return failed.length;
}

/* ----------------------------------- main ---------------------------------- */

async function main() {
  console.log('HotWheelsArena smoke test');
  console.log(
    `  project ${PROJECT_ID} · auth ${AUTH_HOST} · firestore ${FIRESTORE_HOST} · functions ${FUNCTIONS_BASE}\n`,
  );

  const ctx = {
    /** @type {{ id: string; data: Record<string, any> }[]} */ products: [],
    settings: DEFAULT_SETTINGS,
    /** @type {{ uid: string; idToken: string } | null} */ user: null,
    email: `smoke.${Date.now()}.${randomBytes(3).toString('hex')}@hwa.test`,
    /** @type {{ id: string; data: Record<string, any> }[]} */ purchased: [],
    orderRequest: null,
    expected: null,
    /** @type {string | null} */ orderId: null,
    /** @type {number | null} */ xpAfterOrder: null,
  };

  await step('emulators reachable (auth, firestore)', async () => {
    const [firestore, auth] = await Promise.all([
      http('GET', `http://${FIRESTORE_HOST}/`),
      http('GET', `http://${AUTH_HOST}/`),
    ]);
    check(firestore.ok, `Firestore emulator answered HTTP ${firestore.status}`);
    check(auth.ok, `Auth emulator answered HTTP ${auth.status}`);
    return `firestore ${FIRESTORE_HOST}, auth ${AUTH_HOST}`;
  });

  await step('seed: catalogue + settings/site present', async () => {
    ctx.products = (await listDocuments('products')).filter(
      (product) => product.data.isActive === true,
    );
    check(ctx.products.length >= 3, `expected a seeded catalogue, found ${ctx.products.length}`);
    const settings = await getDocument('settings/site');
    check(settings !== null, 'settings/site is missing — run npm run seed:emulator');
    ctx.settings = { ...DEFAULT_SETTINGS, ...settings.data };
    return `${ctx.products.length} active products; free shipping ≥ ₹${ctx.settings.shippingThreshold}, fee ₹${ctx.settings.shippingFee}`;
  });

  await step('auth: sign up a collector (Auth emulator REST)', async () => {
    ctx.user = await signUp(ctx.email, `Smoke-${randomBytes(6).toString('hex')}`, 'Smoke Tester');
    check(typeof ctx.user.uid === 'string' && ctx.user.uid.length > 0, 'no uid returned');
    return `uid ${ctx.user.uid}`;
  });

  await step('ensureUserProfile → users/{uid} exists', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const response = await callFunction('ensureUserProfile', {}, user.idToken);
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    check(typeof response.result?.created === 'boolean', 'response has no boolean "created"');
    const profile = await getDocument(`users/${user.uid}`);
    check(profile !== null, 'users doc was not created');
    check(profile.data.email === ctx.email, `email is ${profile.data.email}`);
    check(profile.data.role === 'customer', `role is ${profile.data.role}`);
    check(
      profile.data.xp === 0 && profile.data.level === 1,
      'new profile should be xp 0 / level 1',
    );
    return `created=${response.result.created} (onUserCreate may win the race), xp 0, level 1`;
  });

  await step('ensureUserProfile again → created false (idempotent)', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const response = await callFunction('ensureUserProfile', {}, user.idToken);
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    check(response.result?.created === false, `created is ${response.result?.created}`);
    return 'created=false';
  });

  await step('placeOrder: 2 in-stock cars, amount = shared totals', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const inStock = ctx.products.filter((product) => Number(product.data.stock) >= 1);
    const commons = inStock
      .filter((product) => product.data.rarity === 'common')
      .sort(byPriceThenId);
    ctx.purchased = (commons.length >= 2 ? commons : inStock.sort(byPriceThenId)).slice(0, 2);
    check(ctx.purchased.length === 2, 'the seed has fewer than 2 in-stock cars');
    const lines = ctx.purchased.map((product) => ({ price: product.data.price, qty: 1 }));
    ctx.expected = computeOrderTotals(lines, ctx.settings);
    ctx.orderRequest = {
      items: ctx.purchased.map((product) => ({ productId: product.id, qty: 1 })),
      address: TEST_ADDRESS,
      payment: dummyPayment(ctx.expected.total),
    };
    const response = await callFunction('placeOrder', ctx.orderRequest, user.idToken);
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    const result = response.result;
    check(typeof result.orderId === 'string' && result.orderId.length > 0, 'no orderId');
    check(
      result.total === ctx.expected.total,
      `total ${result.total} ≠ expected ${ctx.expected.total}`,
    );
    check(result.xpEarned > 0, `xpEarned is ${result.xpEarned}`);
    check(
      Array.isArray(result.badgesUnlocked) && result.badgesUnlocked.includes('first-ride'),
      `badgesUnlocked = ${JSON.stringify(result.badgesUnlocked)}`,
    );
    ctx.orderId = result.orderId;
    return `order ${result.orderId}: ${ctx.purchased.map((p) => `${p.id} ₹${p.data.price}`).join(' + ')} → total ₹${result.total} (shipping ₹${ctx.expected.shipping}), +${result.xpEarned} XP, badges ${result.badgesUnlocked.join(',')}`;
  });

  await step('order doc written with server totals', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const orderId = requires(ctx.orderId, 'a placed order');
    const order = await getDocument(`orders/${orderId}`);
    check(order !== null, 'orders doc missing');
    const data = order.data;
    check(data.uid === user.uid, `order uid ${data.uid}`);
    check(data.status === 'placed', `status ${data.status}`);
    check(Array.isArray(data.items) && data.items.length === 2, 'order should have 2 items');
    for (const key of ['subtotal', 'shipping', 'tax', 'total']) {
      check(data[key] === ctx.expected[key], `${key} ${data[key]} ≠ expected ${ctx.expected[key]}`);
    }
    check(data.payment?.provider === 'dummy', `payment.provider ${data.payment?.provider}`);
    check(data.payment?.status === 'success', `payment.status ${data.payment?.status}`);
    check(data.payment?.mode === 'test', `payment.mode ${data.payment?.mode}`);
    check(
      data.payment?.transactionId === ctx.orderRequest.payment.transactionId,
      'payment.transactionId mismatch',
    );
    check(data.xpEarned > 0, 'order.xpEarned missing');
    return `subtotal ₹${data.subtotal} · shipping ₹${data.shipping} · GST ₹${data.tax} · total ₹${data.total}`;
  });

  await step('garage: purchased cars parked (source purchase)', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    requires(ctx.orderId, 'a placed order');
    for (const product of ctx.purchased) {
      const entry = await getDocument(`users/${user.uid}/garage/${product.id}`);
      check(entry !== null, `garage entry ${product.id} missing`);
      check(entry.data.source === 'purchase', `${product.id} source ${entry.data.source}`);
      check(entry.data.quantity === 1, `${product.id} quantity ${entry.data.quantity}`);
      check(entry.data.productId === product.id, `${product.id} productId mismatch`);
    }
    return ctx.purchased.map((product) => product.id).join(', ');
  });

  await step('profile: xp > 0, first-ride badge, stats', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    requires(ctx.orderId, 'a placed order');
    const profile = await getDocument(`users/${user.uid}`);
    check(profile !== null, 'users doc missing');
    const { xp, level, badges, stats } = profile.data;
    check(xp > 0, `xp is ${xp}`);
    check(
      Array.isArray(badges) && badges.includes('first-ride'),
      `badges ${JSON.stringify(badges)}`,
    );
    check(stats?.ordersPlaced === 1, `stats.ordersPlaced ${stats?.ordersPlaced}`);
    check(stats?.uniqueCars === 2 && stats?.carsOwned === 2, `stats ${JSON.stringify(stats)}`);
    check(stats?.totalSpent === ctx.expected.total, `stats.totalSpent ${stats?.totalSpent}`);
    ctx.xpAfterOrder = xp;
    return `xp ${xp}, level ${level}, badges [${badges.join(', ')}], carsOwned ${stats.carsOwned}`;
  });

  await step('placeOrder replay (same transactionId) → same orderId', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const orderId = requires(ctx.orderId, 'a placed order');
    const response = await callFunction('placeOrder', ctx.orderRequest, user.idToken);
    check(response.ok, `replay failed: ${response.code} ${response.message}`);
    check(response.result.orderId === orderId, `replay returned ${response.result.orderId}`);
    const orders = (await listDocuments('orders')).filter((order) => order.data.uid === user.uid);
    check(orders.length === 1, `expected exactly 1 order for the user, found ${orders.length}`);
    return `orderId ${response.result.orderId}; still 1 order`;
  });

  await step('placeOrder tampered amount → rejected', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const request = requires(ctx.orderRequest, 'a priced order');
    const response = await callFunction(
      'placeOrder',
      { ...request, payment: dummyPayment(ctx.expected.total - 1) },
      user.idToken,
    );
    return expectRejection(response, 'FAILED_PRECONDITION', 'Prices changed');
  });

  await step('placeOrder sold-out car → rejected', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const soldOut = ctx.products.find((product) => Number(product.data.stock) === 0);
    check(soldOut !== undefined, 'the seed has no sold-out car to test with');
    const totals = computeOrderTotals([{ price: soldOut.data.price, qty: 1 }], ctx.settings);
    const response = await callFunction(
      'placeOrder',
      {
        items: [{ productId: soldOut.id, qty: 1 }],
        address: TEST_ADDRESS,
        payment: dummyPayment(totals.total),
      },
      user.idToken,
    );
    return `${soldOut.id}: ${expectRejection(response, 'FAILED_PRECONDITION', 'sold out')}`;
  });

  await step('placeOrder unauthenticated → rejected', async () => {
    const request = requires(ctx.orderRequest, 'a priced order');
    const response = await callFunction(
      'placeOrder',
      { ...request, payment: dummyPayment(ctx.expected.total) },
      undefined,
    );
    return expectRejection(response, 'UNAUTHENTICATED');
  });

  await step('submitReview → ratingCount +1 (verified buyer)', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const product = requires(ctx.purchased[0], 'a purchased car');
    const before = await getDocument(`products/${product.id}`);
    check(before !== null, 'product missing');
    const countBefore = Number(before.data.ratingCount ?? 0);
    const response = await callFunction(
      'submitReview',
      {
        productId: product.id,
        rating: 5,
        text: 'Smoke test: crisp tampo, rolls straight, a proper pit-lane keeper.',
      },
      user.idToken,
    );
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    check(response.result.reviewId === user.uid, `reviewId ${response.result.reviewId}`);
    const after = await getDocument(`products/${product.id}`);
    const countAfter = Number(after?.data.ratingCount ?? 0);
    check(countAfter === countBefore + 1, `ratingCount ${countBefore} → ${countAfter}`);
    const review = await getDocument(`products/${product.id}/reviews/${user.uid}`);
    check(review !== null, 'review doc missing');
    check(review.data.rating === 5, `review rating ${review.data.rating}`);
    check(review.data.verifiedBuyer === true, 'review should be flagged verifiedBuyer');
    return `${product.id}: ratingCount ${countBefore} → ${countAfter}, avg ${before.data.ratingAvg} → ${after.data.ratingAvg}`;
  });

  const newsletterEmail = `  Smoke.News.${Date.now()}@HWA.test `;
  await step('subscribeNewsletter → subscribed', async () => {
    const response = await callFunction('subscribeNewsletter', { email: newsletterEmail });
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    check(response.result.status === 'subscribed', `status ${response.result.status}`);
    return 'status subscribed (signed out, padded mixed-case email)';
  });

  await step('subscribeNewsletter again → already-subscribed', async () => {
    const response = await callFunction('subscribeNewsletter', {
      email: newsletterEmail.trim().toLowerCase(),
    });
    check(response.ok, `callable failed: ${response.code} ${response.message}`);
    check(response.result.status === 'already-subscribed', `status ${response.result.status}`);
    return 'status already-subscribed (normalised email deduped)';
  });

  await step('subscribeNewsletter rate limit → 6th attempt per IP rejected', async () => {
    // The emulator exposes no client IP (the limiter logs a warning and skips), so pose as one
    // client with X-Forwarded-For — the header Google's front end sets in production.
    const headers = { 'X-Forwarded-For': `203.0.113.${1 + (randomBytes(1)[0] % 254)}` };
    const statuses = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await callFunction(
        'subscribeNewsletter',
        { email: `smoke.rate.${attempt}.${Date.now()}@hwa.test` },
        undefined,
        headers,
      );
      check(response.ok, `attempt ${attempt} failed: ${response.code} ${response.message}`);
      statuses.push(response.result.status);
    }
    const sixth = await callFunction(
      'subscribeNewsletter',
      { email: `smoke.rate.6.${Date.now()}@hwa.test` },
      undefined,
      headers,
    );
    return `5× ${statuses[0]}, then ${expectRejection(sixth, 'RESOURCE_EXHAUSTED')}`;
  });

  const purchasedIds = new Set(ctx.purchased.map((product) => product.id));
  const candidates = ctx.products
    .filter((product) => !purchasedIds.has(product.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const manualCar =
    candidates.find((product) => product.data.rarity === 'rare') ??
    candidates.find((product) => product.data.rarity !== 'common') ??
    candidates[0];

  await step('rules: client cannot forge a purchase garage entry', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const car = requires(manualCar, 'an unowned car');
    const response = await createGarageEntryAsUser(user.uid, car.id, user.idToken, 'purchase');
    check(
      response.status === 403,
      `expected HTTP 403, got ${response.status}: ${snippet(response.text)}`,
    );
    return `HTTP 403 ${response.json?.error?.status ?? ''}`.trim();
  });

  await step('rules: manual garage entry written as the user', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const car = requires(manualCar, 'an unowned car');
    const response = await createGarageEntryAsUser(user.uid, car.id, user.idToken, 'manual');
    check(response.ok, `commit rejected (HTTP ${response.status}): ${snippet(response.text)}`);
    return `${car.id} (${car.data.rarity}) parked with source manual`;
  });

  await step('onGarageWrite trigger → stats / badges synced', async () => {
    const user = requires(ctx.user, 'a signed-up user');
    const car = requires(manualCar, 'an unowned car');
    requires(ctx.xpAfterOrder, 'the post-order profile');
    const isRare = ['rare', 'super-rare', 'limited'].includes(car.data.rarity);
    const { value: profile, satisfied } = await waitFor(
      () => getDocument(`users/${user.uid}`),
      (doc) =>
        doc?.data.stats?.uniqueCars === 3 &&
        doc?.data.stats?.carsOwned === 3 &&
        (!isRare || (doc?.data.badges ?? []).includes('treasure-hunter')),
      TRIGGER_TIMEOUT_MS,
    );
    const stats = profile?.data.stats;
    check(
      satisfied,
      `profile not synced within ${TRIGGER_TIMEOUT_MS / 1000}s: stats ${JSON.stringify(stats)}, badges ${JSON.stringify(profile?.data.badges)}`,
    );
    check(stats.ordersPlaced === 1, `ordersPlaced should be kept, got ${stats.ordersPlaced}`);
    check(
      stats.totalSpent === ctx.expected.total,
      `totalSpent should be kept, got ${stats.totalSpent}`,
    );
    if (isRare) {
      check(stats.rareCars >= 1, `rareCars ${stats.rareCars}`);
      check(
        profile.data.xp > ctx.xpAfterOrder,
        `xp should grow with the badge reward: ${ctx.xpAfterOrder} → ${profile.data.xp}`,
      );
    }
    return `uniqueCars 3, carsOwned 3, rareCars ${stats.rareCars}, xp ${ctx.xpAfterOrder} → ${profile.data.xp}, badges [${profile.data.badges.join(', ')}]`;
  });

  return printTable();
}

main()
  .then((failures) => process.exit(failures === 0 ? 0 : 1))
  .catch((error) => {
    console.error('\nSMOKE CRASHED:', error);
    process.exit(1);
  });
