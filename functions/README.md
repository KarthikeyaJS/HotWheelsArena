# HotWheelsArena — Cloud Functions

TypeScript Cloud Functions for the HotWheelsArena storefront. **Node.js 22 runtime, region
`asia-south1` (Mumbai)**, firebase-functions v7 (2nd-gen APIs for callables and the Firestore
trigger, `firebase-functions/v1` for the Auth `onCreate` trigger) and firebase-admin v13.

> **Runtime: Node.js 22** (the original spec said Node 20, which is end-of-life).
> `package.json` sets `engines.node` to `"22"`, so `firebase deploy` uses the `nodejs22` runtime.

> Cloud Functions need the **Blaze (pay-as-you-go) plan** to deploy. The Emulator Suite works on
> any plan, and with the `demo-hotwheelsarena` project id you don't need a real Firebase project.

Everything that touches money, XP, badges, stats, reviews or the newsletter is written **only**
here, through the Admin SDK. `firestore.rules` blocks clients from writing any of it.

---

## Functions

| Export                | Kind                                                          | What it does                                                                                                                   |
| --------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ensureUserProfile`   | callable                                                      | Creates `users/{uid}` if it's missing, or fills in missing fields (idempotent)                                                 |
| `placeOrder`          | callable                                                      | Checks the cart against server prices, verifies the payment, writes the order, garage, XP, badges and stats in one transaction |
| `submitReview`        | callable                                                      | One review per collector per product, with exact rating aggregates                                                             |
| `subscribeNewsletter` | callable (no sign-in needed)                                  | Deduplicated, rate-limited newsletter sign-up                                                                                  |
| `onUserCreate`        | Auth trigger (1st gen, `auth.user().onCreate`)                | Sets up the profile as soon as an account is created                                                                           |
| `onGarageWrite`       | Firestore trigger (2nd gen, `users/{uid}/garage/{productId}`) | Recalculates stats, unlocks badges, awards badge XP once, updates the level                                                    |

Callable names come from `CALLABLES` in `shared/constants.ts`, and the region from
`FUNCTIONS_REGION`. The web app calls them through the typed wrappers in
`src/services/functions.ts`. Request and response types come from `shared/types.ts`. Every input
is checked with the shared zod schemas in `shared/schemas.ts`.

All global options are in `src/config.ts`: region `asia-south1` and `maxInstances: 10`.
`placeOrder` has a 30 s timeout, which matches the client.

### `ensureUserProfile`

- **Request:** none (any payload is ignored). **Response:** `{ created: boolean }`.
- If the profile doesn't exist, it creates `users/{uid}` =
  `{ uid, displayName, email, photoURL, xp: 0, level: 1, badges: [], stats: {7 zeroed counters}, role: 'customer', createdAt, updatedAt }`.
  Name, email and photo come from the verified ID token.
- If the profile exists, it only fills in missing or malformed fields. It never overwrites valid
  XP, badges, stats or a name the user customised.
- It runs in a transaction, so it can race safely with `onUserCreate`.
- **Errors:** `unauthenticated`.

### `placeOrder`

- **Request:** `PlaceOrderRequest` = `{ items: [{ productId, qty }] (1–20 unique lines, qty 1–10), address: Address, payment: PaymentResult }`.
- **Response:** `PlaceOrderResponse` = `{ orderId, xpEarned, badgesUnlocked, level, leveledUp, total }`.
- **Idempotency:** each verified payment gets a marker at
  `processedPayments/{provider}_{transactionId}`. A retry with the same payment returns the
  original result and never creates a second order. Another collector reusing that payment gets
  `failed-precondition`.

Everything below happens in **one Firestore transaction**:

1. It reads `settings/site` (falling back to `DEFAULT_SITE_SETTINGS`), every ordered product, the
   profile, the **full garage** (`transaction.get` on the collection), the **active series** and
   every garage product.
2. It validates each line: the product exists, `isActive`, has a valid price and `stock >= qty`.
   Stock is **never decremented**, because live inventory is out of scope. It also enforces the
   per-collector cap `min(settings.maxQtyPerItem, MAX_QTY_PER_ITEM)`. Every line is priced with the
   **server** price, and totals come from the shared `computeOrderTotals`, the same function the cart
   uses.
3. It verifies the payment through the verifier registry (see [Payments](#payments)). The charged
   amount must equal the server total to the paisa.
4. It writes:
   - `orders/{orderId}` = `{ uid, items[{productId, slug, name, price, qty, image}], productIds, itemCount, subtotal, shipping, tax, total, currency: 'INR', address (line2/landmark always strings), status: 'placed', payment: { provider, status: 'success', transactionId, mode, method }, paymentMethod, xpEarned, badgesUnlocked, customer: { displayName, email }, createdAt, updatedAt }`.
     `payment.status` uses the shared `PaymentStatus`. A placed order is always `'success'`, cash
     on delivery included; `paymentMethod: 'cod'` marks cash to collect on delivery.
   - `users/{uid}/garage/{productId}`: new cars get
     `{ productId, addedAt, source: 'purchase', isFavorite: false, quantity }`. Cars already in the
     garage get `quantity += qty` (capped at 99) and `source: 'purchase'`, and keep `isFavorite`
     and `addedAt`.
   - `users/{uid}`: `{ xp, level, badges, stats, updatedAt }`. Stats are recalculated from the full
     garage with the shared `computeGarageStats`, plus `ordersPlaced + 1` and `totalSpent + total`.
     XP = `computeOrderXp(lines)` + the `xpReward` of each newly unlocked badge
     (`newlyUnlockedBadges` / `badgeXpTotal`), and the level comes from `levelForXp`. If the
     profile is missing, a full default profile is created first.
   - `processedPayments/{provider}_{transactionId}`, the idempotency marker.

**Errors:**

| Code                       | When (the message is shown to the collector as-is)                                                                                                                                                                                                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unauthenticated`          | Signed out                                                                                                                                                                                                                                                                                                                                     |
| `invalid-argument`         | Payload fails `PlaceOrderRequestSchema` (the schema's own message, e.g. "Enter a valid 6-digit PIN code"), or the transaction id is unsafe                                                                                                                                                                                                     |
| `failed-precondition`      | Car missing, retired, unpriced, sold out or short on stock (the message names the car); COD disabled in `settings/site`; payment declined, forged, unverifiable or from an unsupported provider; test payments switched off; **"Prices changed — review your pit stop."** when the amount ≠ server total; payment already used by someone else |
| `out-of-range`             | Quantity above the per-collector cap, e.g. "You can take up to 4 of Bone Shaker per order — adjust your pit stop."                                                                                                                                                                                                                             |
| `aborted`                  | Firestore transaction contention (safe to retry)                                                                                                                                                                                                                                                                                               |
| `unavailable` / `internal` | Backend outage / unexpected error. Details are logged, and the client only gets a generic message                                                                                                                                                                                                                                              |

### `submitReview`

- **Request:** `{ productId, rating (int 1–5), text (10–1000 chars after trimming) }`. **Response:** `{ reviewId }` (the caller's uid).
- The text is sanitised (control, zero-width and bidi characters removed, newlines normalised) and
  then checked again against the shared rules.
- `verifiedBuyer` is `true` if the caller has a non-cancelled order containing the product. It
  checks `productIds`, and falls back to `items` for older orders.
- Transaction:
  - The product must exist (`not-found`) and be active (`failed-precondition`).
  - It writes `products/{productId}/reviews/{uid}` =
    `{ productId, uid, displayName, photoURL, rating, text, verifiedBuyer, createdAt, updatedAt }`.
  - Editing replaces every field except `createdAt`.
  - It updates the product's `ratingAvg` / `ratingCount`. A new review adds to them; an edit swaps
    the old rating for the new one. The running sum is recovered from `avg × count` (averages are
    stored with 4 decimals), so the numbers stay exact.
- Name and photo come from the profile, then the ID token, then "Collector". The email is never
  used.
- **Errors:** `unauthenticated`, `invalid-argument`, `not-found`, `failed-precondition`, `aborted`, `internal`.

### `subscribeNewsletter`

- **Request:** `{ email }`. **Response:** `{ status: 'subscribed' | 'already-subscribed' }`.
- The email is normalised (NFKC, trimmed, lowercased) and validated with `NewsletterSchema`.
- The document id is `sha256(email)` at `newsletter/{id}` = `{ email, createdAt, updatedAt }`, so
  one address can only ever be stored once.
- **Rate limit:** 5 attempts per client IP per 10 minutes, in a fixed window, tracked in the
  functions-only `rateLimits/{sha256(salt|scope|ip)}` = `{ scope, count, windowStartMs, expiresAt, updatedAt }`.
  Raw IPs are never stored. Over the limit it returns `resource-exhausted` ("…take a lap and try
  again in about N minutes."). If the IP can't be determined, the limit is skipped and a warning is
  logged.
- **Errors:** `invalid-argument`, `resource-exhausted`, `aborted`, `internal`.

### `onUserCreate`

Uses the same idempotent bootstrap as `ensureUserProfile`, with the Auth `UserRecord`'s
`displayName`, `email` and `photoURL`. Failures are logged and rethrown. The callable repairs the
profile on the next sign-in.

### `onGarageWrite`

- Runs on every write to `users/{uid}/garage/{productId}`.
- Skips favourite toggles, and any other change that doesn't touch creation, deletion or quantity.
- Otherwise it runs a transaction: it reads the profile, the full garage, the active series and
  every garage product, then recalculates stats. `ordersPlaced` and `totalSpent` are kept.
- It awards `xpReward` **only for badges not already on the profile**, and recalculates the level.
- It **never removes badges or XP** when cars are removed.
- If nothing changed, it writes nothing. That makes re-delivered events, and the garage writes made
  by `placeOrder`, harmless.
- If the profile doesn't exist yet, it merges `{ uid, role, xp, level, badges, stats, createdAt, updatedAt }`
  and lets `ensureUserProfile` fill in the name, email and photo later.

---

## Payments

`src/payments/` has a verifier registry keyed by `PaymentProviderId`:

- `dummy.ts` verifies the web app's `DummyPaymentProvider` (TEST MODE). It requires:
  - test payments to be allowed;
  - `status === 'success'` (a declined payment is rejected);
  - `mode === 'test'`;
  - a transaction id matching `DUMMY_TRANSACTION_ID_REGEX` (`test_` + 20 lowercase hex);
  - `amount === server total`.

  It returns a `VerifiedPayment` with status `'success'` for card, UPI and COD.

- `registry.ts` has `PAYMENT_VERIFIERS = { dummy }`. `verifyPayment()` rejects providers without a
  verifier. Whatever the verifier returns, it checks the confirmed amount against the server total
  again.
- **`ALLOW_TEST_PAYMENTS`** (default `true`) is read from the environment. Set
  `ALLOW_TEST_PAYMENTS=false` in `functions/.env.<projectId>` to refuse test-mode payments in
  production. It's a plain dotenv variable rather than a `defineBoolean` param, so deploys and the
  emulator never stop to prompt for it.

**Adding Razorpay later:**

1. Create `src/payments/razorpay.ts`, a `PaymentVerifier` with `provider: 'razorpay'`. It should
   verify the gateway signature or fetch the payment, and return a `VerifiedPayment`.
2. Register it: `razorpay: razorpayPaymentVerifier`.
3. Set `ALLOW_TEST_PAYMENTS=false`.

On the client, add a `RazorpayProvider` and change `VITE_PAYMENT_PROVIDER`. `placeOrder` itself
doesn't change.

---

## Code layout

```
functions/
├─ src/
│  ├─ index.ts            exports exactly the 6 functions (Firebase deploys every export)
│  ├─ config.ts           REGION, MAX_INSTANCES, setGlobalOptions
│  ├─ admin.ts            initializeApp() once, db, FieldValue, Timestamp, serverTimestamp()
│  ├─ refs.ts             document refs + readCollectorState() (profile, garage, series, products in a transaction)
│  ├─ callables/          ensureUserProfile, placeOrder, submitReview, subscribeNewsletter (thin Firestore shells)
│  ├─ triggers/           onUserCreate (v1), onGarageWrite (v2)
│  ├─ profile/            ensureProfileDocument(): the shared idempotent bootstrap
│  ├─ payments/           verifier types, dummy verifier, registry, amount checks
│  ├─ lib/                PURE logic, unit-tested: pricing, stats, progression, order/review/garage
│  │                      planners, profile docs, email hashing, rate limiting, callable plumbing
│  └─ testing/            test fixtures (excluded from the build)
├─ tsconfig.json          typecheck incl. tests (rootDir "..", includes ../shared)
├─ tsconfig.build.json    deployable build (no tests or fixtures) → lib/
└─ vitest.config.mts
```

The **planners** in `lib/` (`buildOrderPlan`, `planGarageSync`, `buildReviewPlan`) take what a
transaction read and return every document it will write, with no I/O. The callables and triggers
just read, call a planner and write, so all business logic is covered by unit tests.

`shared/` is compiled together with the functions (`rootDir: ".."`), so the output is
`lib/functions/src/index.js` (`main` in package.json) and `lib/shared/*.js`, all inside
`functions/`. `shared/` imports `zod`, which resolves from **`functions/node_modules`** (tsconfig
`paths` and the Vitest alias), so the functions build never depends on the web app's root
`node_modules`.

---

## Local development

```bash
cd functions
npm install --include=dev   # this machine exports NODE_ENV=production; a plain install skips devDependencies
npm run build               # tsc -p tsconfig.build.json → lib/
npm test                    # vitest run (unit tests for all pure logic + the export manifest)
npm run typecheck           # tsc incl. tests
```

**Emulators.** From the repo root, `npm run emulators` starts auth, firestore, functions, hosting
and UI (ports 9099 / 8080 / 5001 / 5000 / 4000). From `functions/`, `npm run serve` builds first
and starts auth, firestore and functions only. Both use the `demo-hotwheelsarena` project. The web
app connects when `VITE_USE_EMULATORS=true`. Seed data with `npm run seed:emulator` at the root.
Rebuild (`npm run build:watch`) and the emulator reloads the functions.

**Automated smoke test**: from the repo root, `npm run smoke` builds `lib/`, boots the Auth,
Firestore and Functions emulators, seeds them and runs `scripts/smoke-e2e.mjs`, which calls every
callable over HTTP and checks the trigger (see `scripts/README.md`).

**Manual smoke test** (with the emulators running and data seeded):

1. Sign in with the emulated Google provider. `ensureUserProfile` and `onUserCreate` create
   `users/{uid}` (check the Emulator UI → Firestore).
2. Add cars to the cart and check out with the TEST MODE provider. You should see an
   `orders/{id}`, garage entries with `source: 'purchase'`, `xp` / `badges` / `stats` on the
   profile, and a `processedPayments/dummy_test_…` marker.
3. Manually park a rare car from a product page. `onGarageWrite` unlocks **TREASURE HUNTER** once.
   Removing the car keeps the badge.
4. Submit and then edit a review. `ratingAvg` / `ratingCount` on the product stay consistent.
5. Subscribe to the newsletter twice with the same address: the second call returns
   `already-subscribed`. The rate limit (6th attempt from one IP within 10 minutes →
   `resource-exhausted`) keys on the client IP, which the Functions emulator does not expose — it
   logs "client IP unavailable, rate limit skipped" and lets the call through. To exercise the
   limit locally, send an `X-Forwarded-For` header (as `npm run smoke` does); in production
   Google's front end sets it.

`npm run shell` opens `firebase functions:shell` against the emulators, where you can call
callables directly.

## Deploy

```bash
firebase use <your-project-id>        # replace demo-hotwheelsarena in .firebaserc first
firebase deploy --only functions      # predeploy runs `npm --prefix functions run build`
npm --prefix functions run logs       # or: firebase functions:log
```

Recommended in production:

- Enable a Firestore **TTL policy** on `rateLimits.expiresAt`, so old rate-limit windows are
  cleaned up automatically.
- Set `ALLOW_TEST_PAYMENTS=false` once a real gateway is live.

`processedPayments` and `rateLimits` are functions-only collections. The rules deny all client
access.

**Runtime note:** Node.js 22 (`engines.node: "22"`, `@types/node` 22.x, TypeScript target
ES2023). The original spec asked for Node 20, but Node.js 20 reached end-of-life in April 2026 and
Google Cloud is deprecating and then decommissioning the `nodejs20` runtime, so a new project may
not be able to deploy it. The runtime table in firebase-tools 15.31 lists `nodejs20` as deprecated
2026-04-30 and decommissioned 2026-10-30, and `nodejs22` as deprecated 2027-04-30 and
decommissioned 2028-10-31. firebase-functions 7 and firebase-admin 13 support Node 22.
